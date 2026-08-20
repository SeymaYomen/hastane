import { supabase } from '../../lib/supabase';

export type DoctorProfile = {
  full_name: string;
  department: string;
  title: string;
  experience_years: number;
  education: string;
  languages: string[];
  specialties: string[];
  working_days: string[];
};

export const getCurrentDoctorProfile = async (
  userId: string
): Promise<DoctorProfile | null> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('full_name, department, title, experience_years, education, languages, specialties, working_days')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data as DoctorProfile | null;
};
