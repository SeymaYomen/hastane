import { BUCKET, HttpError, authenticate, corsHeaders, json, safeFailure, uuid } from '../_shared/medicalDocuments.ts';

const SIGNED_URL_TTL_SECONDS = 120;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { userId, admin } = await authenticate(request);
    const body = await request.json() as { documentId?: unknown };
    if (!uuid(body.documentId)) throw new HttpError(400, 'Belge kimliği geçersiz.');
    const access = await admin.rpc('authorize_medical_document_read', {
      p_document_id: body.documentId, p_actor_user_id: userId,
    });
    const authorized = access.data?.[0] as { storage_path?: string } | undefined;
    if (access.error || !authorized?.storage_path) throw new HttpError(403, 'Belge erişim yetkiniz yok.');
    const quota = await admin.rpc('consume_medical_document_url_quota', { p_actor_user_id: userId });
    if (quota.error) {
      if (quota.error.message.includes('DOCUMENT_URL_RATE_LIMIT')) {
        throw new HttpError(429, 'Çok fazla belge görüntüleme isteği gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
      }
      throw new HttpError(503, 'Belge erişim kotası doğrulanamadı.');
    }
    const signed = await admin.storage.from(BUCKET).createSignedUrl(authorized.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) throw new HttpError(503, 'Belge görüntüleme bağlantısı oluşturulamadı.');
    const logged = await admin.rpc('record_medical_document_url_issuance', {
      p_document_id: body.documentId, p_actor_user_id: userId,
    });
    if (logged.error) throw new HttpError(503, 'Belge erişimi güvenli şekilde kaydedilemedi.');
    return json({ signedUrl: signed.data.signedUrl, expiresAt: new Date(Date.now() + 120_000).toISOString() });
  } catch (error) {
    const safe = safeFailure(error);
    return json({ error: safe.message }, safe.status);
  }
});
