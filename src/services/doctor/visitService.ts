import { supabase } from '../../lib/supabase';
import type { AppointmentStatus } from '../../types/appointmentStatus';

export type DoctorAppointmentDetail = {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_status: AppointmentStatus;
  appointment_notes: string | null;
  visit_note_id: string | null;
  clinical_note: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_note: string | null;
  visit_created_at: string | null;
  visit_updated_at: string | null;
};

export type VisitNoteSaveInput = {
  appointmentId: string;
  clinicalNote: string;
  followUpRequired: boolean;
  followUpDate: string | null;
  followUpNote: string | null;
  markCompleted: boolean;
};

export type VisitNoteSaveResult = {
  visit_note_id: string;
  appointment_status: AppointmentStatus;
  updated_at: string;
};

export const getDoctorAppointmentDetail = async (
  appointmentId: string
): Promise<DoctorAppointmentDetail | null> => {
  const { data, error } = await supabase.rpc('get_doctor_appointment_detail', {
    p_appointment_id: appointmentId,
  });

  if (error) throw error;

  return ((data ?? [])[0] as DoctorAppointmentDetail | undefined) ?? null;
};

export const saveDoctorVisitNote = async (
  input: VisitNoteSaveInput
): Promise<VisitNoteSaveResult> => {
  const { data, error } = await supabase.rpc('save_doctor_visit_note', {
    p_appointment_id: input.appointmentId,
    p_clinical_note: input.clinicalNote,
    p_follow_up_required: input.followUpRequired,
    p_follow_up_date: input.followUpRequired ? input.followUpDate : null,
    p_follow_up_note: input.followUpRequired ? input.followUpNote : null,
    p_mark_completed: input.markCompleted,
  });

  if (error) throw error;

  const result = (data ?? [])[0] as VisitNoteSaveResult | undefined;
  if (!result) throw new Error('Muayene kaydı sonucu alınamadı.');

  return result;
};
