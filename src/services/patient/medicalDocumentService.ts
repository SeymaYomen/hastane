import { supabase } from '../../lib/supabase';
import {
  invokeDocumentFunction,
  type DocumentUploadIntent,
  type MedicalDocumentCategory,
} from '../medicalDocuments';

export type DocumentLinkedAppointment = {
  appointment_id: string; appointment_date: string; appointment_time: string;
  doctor_name: string; doctor_title: string | null; department: string;
};

export type PatientMedicalDocument = {
  document_id: string; category: MedicalDocumentCategory; title: string;
  description: string | null; original_file_name: string; mime_type: string;
  size_bytes: number; uploader_role: 'patient' | 'doctor'; created_at: string;
  finalized_at: string; linked_appointments: DocumentLinkedAppointment[];
};

export type DocumentShareableAppointment = DocumentLinkedAppointment & { appointment_status: string };

export const getMyMedicalDocuments = async (): Promise<PatientMedicalDocument[]> => {
  const { data, error } = await supabase.rpc('get_my_medical_documents');
  if (error) throw error;
  return (data ?? []) as PatientMedicalDocument[];
};

export const getMyDocumentShareableAppointments = async (): Promise<DocumentShareableAppointment[]> => {
  const { data, error } = await supabase.rpc('get_my_document_shareable_appointments');
  if (error) throw error;
  return (data ?? []) as DocumentShareableAppointment[];
};

export const createPatientDocumentUploadIntent = async (input: {
  category: MedicalDocumentCategory; title: string; description: string | null;
  file: File; appointmentIds: string[];
}): Promise<DocumentUploadIntent> => invokeDocumentFunction('medical-document-upload-intent', {
  category: input.category, title: input.title, description: input.description,
  originalFileName: input.file.name, claimedMimeType: input.file.type,
  claimedSizeBytes: input.file.size, appointmentIds: input.appointmentIds,
});
