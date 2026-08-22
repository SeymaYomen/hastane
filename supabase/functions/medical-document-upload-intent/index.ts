import { BUCKET, HttpError, authenticate, corsHeaders, json, safeFailure, uuid } from '../_shared/medicalDocuments.ts';

type IntentBody = {
  appointmentId?: unknown;
  appointmentIds?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  originalFileName?: unknown;
  claimedMimeType?: unknown;
  claimedSizeBytes?: unknown;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { userId, role, admin } = await authenticate(request);
    const body = await request.json() as IntentBody;
    if (typeof body.category !== 'string' || typeof body.title !== 'string'
      || typeof body.originalFileName !== 'string' || typeof body.claimedMimeType !== 'string'
      || typeof body.claimedSizeBytes !== 'number' || !Number.isSafeInteger(body.claimedSizeBytes)) {
      throw new HttpError(400, 'Belge bilgileri eksik veya geçersiz.');
    }
    const common = {
      p_actor_user_id: userId, p_category: body.category, p_title: body.title,
      p_description: typeof body.description === 'string' ? body.description : null,
      p_original_file_name: body.originalFileName, p_claimed_mime_type: body.claimedMimeType,
      p_claimed_size_bytes: body.claimedSizeBytes,
    };
    let result;
    if (role === 'patient') {
      const appointmentIds = body.appointmentIds ?? [];
      if (!Array.isArray(appointmentIds) || appointmentIds.some((id) => !uuid(id))) {
        throw new HttpError(400, 'Randevu seçimi geçersiz.');
      }
      result = await admin.rpc('create_patient_medical_document_intent', {
        ...common, p_appointment_ids: appointmentIds,
      });
    } else {
      if (!uuid(body.appointmentId)) throw new HttpError(400, 'Randevu kimliği geçersiz.');
      result = await admin.rpc('create_doctor_medical_document_intent', {
        ...common, p_appointment_id: body.appointmentId,
      });
    }
    const intent = result.data?.[0] as { document_id?: string; storage_path?: string; intent_expires_at?: string } | undefined;
    if (result.error || !intent?.document_id || !intent.storage_path || !intent.intent_expires_at) {
      throw new HttpError(400, 'Belge bilgileri doğrulanamadı. Lütfen alanları kontrol edin.');
    }
    const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(intent.storage_path, { upsert: false });
    if (signed.error || !signed.data?.token) {
      await admin.rpc('fail_medical_document_intent', {
        p_document_id: intent.document_id, p_actor_user_id: userId, p_failure_code: 'upload_url_failed',
      });
      throw new HttpError(503, 'Belge yükleme bağlantısı oluşturulamadı.');
    }
    return json({
      documentId: intent.document_id,
      storagePath: intent.storage_path,
      uploadToken: signed.data.token,
      intentExpiresAt: intent.intent_expires_at,
    });
  } catch (error) {
    const safe = safeFailure(error);
    return json({ error: safe.message }, safe.status);
  }
});
