import { supabase } from '../../lib/supabase';

export type PrescriptionItemInput = {
  medication_name: string;
  dose_instruction: string | null;
  frequency: string | null;
  duration: string | null;
  usage_note: string | null;
  sort_order: number;
};

export type DoctorPrescription = {
  prescription_id: string;
  appointment_id: string;
  prescription_note: string | null;
  created_at: string;
  updated_at: string;
  items: PrescriptionItemInput[];
};

type DoctorPrescriptionRow = Omit<DoctorPrescription, 'prescription_id'> & {
  prescription_id: string | null;
};

const toPrescription = (row: DoctorPrescriptionRow | undefined): DoctorPrescription | null => {
  if (!row?.prescription_id) return null;
  return { ...row, prescription_id: row.prescription_id };
};

export const getDoctorPrescription = async (
  appointmentId: string,
): Promise<DoctorPrescription | null> => {
  const { data, error } = await supabase.rpc('get_doctor_prescription', {
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
  return toPrescription((data ?? [])[0] as DoctorPrescriptionRow | undefined);
};

export const saveDoctorPrescription = async (input: {
  appointmentId: string;
  prescriptionNote: string | null;
  items: PrescriptionItemInput[];
}): Promise<DoctorPrescription> => {
  const { data, error } = await supabase.rpc('save_doctor_prescription', {
    p_appointment_id: input.appointmentId,
    p_prescription_note: input.prescriptionNote,
    p_items: input.items,
  });
  if (error) throw error;
  const prescription = toPrescription((data ?? [])[0] as DoctorPrescriptionRow | undefined);
  if (!prescription) throw new Error('Reçete kayıt sonucu alınamadı.');
  return prescription;
};
