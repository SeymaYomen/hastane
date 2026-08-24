import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  AIProviderPrivacyError,
  assertNoForbiddenAIProviderKeys,
  buildClinicalAssistantDraftProviderContext,
  buildClinicalAssistantSummaryProviderContext,
  type ClinicalAssistantRecord,
} from '../_shared/aiPrivacy.ts';
import {
  hasMeaningfulCurrentNote,
  hasOnlyAllowedEvidenceRefs,
  isClinicalAssistantActionAllowed,
  normalizeCurrentNote,
  validateClinicalNoteDraftBoundary,
  type ClinicalAssistantAction,
  type ClinicalAssistantStatus,
  type CurrentNote,
} from '../_shared/clinicalAssistant.ts';

type ProviderName = 'openai' | 'gemini';
type AssistantContext = {
  appointment_status: ClinicalAssistantStatus;
  current_visit: ClinicalAssistantRecord | null;
  historical_records: ClinicalAssistantRecord[];
};
type SummaryOutput = {
  summary: string;
  keyPoints: { text: string; evidenceRefs: string[] }[];
  limitations: string[];
};
type DraftOutput = {
  noteFormat: 'free_text' | 'soap';
  freeTextDraft: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  evidenceRefs: string[];
  limitations: string[];
};
type ProviderResult = { value: unknown; inputTokens: number; outputTokens: number };
type ValidationReason = 'invalid_shape' | 'invalid_summary' | 'invalid_key_points' | 'invalid_evidence_ref' | 'invalid_limitations' | 'output_too_large' | 'uuid_leak' | 'disallowed_claim';

const RATE_LIMIT_PER_MINUTE = 5;
const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_CONTEXT_CHARS = 30_000;
const MAX_OUTPUT_CHARS = 12_000;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const systemInstruction = `You are a documentation and record-review assistant for physicians.
Use only the supplied verified/source content. Do not diagnose or infer missing clinical facts.
Do not create a diagnosis, differential diagnosis, likely disease, medication, dose, treatment recommendation, test or imaging request, risk score, emergency disposition, or patient treatment instruction.
For a clinical-note draft, only rewrite, shorten, organize, or structure the supplied CURRENT_NOTE. Never fill an empty field to make the note look complete. Do not create a new assessment when the source assessment is empty.
Keep the requested note format unchanged. All user-facing prose must be Turkish. Return only the requested structured JSON. Keep evidence references unchanged.`;

const summarySchema = {
  type: 'object', additionalProperties: false, required: ['summary', 'keyPoints', 'limitations'],
  properties: {
    summary: { type: 'string', minLength: 1, maxLength: 1200 },
    keyPoints: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text', 'evidenceRefs'], properties: { text: { type: 'string', minLength: 1, maxLength: 500 }, evidenceRefs: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } } } } },
    limitations: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 300 } },
  },
};

const draftSchema = {
  type: 'object', additionalProperties: false,
  required: ['noteFormat', 'freeTextDraft', 'subjective', 'objective', 'assessment', 'plan', 'evidenceRefs', 'limitations'],
  properties: {
    noteFormat: { type: 'string', enum: ['free_text', 'soap'] },
    freeTextDraft: { type: ['string', 'null'], maxLength: 10000 },
    subjective: { type: ['string', 'null'], maxLength: 5000 },
    objective: { type: ['string', 'null'], maxLength: 5000 },
    assessment: { type: ['string', 'null'], maxLength: 5000 },
    plan: { type: ['string', 'null'], maxLength: 5000 },
    evidenceRefs: { type: 'array', minItems: 1, maxItems: 1, items: { type: 'string', enum: ['CURRENT_NOTE'] } },
    limitations: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 300 } },
  },
};

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if ((error instanceof DOMException && error.name === 'AbortError') || (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) {
      throw new HttpError(504, 'AI servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.');
    }
    throw error;
  } finally { clearTimeout(timeout); }
};

const getSupabasePublishableKey = (): string | undefined => {
  const encodedKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, unknown>;
      const preferred = keys.default ?? keys.publishable ?? keys.anon;
      if (typeof preferred === 'string' && preferred.trim()) return preferred;
      const first = Object.values(keys).find((value) => typeof value === 'string' && value.trim());
      if (typeof first === 'string') return first;
    } catch { /* Fall through without exposing environment values. */ }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') || undefined;
};

