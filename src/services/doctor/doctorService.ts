import { supabase } from '../../lib/supabase';

export type DoctorDayAppointment = {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
  appointment_notes: string | null;
};

export const getDoctorDayAppointments = async (
  date: string
): Promise<DoctorDayAppointment[]> => {
  const { data, error } = await supabase.rpc(
    'get_doctor_day_appointments',
    {
      p_date: date,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as DoctorDayAppointment[];
};

export const getLocalDateString = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};