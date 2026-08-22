import { supabase } from '../../lib/supabase';

export type PatientPrescriptionItem = {
  medication_name: string;
  dose_instruction: string | null;
  frequency: string | null;
  duration: string | null;
  usage_note: string | null;
  sort_order: number;
};

export type PatientPrescription = {
  prescription_id: string;
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  doctor_title: string | null;
  department: string;
  prescription_note: string | null;
  created_at: string;
  updated_at: string;
  items: PatientPrescriptionItem[];
};

export const getMyPrescriptions = async (): Promise<PatientPrescription[]> => {
  const { data, error } = await supabase.rpc('get_my_prescriptions');
  if (error) throw error;
  return (data ?? []) as PatientPrescription[];
};