const responseText = (payload: Record<string, unknown>) => {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') return (part as { text: string }).text;
  }
  throw new HttpError(502, 'AI servisi geçerli bir yanıt döndürmedi.');
};

async function generateWithOpenAI(prompt: string, model: string, schema: typeof summarySchema | typeof draftSchema): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions: systemInstruction, input: prompt, max_output_tokens: 4096, text: { format: { type: 'json_schema', name: 'clinical_assistant_output', strict: true, schema } } }),
  });
  if (!response.ok) throw new HttpError(502, 'AI sağlayıcısı isteği tamamlayamadı.');
  const payload = await response.json() as Record<string, unknown>;
  const usage = (payload.usage ?? {}) as Record<string, unknown>;
  let value: unknown = null;
  try { value = JSON.parse(responseText(payload)); } catch { /* Validator reports invalid_shape. */ }
  return { value, inputTokens: Number(usage.input_tokens ?? 0), outputTokens: Number(usage.output_tokens ?? 0) };
}

async function generateWithGemini(prompt: string, model: string, schema: typeof summarySchema | typeof draftSchema): Promise<ProviderResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'low' } } }),
  });
  if (!response.ok) throw new HttpError(502, 'AI sağlayıcısı isteği tamamlayamadı.');
  const payload = await response.json() as Record<string, unknown>;
  const candidates = payload.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new HttpError(502, 'AI servisi geçerli bir yanıt döndürmedi.');
  const usage = (payload.usageMetadata ?? {}) as Record<string, unknown>;
  let value: unknown = null;
  try { value = JSON.parse(text); } catch { /* Validator reports invalid_shape. */ }
  return { value, inputTokens: Number(usage.promptTokenCount ?? 0), outputTokens: Number(usage.candidatesTokenCount ?? 0) };
}

const serializeForValidation = (value: unknown): string | null => {
  try { return JSON.stringify(value); } catch { return null; }
};
const hasUnsafeOutput = (serialized: string) => /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized)
  || /\b(?:recommend(?:s|ed|ing)?|prescribe(?:s|d)?|should\s+(?:start|take|use)|(?:ilaç|tedavi)\s+(?:başlanmalı|başlayın|kullanın|önerilir|öneriyorum))\b/i.test(serialized);
const validLimitations = (value: unknown) => Array.isArray(value) && value.length <= 6 && value.every((item) => typeof item === 'string' && item.length <= 300);

const validateSummary = (value: unknown, refs: Set<string>): { ok: true; value: SummaryOutput } | { ok: false; reason: ValidationReason } => {
  const serialized = serializeForValidation(value);
  if (serialized === null || !value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'invalid_shape' };
  if (serialized.length > MAX_OUTPUT_CHARS) return { ok: false, reason: 'output_too_large' };
  if (hasUnsafeOutput(serialized)) return { ok: false, reason: serialized.match(/[0-9a-f]{8}-/) ? 'uuid_leak' : 'disallowed_claim' };
  try { assertNoForbiddenAIProviderKeys(value); } catch (error) { if (error instanceof AIProviderPrivacyError) return { ok: false, reason: 'invalid_shape' }; throw error; }
  const item = value as Partial<SummaryOutput>;
  if (typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 1200) return { ok: false, reason: 'invalid_summary' };
  if (!Array.isArray(item.keyPoints) || item.keyPoints.length > 8) return { ok: false, reason: 'invalid_key_points' };
  for (const point of item.keyPoints) {
    if (!point || typeof point.text !== 'string' || !point.text.trim() || point.text.length > 500 || !Array.isArray(point.evidenceRefs) || point.evidenceRefs.length < 1 || point.evidenceRefs.length > 5) return { ok: false, reason: 'invalid_key_points' };
    if (!hasOnlyAllowedEvidenceRefs(point.evidenceRefs, refs)) return { ok: false, reason: 'invalid_evidence_ref' };
  }
  if (!validLimitations(item.limitations)) return { ok: false, reason: 'invalid_limitations' };
  return { ok: true, value: item as SummaryOutput };
};

