import { supabase } from '../../lib/supabase';

export type PatientFollowUpPlan = {
  appointment_id: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_note: string | null;
  updated_at: string;
};

export const getMyFollowUpPlans = async (): Promise<PatientFollowUpPlan[]> => {
  const { data, error } = await supabase.rpc('get_my_follow_up_plans');

  if (error) throw error;

  return (data ?? []) as PatientFollowUpPlan[];
};
