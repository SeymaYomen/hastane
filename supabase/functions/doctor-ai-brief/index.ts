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
type ProviderResult = { value: unknown; inputTokens: number; outputTokens: number };

const RATE_LIMIT_PER_MINUTE = 5;
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
The output supports physician preparation and is not a clinical decision.`;
const outputSchema = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'keyPoints', 'followUp', 'limitations'],
  properties: {
    summary: { type: 'string', maxLength: 1200 },
    keyPoints: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text', 'evidenceRefs'], properties: { text: { type: 'string', maxLength: 500 }, evidenceRefs: { type: 'array', maxItems: 5, items: { type: 'string' } } } } },
    followUp: { type: 'object', additionalProperties: false, required: ['required', 'date', 'note'], properties: { required: { type: 'boolean' }, date: { type: ['string', 'null'] }, note: { type: ['string', 'null'], maxLength: 500 } } },
    limitations: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 300 } },
  },
};

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions: systemInstruction, input: prompt, text: { format: { type: 'json_schema', name: 'pre_visit_brief', strict: true, schema: outputSchema } } }),
  });
  if (!response.ok) throw new HttpError(502, 'AI sağlayıcısı isteği tamamlayamadı.');
  const payload = await response.json() as Record<string, unknown>;
  const usage = (payload.usage ?? {}) as Record<string, unknown>;
  return { value: JSON.parse(responseText(payload)), inputTokens: Number(usage.input_tokens ?? 0), outputTokens: Number(usage.output_tokens ?? 0) };
}

async function generateWithGemini(prompt: string, model: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI servisi henüz yapılandırılmadı.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: outputSchema } }),
  });
  if (!response.ok) throw new HttpError(502, 'AI sağlayıcısı isteği tamamlayamadı.');
  const payload = await response.json() as Record<string, unknown>;
  const candidates = payload.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new HttpError(502, 'AI servisi geçerli bir yanıt döndürmedi.');
  const usage = (payload.usageMetadata ?? {}) as Record<string, unknown>;
  return { value: JSON.parse(text), inputTokens: Number(usage.promptTokenCount ?? 0), outputTokens: Number(usage.candidatesTokenCount ?? 0) };
}

const safeFallback = (): Brief => ({
  summary: 'Doğrulanmış kayıtlardan güvenli bir özet oluşturulamadı.',
  keyPoints: [], followUp: { required: false, date: null, note: null },
  limitations: ['Klinik kayıtları doğrudan inceleyin.'],
});

function validateBrief(value: unknown, visits: PastVisit[], appointmentId: string): Brief | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Brief>;
  if (typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 1200) return null;
  if (!Array.isArray(item.keyPoints) || item.keyPoints.length > 8 || !Array.isArray(item.limitations) || item.limitations.length > 6) return null;
  const refs = new Set(visits.map((visit) => visit.ref));
  const dates = new Set(visits.map((visit) => visit.followUpDate).filter(Boolean));
  for (const point of item.keyPoints) {
    if (!point || typeof point.text !== 'string' || !point.text.trim() || point.text.length > 500 || !Array.isArray(point.evidenceRefs) || point.evidenceRefs.length === 0 || point.evidenceRefs.some((ref) => !refs.has(ref))) return null;
  }
  if (item.limitations.some((entry) => typeof entry !== 'string' || entry.length > 300)) return null;
  const followUp = item.followUp;
  if (!followUp || typeof followUp.required !== 'boolean' || (followUp.date !== null && (typeof followUp.date !== 'string' || !dates.has(followUp.date))) || (followUp.note !== null && (typeof followUp.note !== 'string' || followUp.note.length > 500))) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_OUTPUT_CHARS || serialized.includes(appointmentId) || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized) || /\b(?:diagnosis|tanı|tedavi öner|ilaç öner)\b/i.test(serialized)) return null;
  return value as Brief;
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) throw new HttpError(503, 'Servis yapılandırması eksik.');
    client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
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
      await client.rpc('finish_ai_usage', { p_usage_id: noHistoryUsage, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'no_history' });
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
      await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: 0, p_output_tokens: 0, p_latency_ms: Date.now() - startedAt, p_status: 'provider_error' });
      throw providerError;
    }
    const brief = validateBrief(providerResult.value, context.past_visits, context.appointment_id);
    await client.rpc('finish_ai_usage', { p_usage_id: usageId, p_input_tokens: providerResult.inputTokens, p_output_tokens: providerResult.outputTokens, p_latency_ms: Date.now() - startedAt, p_status: brief ? 'success' : 'invalid_output' });
    return json({ brief: brief ?? safeFallback() });
  } catch (error) {
    const safeError = error instanceof HttpError ? error : new HttpError(500, 'Hasta özeti hazırlanamadı.');
    return json({ error: safeError.message }, safeError.status);
  }
});