const validateDraft = (value: unknown, source: CurrentNote): { ok: true; value: DraftOutput } | { ok: false; reason: ValidationReason } => {
  const serialized = serializeForValidation(value);
  if (serialized === null || !value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'invalid_shape' };
  if (serialized.length > MAX_OUTPUT_CHARS) return { ok: false, reason: 'output_too_large' };
  if (hasUnsafeOutput(serialized)) return { ok: false, reason: serialized.match(/[0-9a-f]{8}-/) ? 'uuid_leak' : 'disallowed_claim' };
  try { assertNoForbiddenAIProviderKeys(value); } catch (error) { if (error instanceof AIProviderPrivacyError) return { ok: false, reason: 'invalid_shape' }; throw error; }
  const item = value as Partial<DraftOutput>;
  const boundaryFailure = validateClinicalNoteDraftBoundary(source, item);
  if (boundaryFailure) return { ok: false, reason: boundaryFailure };
  if (!validLimitations(item.limitations)) return { ok: false, reason: 'invalid_limitations' };
  const fields = ['freeTextDraft', 'subjective', 'objective', 'assessment', 'plan'] as const;
  const limits = { freeTextDraft: 10000, subjective: 5000, objective: 5000, assessment: 5000, plan: 5000 };
  if (fields.some((field) => item[field] !== null && (typeof item[field] !== 'string' || (item[field] as string).length > limits[field]))) return { ok: false, reason: 'invalid_shape' };
  if (source.noteFormat === 'free_text' && (typeof item.freeTextDraft !== 'string' || fields.slice(1).some((field) => item[field] !== null))) return { ok: false, reason: 'invalid_shape' };
  if (source.noteFormat === 'soap' && (item.freeTextDraft !== null || fields.slice(1).some((field) => item[field] === null))) return { ok: false, reason: 'invalid_shape' };
  return { ok: true, value: item as DraftOutput };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const startedAt = Date.now();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Oturum bulunamadı.');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = getSupabasePublishableKey();
    if (!supabaseUrl || !publishableKey) throw new HttpError(503, 'Servis yapılandırması eksik.');
    const client = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) throw new HttpError(401, 'Oturum doğrulanamadı.');
    const { data: role, error: roleError } = await client.from('user_roles').select('role').eq('user_id', authData.user.id).single();
    if (roleError || role?.role !== 'doctor') throw new HttpError(403, 'Doktor yetkisi bulunamadı.');

    const body = await request.json() as Record<string, unknown>;
    const allowedRequestKeys = new Set(['appointmentId', 'action', 'currentNote']);
    if (Object.keys(body).some((key) => !allowedRequestKeys.has(key))) throw new HttpError(400, 'Geçersiz istek.');
    if (typeof body.appointmentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.appointmentId)) throw new HttpError(400, 'Geçersiz randevu kimliği.');
    if (body.action !== 'summary' && body.action !== 'clinical_note_draft') throw new HttpError(400, 'Geçersiz Klinik Asistan işlemi.');
    const action = body.action as ClinicalAssistantAction;
    if (action === 'summary' && 'currentNote' in body) throw new HttpError(400, 'Özet isteği gereksiz klinik not girdisi içeremez.');
    if (action === 'clinical_note_draft' && !('currentNote' in body)) throw new HttpError(400, 'Klinik not girdisi eksik.');

    const { data: rows, error: contextError } = await client.rpc('get_doctor_clinical_assistant_context', { p_appointment_id: body.appointmentId });
    if (contextError) throw new HttpError(403, 'Randevu bağlamına erişilemedi.');
    const context = (rows?.[0] ?? null) as AssistantContext | null;
    if (!context) throw new HttpError(403, 'Randevu bulunamadı veya erişim yetkiniz yok.');
    if (!isClinicalAssistantActionAllowed(context.appointment_status, action)) throw new HttpError(403, 'Bu randevu durumunda bu Klinik Asistan işlemi kullanılamaz.');

    const feature = action === 'summary' ? 'clinical_assistant_summary' : 'clinical_note_draft';
    if (action === 'summary') {
      const records = [context.current_visit, ...(Array.isArray(context.historical_records) ? context.historical_records : [])].filter((record): record is ClinicalAssistantRecord => Boolean(record));
      if (records.length === 0) {
        const { data: usageId, error: usageError } = await client.rpc('start_ai_usage', { p_feature: feature, p_provider: 'none', p_model: 'deterministic', p_limit: RATE_LIMIT_PER_MINUTE });
        if (usageError) {
          if (usageError.message.includes('AI_RATE_LIMIT')) throw new HttpError(429, 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
          throw new HttpError(500, 'AI kullanım kaydı başlatılamadı.');
        }
        await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'no_history', p_error_code: null });
        return json({ result: { summary: 'Özetlenecek klinik kayıt bulunmuyor.', keyPoints: [], limitations: ['Mevcut veya geçmiş klinik kayıt bulunamadı.'] } });
      }
      return await runProvider(client, feature, buildClinicalAssistantSummaryProviderContext(records), summarySchema, (value) => validateSummary(value, new Set(records.map((record) => record.ref))), startedAt);
    }

    const currentNote = normalizeCurrentNote(body.currentNote);
    if (!currentNote) throw new HttpError(400, 'Klinik not girdisi geçersiz.');
    if (!hasMeaningfulCurrentNote(currentNote)) throw new HttpError(400, 'Önce klinik not alanına bilgi girin.');
    return await runProvider(client, feature, buildClinicalAssistantDraftProviderContext(currentNote), draftSchema, (value) => validateDraft(value, currentNote), startedAt);
  } catch (error) {
    const safeError = error instanceof HttpError ? error : new HttpError(500, 'Klinik Asistan isteği tamamlanamadı.');
    return json({ error: safeError.message }, safeError.status);
  }
});

