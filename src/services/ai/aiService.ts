import { supabase } from '../../lib/supabase';
import type { ClinicalAssistantCurrentNote, ClinicalAssistantDraft, ClinicalAssistantSummary, PreVisitBrief } from './types';

const CLIENT_TIMEOUT_MS = 60_000;

export type AIServiceErrorKind =
  | 'rate_limit'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable'
  | 'invalid_response'
  | 'generic';

export class AIServiceError extends Error {
  constructor(
    public readonly kind: AIServiceErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

type ErrorResponse = {
  status: number;
  clone?: () => ErrorResponse;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ErrorResponse>;
  return typeof candidate.status === 'number'
    && typeof candidate.json === 'function'
    && typeof candidate.text === 'function';
};

const getErrorResponse = (error: unknown): ErrorResponse | null => {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  return isErrorResponse(context) ? context : null;
};

const safeBackendMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  // eslint-disable-next-line no-control-regex
  if (!message || message.length > 300 || /[\u0000-\u001f]/.test(message)) return null;
  if (/https?:\/\/|api[_ -]?key|authorization|bearer|stack|supabase|gemini|openai/i.test(message)) return null;
  return message;
};

const readErrorMessage = async (response: ErrorResponse): Promise<string | null> => {
  const copy = () => response.clone?.() ?? response;
  try {
    const body = await copy().json();
    if (body && typeof body === 'object' && 'error' in body) {
      const message = safeBackendMessage((body as { error?: unknown }).error);
      if (message) return message;
    }
  } catch {
    // A non-JSON response may still contain a safe, user-facing message.
  }
  try {
    return safeBackendMessage(await copy().text());
  } catch {
    return null;
  }
};

const errorForStatus = (status: number, backendMessage: string | null): AIServiceError => {
  if (status === 429) return new AIServiceError('rate_limit', 'Çok fazla AI isteği gönderildi. Lütfen bir dakika sonra tekrar deneyin.', status);
  if (status === 504 || status === 408) return new AIServiceError('timeout', 'AI servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.', status);
  if (status === 401) return new AIServiceError('unauthorized', 'Oturumunuz doğrulanamadı. Lütfen yeniden giriş yapın.', status);
  if (status === 403) return new AIServiceError('forbidden', 'Bu AI özeti için erişim yetkiniz bulunmuyor.', status);
  if (status === 503) return new AIServiceError('unavailable', 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.', status);
  return new AIServiceError('generic', backendMessage ?? 'Hasta özeti hazırlanamadı. Lütfen tekrar deneyin.', status);
};

const normalizeInvokeError = async (error: unknown): Promise<AIServiceError> => {
  if (error instanceof AIServiceError) return error;
  const response = getErrorResponse(error);
  if (response) return errorForStatus(response.status, await readErrorMessage(response));
  return new AIServiceError('generic', 'Hasta özeti hazırlanamadı. Lütfen tekrar deneyin.');
};

const isPreVisitBrief = (value: unknown): value is PreVisitBrief => {
  if (!value || typeof value !== 'object') return false;
  const brief = value as Partial<PreVisitBrief>;
  return typeof brief.summary === 'string'
    && Array.isArray(brief.keyPoints)
    && brief.keyPoints.every((point) => point
      && typeof point === 'object'
      && typeof point.text === 'string'
      && Array.isArray(point.evidenceRefs)
      && point.evidenceRefs.every((reference) => typeof reference === 'string'))
    && Array.isArray(brief.limitations)
    && brief.limitations.every((limitation) => typeof limitation === 'string')
    && Boolean(brief.followUp)
    && typeof brief.followUp?.required === 'boolean'
    && (brief.followUp.date === null || typeof brief.followUp.date === 'string')
    && (brief.followUp.note === null || typeof brief.followUp.note === 'string');
};

export const getPreVisitBrief = async (appointmentId: string): Promise<PreVisitBrief> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new AIServiceError('timeout', 'AI servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.')),
      CLIENT_TIMEOUT_MS,
    );
  });

  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('doctor-ai-brief', { body: { appointmentId } }),
      timeoutPromise,
    ]);
    if (error) throw await normalizeInvokeError(error);
    if (!isPreVisitBrief(data?.brief)) {
      throw new AIServiceError('invalid_response', 'AI servisi geçerli bir özet döndürmedi. Lütfen tekrar deneyin.');
    }
    return data.brief;
  } catch (error) {
    throw await normalizeInvokeError(error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const isClinicalAssistantSummary = (value: unknown): value is ClinicalAssistantSummary => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ClinicalAssistantSummary>;
  return typeof result.summary === 'string'
    && Array.isArray(result.keyPoints)
    && result.keyPoints.every((point) => point && typeof point.text === 'string'
      && Array.isArray(point.evidenceRefs) && point.evidenceRefs.every((ref) => typeof ref === 'string'))
    && Array.isArray(result.limitations) && result.limitations.every((item) => typeof item === 'string');
};

const isClinicalAssistantDraft = (value: unknown): value is ClinicalAssistantDraft => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ClinicalAssistantDraft>;
  return (result.noteFormat === 'free_text' || result.noteFormat === 'soap')
    && (result.freeTextDraft === null || typeof result.freeTextDraft === 'string')
    && (result.subjective === null || typeof result.subjective === 'string')
    && (result.objective === null || typeof result.objective === 'string')
    && (result.assessment === null || typeof result.assessment === 'string')
    && (result.plan === null || typeof result.plan === 'string')
    && Array.isArray(result.evidenceRefs) && result.evidenceRefs.every((ref) => typeof ref === 'string')
    && Array.isArray(result.limitations) && result.limitations.every((item) => typeof item === 'string');
};

const invokeClinicalAssistant = async <T>(
  body: Record<string, unknown>,
  validate: (value: unknown) => value is T,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new AIServiceError('timeout', 'AI servisi zamanÄ±nda yanÄ±t vermedi. LÃ¼tfen tekrar deneyin.')), CLIENT_TIMEOUT_MS);
  });
  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('doctor-clinical-assistant', { body }),
      timeoutPromise,
    ]);
    if (error) throw await normalizeInvokeError(error);
    if (!validate(data?.result)) throw new AIServiceError('invalid_response', 'AI servisi geÃ§erli ve gÃ¼venli bir yanÄ±t dÃ¶ndÃ¼rmedi.');
    return data.result;
  } catch (error) {
    throw await normalizeInvokeError(error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const getClinicalAssistantSummary = (appointmentId: string) =>
  invokeClinicalAssistant({ appointmentId, action: 'summary' }, isClinicalAssistantSummary);

export const getClinicalNoteDraft = (appointmentId: string, currentNote: ClinicalAssistantCurrentNote) =>
  invokeClinicalAssistant({ appointmentId, action: 'clinical_note_draft', currentNote }, isClinicalAssistantDraft);
