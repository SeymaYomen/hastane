import { supabase } from '../../lib/supabase';
import type { PreVisitBrief } from './types';

export const getPreVisitBrief = async (appointmentId: string): Promise<PreVisitBrief> => {
  const { data, error } = await supabase.functions.invoke('doctor-ai-brief', { body: { appointmentId } });
  if (error) throw new Error(typeof data?.error === 'string' ? data.error : 'Hasta özeti hazırlanamadı.');
  if (!data?.brief) throw new Error('AI servisi geçerli bir özet döndürmedi.');
  return data.brief as PreVisitBrief;
};
