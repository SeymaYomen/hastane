import { supabase } from '../../lib/supabase';

export type PatientHealthRecordItem = {
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  doctor_title: string | null;
  department: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_note: string | null;
  follow_up_updated_at: string | null;
};

export const getMyHealthRecord = async (): Promise<PatientHealthRecordItem[]> => {
  const { data, error } = await supabase.rpc('get_my_health_record');
  if (error) throw error;
  return (data ?? []) as PatientHealthRecordItem[];
};
