import { supabase } from '../../lib/supabase';
import type { PreVisitBrief } from './types';

const CLIENT_TIMEOUT_MS = 60_000;

export const getPreVisitBrief = async (appointmentId: string): Promise<PreVisitBrief> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('AI servisi zamanında yanıt vermedi. Tekrar deneyebilirsiniz.')),
      CLIENT_TIMEOUT_MS,
    );
  });
  const { data, error } = await Promise.race([
    supabase.functions.invoke('doctor-ai-brief', { body: { appointmentId } }),
    timeoutPromise,
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
  if (error) throw new Error(typeof data?.error === 'string' ? data.error : 'Hasta özeti hazırlanamadı.');
  if (!data?.brief) throw new Error('AI servisi geçerli bir özet döndürmedi.');
  return data.brief as PreVisitBrief;
};
