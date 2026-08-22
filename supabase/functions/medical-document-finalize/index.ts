import { BUCKET, MAX_FILE_BYTES, HttpError, authenticate, corsHeaders, json, safeFailure, uuid } from '../_shared/medicalDocuments.ts';

type FailureCode = 'object_missing' | 'invalid_extension' | 'invalid_mime' | 'invalid_signature' | 'invalid_size' | 'finalize_failed';

// Magic-byte verification confirms basic file-format consistency only.
// It is not antivirus scanning, malware sandboxing, PDF sanitization, or active-content stripping.
const detectedMime = (bytes: Uint8Array): string | null => {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((value, index) => bytes[index] === value)) return 'image/png';
  return null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let documentId: string | null = null;
  let userId: string | null = null;
  let storagePath: string | null = null;
  try {
    const auth = await authenticate(request); userId = auth.userId;
    const body = await request.json() as { documentId?: unknown };
    if (!uuid(body.documentId)) throw new HttpError(400, 'Belge kimliği geçersiz.');
    documentId = body.documentId;
    const prepared = await auth.admin.rpc('prepare_medical_document_finalize', {
      p_document_id: documentId, p_actor_user_id: userId,
    });
    const context = prepared.data?.[0] as { storage_path?: string; original_file_name?: string; expired?: boolean } | undefined;
    if (prepared.error || !context?.storage_path || !context.original_file_name) {
      throw new HttpError(403, 'Belge tamamlanamadı veya yetkiniz yok.');
    }
    storagePath = context.storage_path;
    if (context.expired) {
      await auth.admin.storage.from(BUCKET).remove([storagePath]);
      throw new HttpError(410, 'Yükleme süresi doldu. Lütfen dosyayı yeniden seçip yeni bir yükleme başlatın.');
    }

    const download = await auth.admin.storage.from(BUCKET).download(storagePath);
    if (download.error || !download.data) {
      await auth.admin.rpc('fail_medical_document_intent', {
        p_document_id: documentId, p_actor_user_id: userId, p_failure_code: 'object_missing',
      });
      throw new HttpError(400, 'Yüklenen dosya bulunamadı. Lütfen yeni bir yükleme başlatın.');
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    let failure: FailureCode | null = null;
    if (bytes.length < 1 || bytes.length > MAX_FILE_BYTES) failure = 'invalid_size';
    const extension = storagePath.toLowerCase().match(/\.(pdf|jpg|png)$/)?.[1];
    if (!extension) failure = 'invalid_extension';
    const mime = detectedMime(bytes);
    if (!mime) failure = 'invalid_signature';
    const expected = extension === 'pdf' ? 'application/pdf' : extension === 'jpg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : null;
    if (mime && expected && mime !== expected) failure = 'invalid_signature';
    if (mime && !['application/pdf', 'image/jpeg', 'image/png'].includes(mime)) failure = 'invalid_mime';
    if (failure || !mime) {
      await auth.admin.rpc('fail_medical_document_intent', {
        p_document_id: documentId, p_actor_user_id: userId, p_failure_code: failure ?? 'finalize_failed',
      });
      await auth.admin.storage.from(BUCKET).remove([storagePath]);
      throw new HttpError(400, 'Dosya doğrulanamadı. Lütfen geçerli bir PDF, JPEG veya PNG ile yeni yükleme başlatın.');
    }
    const completed = await auth.admin.rpc('complete_medical_document_finalize', {
      p_document_id: documentId, p_actor_user_id: userId,
      p_mime_type: mime, p_size_bytes: bytes.length,
    });
    if (completed.error) {
      await auth.admin.rpc('fail_medical_document_intent', {
        p_document_id: documentId, p_actor_user_id: userId, p_failure_code: 'finalize_failed',
      });
      await auth.admin.storage.from(BUCKET).remove([storagePath]);
      throw new HttpError(409, 'Belge tamamlanamadı. Yeni bir yükleme başlatın.');
    }
    return json({ documentId, status: 'ready' });
  } catch (error) {
    const safe = safeFailure(error);
    return json({ error: safe.message }, safe.status);
  }
});
