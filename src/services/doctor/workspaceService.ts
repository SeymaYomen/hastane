import { supabase } from '../../lib/supabase';
import type { AppointmentStatus } from '../../types/appointmentStatus';
import type { ClinicalNoteFormat } from './visitService';

export type DoctorAppointment = {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: AppointmentStatus;
  appointment_notes: string | null;
};

export type DoctorPatient = {
  patient_id: string;
  patient_name: string;
  last_appointment_at: string | null;
  appointment_count: number;
  next_appointment_date: string | null;
};

export type PatientTimelineItem = {
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: AppointmentStatus;
  department: string;
  clinical_note: string | null;
  note_format: ClinicalNoteFormat;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_note: string | null;
};

export type DoctorVisit = {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  note_format: ClinicalNoteFormat;
  follow_up_required: boolean;
  follow_up_date: string | null;
};

const rpcRows = async <T>(name: string, params?: Record<string, unknown>): Promise<T[]> => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return (data ?? []) as T[];
};

export const getDoctorAppointments = (startDate: string, endDate: string) =>
  rpcRows<DoctorAppointment>('get_doctor_appointments', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

export const updateDoctorAppointmentStatus = async (
  appointmentId: string,
  status: AppointmentStatus,
) => {
  const rows = await rpcRows<{ appointment_status: AppointmentStatus }>(
    'update_doctor_appointment_status',
    { p_appointment_id: appointmentId, p_status: status },
  );
  if (!rows[0]) throw new Error('Durum güncellenemedi.');
  return rows[0];
};

export const getDoctorPatients = () => rpcRows<DoctorPatient>('get_doctor_patients');
export const getDoctorPatientTimeline = (patientId: string) =>
  rpcRows<PatientTimelineItem>('get_doctor_patient_timeline', { p_patient_id: patientId });
export const getDoctorVisits = () => rpcRows<DoctorVisit>('get_doctor_visits');

export const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