async function runProvider<T>(
  client: ReturnType<typeof createClient>,
  feature: string,
  providerContext: unknown,
  schema: typeof summarySchema | typeof draftSchema,
  validate: (value: unknown) => { ok: true; value: T } | { ok: false; reason: ValidationReason },
  startedAt: number,
): Promise<Response> {
  const provider = (Deno.env.get('AI_PROVIDER') ?? 'openai').toLowerCase() as ProviderName;
  if (!['openai', 'gemini'].includes(provider)) throw new HttpError(503, 'AI sağlayıcısı yapılandırması geçersiz.');
  const model = Deno.env.get('AI_MODEL');
  if (!model) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const prompt = `Verified source content follows. Return only the requested JSON.\n${JSON.stringify(providerContext)}`;
  if (prompt.length > MAX_CONTEXT_CHARS) throw new HttpError(413, 'Klinik bağlam güvenli işleme sınırını aşıyor.');
  const { data: usageId, error: usageError } = await client.rpc('start_ai_usage', { p_feature: feature, p_provider: provider, p_model: model, p_limit: RATE_LIMIT_PER_MINUTE });
  if (usageError) {
    if (usageError.message.includes('AI_RATE_LIMIT')) throw new HttpError(429, 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
    throw new HttpError(500, 'AI kullanım kaydı başlatılamadı.');
  }
  let providerResult: ProviderResult;
  try { providerResult = provider === 'openai' ? await generateWithOpenAI(prompt, model, schema) : await generateWithGemini(prompt, model, schema); }
  catch (providerError) {
    const errorCode = providerError instanceof HttpError && providerError.status === 504 ? 'provider_timeout' : 'provider_request_failed';
    await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'provider_error', p_error_code: errorCode });
    throw providerError;
  }
  const validation = validate(providerResult.value);
  if ('reason' in validation) {
    await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: providerResult.inputTokens, p_output_tokens: providerResult.outputTokens, p_latency_ms: Date.now() - startedAt, p_status: 'invalid_output', p_error_code: validation.reason });
    throw new HttpError(502, 'AI servisi geçerli ve güvenli bir yanıt döndürmedi.');
  }
  await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: providerResult.inputTokens, p_output_tokens: providerResult.outputTokens, p_latency_ms: Date.now() - startedAt, p_status: 'success', p_error_code: null });
  return json({ result: validation.value });
}
