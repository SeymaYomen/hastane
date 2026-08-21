import { createClient } from 'npm:@supabase/supabase-js@2';

type ProviderName = 'openai' | 'gemini';
type PastVisit = {
  ref: string;
  date: string;
  noteFormat: 'free_text' | 'soap';
  clinicalNote: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  followUpNote: string | null;
};
type BriefContext = {
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
  appointment_notes: string | null;
  patient_name: string;
  past_visits: PastVisit[];
};
type Brief = {
  summary: string;
  keyPoints: { text: string; evidenceRefs: string[] }[];
  followUp: { required: boolean; date: string | null; note: string | null };
  limitations: string[];
};
type AIOutput = Omit<Brief, 'followUp'>;
type ValidationReason =
  | 'invalid_shape'
  | 'invalid_summary'
  | 'invalid_key_points'
  | 'invalid_evidence_ref'
  | 'invalid_follow_up'
  | 'invalid_limitations'
  | 'output_too_large'
  | 'uuid_leak'
  | 'disallowed_claim';
type ValidationResult = { ok: true; brief: AIOutput } | { ok: false; reason: ValidationReason };
type ProviderResult = { value: unknown; inputTokens: number; outputTokens: number };

const RATE_LIMIT_PER_MINUTE = 5;
const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_CONTEXT_CHARS = 30_000;
const MAX_OUTPUT_CHARS = 4_000;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const systemInstruction = `You are a clinical information summarization assistant for physicians.
Use only the provided verified records. Do not diagnose, recommend treatment, or infer missing facts.
Do not invent medications, diseases, laboratory values, dates, symptoms, or follow-up instructions.
If information is missing, state that it is unavailable. Every key point must cite supplied record references.
Summary must only restate supplied records and must not introduce a clinical fact absent from keyPoints.
All user-facing output must be written in Turkish, even when the source record is in English.
Write summary, every keyPoints[].text value, and every limitations item in Turkish.
Keep evidenceRefs values such as V1 and V2 unchanged. Use clear, professional, neutral Turkish clinical terminology.
Only include limitations that are genuinely missing or constrained in the supplied context.
Do not present fields that were never supplied, such as medication data, as clinical findings or generic limitations.
The output supports physician preparation and is not a clinical decision.`;
const outputSchema = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'keyPoints', 'limitations'],
  properties: {
    summary: { type: 'string', minLength: 1, maxLength: 1200 },
    keyPoints: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text', 'evidenceRefs'], properties: { text: { type: 'string', minLength: 1, maxLength: 500 }, evidenceRefs: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } } } } },
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
    if (error instanceof DOMException && error.name === 'AbortError' || (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) {
      throw new HttpError(504, 'AI servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getSupabasePublishableKey = (): string | undefined => {
  const encodedKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, unknown>;
      const preferredKey = keys.default ?? keys.publishable ?? keys.anon;
      if (typeof preferredKey === 'string' && preferredKey.trim()) return preferredKey;
      const firstKey = Object.values(keys).find((value) => typeof value === 'string' && value.trim());
      if (typeof firstKey === 'string') return firstKey;
    } catch {
      // Fall through to the legacy key without exposing environment values.
    }
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

async function generateWithOpenAI(prompt: string, model: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions: systemInstruction, input: prompt, max_output_tokens: 2048, text: { format: { type: 'json_schema', name: 'pre_visit_brief', strict: true, schema: outputSchema } } }),
  });
  if (!response.ok) throw new HttpError(502, 'AI sağlayıcısı isteği tamamlayamadı.');
  const payload = await response.json() as Record<string, unknown>;
  const usage = (payload.usage ?? {}) as Record<string, unknown>;
  let value: unknown = null;
  try { value = JSON.parse(responseText(payload)); } catch { /* Validator reports invalid_shape. */ }
  return { value, inputTokens: Number(usage.input_tokens ?? 0), outputTokens: Number(usage.output_tokens ?? 0) };
}

async function generateWithGemini(prompt: string, model: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: outputSchema, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'low' } } }),
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

const getVerifiedFollowUp = (visits: PastVisit[]): Brief['followUp'] => {
  const source = visits.find((visit) => visit.followUpRequired);
  return source
    ? { required: true, date: source.followUpDate, note: source.followUpNote }
    : { required: false, date: null, note: null };
};

const safeFallback = (followUp: Brief['followUp']): Brief => ({
  summary: 'Doğrulanmış kayıtlardan güvenli bir özet oluşturulamadı.',
  keyPoints: [], followUp,
  limitations: ['Klinik kayıtları doğrudan inceleyin.'],
});

