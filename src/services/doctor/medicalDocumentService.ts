import { supabase } from '../../lib/supabase';
import {
  invokeDocumentFunction,
  type DocumentUploadIntent,
  type MedicalDocumentCategory,
} from '../medicalDocuments';

export type DoctorMedicalDocument = {
  document_id: string; category: MedicalDocumentCategory; title: string;
  description: string | null; original_file_name: string; mime_type: string;
  size_bytes: number; uploader_role: 'patient' | 'doctor'; created_at: string;
  finalized_at: string;
};

export const getDoctorAppointmentDocuments = async (appointmentId: string): Promise<DoctorMedicalDocument[]> => {
  const { data, error } = await supabase.rpc('get_doctor_appointment_documents', { p_appointment_id: appointmentId });
  if (error) throw error;
  return (data ?? []) as DoctorMedicalDocument[];
};

export const createDoctorDocumentUploadIntent = async (input: {
  appointmentId: string; category: MedicalDocumentCategory; title: string;
  description: string | null; file: File;
}): Promise<DocumentUploadIntent> => invokeDocumentFunction('medical-document-upload-intent', {
  appointmentId: input.appointmentId, category: input.category, title: input.title,
  description: input.description, originalFileName: input.file.name,
  claimedMimeType: input.file.type, claimedSizeBytes: input.file.size,
});
