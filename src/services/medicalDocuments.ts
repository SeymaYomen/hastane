import { supabase } from '../lib/supabase';

export type MedicalDocumentCategory =
  | 'lab_report' | 'radiology_report' | 'discharge_summary'
  | 'referral' | 'prescription_document' | 'other';

export const medicalDocumentCategoryLabels: Record<MedicalDocumentCategory, string> = {
  lab_report: 'Laboratuvar Raporu',
  radiology_report: 'Radyoloji Raporu',
  discharge_summary: 'Epikriz / Taburculuk Belgesi',
  referral: 'Sevk / Konsültasyon Belgesi',
  prescription_document: 'Reçete Belgesi',
  other: 'Diğer',
};

export type DocumentUploadIntent = {
  documentId: string;
  storagePath: string;
  uploadToken: string;
  intentExpiresAt: string;
};

const signedUrlCache = new Map<string, { url: string; usableUntil: number }>();

const invokeErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  if (!error || typeof error !== 'object' || !('context' in error)) return fallback;
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object' || !('clone' in context)) return fallback;
  try {
    const response = (context as Response).clone();
    const body = await response.json() as { error?: unknown };
    return typeof body.error === 'string' && body.error.length <= 300 ? body.error : fallback;
  } catch { return fallback; }
};

export const invokeDocumentFunction = async <T>(name: string, body: object): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await invokeErrorMessage(error, 'Belge işlemi tamamlanamadı. Lütfen tekrar deneyin.'));
  return data as T;
};

export const uploadDocumentToSignedTarget = async (file: File, intent: DocumentUploadIntent) => {
  const { error } = await supabase.storage.from('medical-documents').uploadToSignedUrl(
    intent.storagePath, intent.uploadToken, file, { contentType: file.type, upsert: false },
  );
  if (error) throw new Error('Dosya yüklenemedi. Lütfen yeni bir yükleme başlatın.');
};

export const finalizeMedicalDocument = async (documentId: string): Promise<void> => {
  await invokeDocumentFunction<{ documentId: string; status: 'ready' }>(
    'medical-document-finalize', { documentId },
  );
};

export const getMedicalDocumentSignedUrl = async (documentId: string): Promise<string> => {
  const cached = signedUrlCache.get(documentId);
  if (cached && cached.usableUntil > Date.now()) return cached.url;
  const result = await invokeDocumentFunction<{ signedUrl: string; expiresAt: string }>(
    'medical-document-signed-url', { documentId },
  );
  signedUrlCache.set(documentId, { url: result.signedUrl, usableUntil: Date.now() + 90_000 });
  return result.signedUrl;
};