function validateBrief(value: unknown, visits: PastVisit[], appointmentId: string): ValidationResult {
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { return { ok: false, reason: 'invalid_shape' }; }
  if (serialized.length > MAX_OUTPUT_CHARS) return { ok: false, reason: 'output_too_large' };
  if (serialized.includes(appointmentId) || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized)) return { ok: false, reason: 'uuid_leak' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'invalid_shape' };
  const item = value as Partial<AIOutput>;
  if (typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 1200) return { ok: false, reason: 'invalid_summary' };
  if (!Array.isArray(item.keyPoints) || item.keyPoints.length > 8) return { ok: false, reason: 'invalid_key_points' };
  const refs = new Set(visits.map((visit) => visit.ref));
  for (const point of item.keyPoints) {
    if (!point || typeof point.text !== 'string' || !point.text.trim() || point.text.length > 500 || !Array.isArray(point.evidenceRefs) || point.evidenceRefs.length === 0 || point.evidenceRefs.length > 5) return { ok: false, reason: 'invalid_key_points' };
    if (point.evidenceRefs.some((ref) => typeof ref !== 'string' || !refs.has(ref))) return { ok: false, reason: 'invalid_evidence_ref' };
  }
  if (!Array.isArray(item.limitations) || item.limitations.length > 6 || item.limitations.some((entry) => typeof entry !== 'string' || entry.length > 300)) return { ok: false, reason: 'invalid_limitations' };
  const recommendationPattern = /\b(?:recommend(?:s|ed|ing)?|prescribe(?:s|d)?|should\s+(?:start|take|use)|(?:ilaç|tedavi)\s+(?:başlanmalı|başlayın|kullanın|önerilir|öneriyorum))\b/i;
  if (recommendationPattern.test(serialized)) return { ok: false, reason: 'disallowed_claim' };
  return { ok: true, brief: value as AIOutput };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const startedAt = Date.now();
  let usageId: string | null = null;
  let client: ReturnType<typeof createClient> | null = null;
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Oturum bulunamadı.');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = getSupabasePublishableKey();
    if (!supabaseUrl || !publishableKey) throw new HttpError(503, 'Servis yapılandırması eksik.');
    client = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) throw new HttpError(401, 'Oturum doğrulanamadı.');
    const { data: role, error: roleError } = await client.from('user_roles').select('role').eq('user_id', authData.user.id).single();
    if (roleError || role?.role !== 'doctor') throw new HttpError(403, 'Doktor yetkisi bulunamadı.');
    const body = await request.json() as { appointmentId?: unknown };
    if (typeof body.appointmentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.appointmentId)) throw new HttpError(400, 'Geçersiz randevu kimliği.');
    const { data: rows, error: contextError } = await client.rpc('get_doctor_ai_brief_context', { p_appointment_id: body.appointmentId });
    if (contextError) throw new HttpError(403, 'Randevu bağlamına erişilemedi.');
    const context = (rows?.[0] ?? null) as BriefContext | null;
    if (!context) throw new HttpError(403, 'Randevu bulunamadı veya erişim yetkiniz yok.');
    if (!Array.isArray(context.past_visits) || context.past_visits.length === 0) {
      const { data: noHistoryUsage, error: noHistoryUsageError } = await client.rpc('start_ai_usage', { p_feature: 'doctor_pre_visit_brief', p_provider: 'none', p_model: 'deterministic', p_limit: RATE_LIMIT_PER_MINUTE });
      if (noHistoryUsageError) {
        if (noHistoryUsageError.message.includes('AI_RATE_LIMIT')) throw new HttpError(429, 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
        throw new HttpError(500, 'AI kullanım kaydı başlatılamadı.');
      }
      await client.rpc('finish_ai_usage', { p_usage_id: noHistoryUsage, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'no_history', p_error_code: null });
      return json({ brief: { summary: 'Bu hasta için önceki tamamlanmış muayene kaydı bulunmuyor.', keyPoints: [], followUp: { required: false, date: null, note: null }, limitations: ['Özet oluşturmak için geçmiş tamamlanmış muayene verisi yok.'] } });
    }
    const provider = (Deno.env.get('AI_PROVIDER') ?? 'openai').toLowerCase() as ProviderName;
    if (!['openai', 'gemini'].includes(provider)) throw new HttpError(503, 'AI sağlayıcısı yapılandırması geçersiz.');
    const model = Deno.env.get('AI_MODEL');
    if (!model) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
    const prompt = `Verified context records follow. References V1-V5 identify past visits. Return only the requested JSON.\n${JSON.stringify(context)}`;
    if (prompt.length > MAX_CONTEXT_CHARS) throw new HttpError(413, 'Klinik bağlam güvenli özetleme sınırını aşıyor.');
    const { data: startedUsage, error: usageError } = await client.rpc('start_ai_usage', { p_feature: 'doctor_pre_visit_brief', p_provider: provider, p_model: model, p_limit: RATE_LIMIT_PER_MINUTE });
    if (usageError) {
      if (usageError.message.includes('AI_RATE_LIMIT')) throw new HttpError(429, 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.');
      throw new HttpError(500, 'AI kullanım kaydı başlatılamadı.');
    }
    usageId = startedUsage as string;
    let providerResult: ProviderResult;
    try { providerResult = provider === 'openai' ? await generateWithOpenAI(prompt, model) : await generateWithGemini(prompt, model); }
    catch (providerError) {
      const errorCode = providerError instanceof HttpError && providerError.status === 504 ? 'provider_timeout' : 'provider_request_failed';
      await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'provider_error', p_error_code: errorCode });
      throw providerError;
    }
    const validation = validateBrief(providerResult.value, context.past_visits, context.appointment_id);
    const followUp = getVerifiedFollowUp(context.past_visits);
    await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: providerResult.inputTokens, p_output_tokens: providerResult.outputTokens, p_latency_ms: Date.now() - startedAt, p_status: validation.ok ? 'success' : 'invalid_output', p_error_code: validation.ok ? null : validation.reason });
    return json({ brief: validation.ok ? { ...validation.brief, followUp } : safeFallback(followUp) });
  } catch (error) {
    const safeError = error instanceof HttpError ? error : new HttpError(500, 'Hasta özeti hazırlanamadı.');
    return json({ error: safeError.message }, safeError.status);
  }
});
