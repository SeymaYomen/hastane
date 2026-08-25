import { supabase } from '../../lib/supabase';
import type { AppointmentStatus } from '../../types/appointmentStatus';

export type PatientHomeAppointment = {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  doctorName: string;
  department: string;
};

type AppointmentRow = {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  doctors: { full_name: string; department: string } | { full_name: string; department: string }[] | null;
};

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getNextPatientAppointment = async (): Promise<PatientHomeAppointment | null> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Oturum bulunamadı.');

  const { data, error } = await supabase
    .from('appointments')
    .select('id,date,time,status,doctors(full_name,department)')
    .eq('user_id', user.id)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .gte('date', localDate())
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(20);

  if (error) throw error;
  const now = new Date();
  const today = localDate();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const next = (data ?? []).find((item) =>
    item.date > today
    || (item.date === today && item.status === 'in_progress')
    || (item.date === today && item.time.slice(0, 5) >= currentTime)
  );
  if (!next) return null;

  const row = next as AppointmentRow;
  const doctor = Array.isArray(row.doctors) ? row.doctors[0] : row.doctors;
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    status: row.status,
    doctorName: doctor?.full_name ?? 'Doktor bilgisi',
    department: doctor?.department ?? 'Bölüm bilgisi',
  };
};
