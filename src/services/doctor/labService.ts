import { supabase } from '../../lib/supabase';

export type LabItemStatus = 'requested' | 'resulted' | 'cancelled';

export type LabTestCatalogItem = {
  id: string;
  code: string;
  display_name: string;
  default_unit: string | null;
};

export type DoctorLabOrderItem = {
  item_id: string;
  test_catalog_id: string | null;
  test_name: string;
  status: LabItemStatus;
  result_value_numeric: number | null;
  result_text: string | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  reference_text: string | null;
  result_note: string | null;
  requested_at: string;
  resulted_at: string | null;
  cancelled_at: string | null;
  sort_order: number;
};

export type DoctorLabOrder = {
  lab_order_id: string;
  appointment_id: string;
  order_note: string | null;
  created_at: string;
  updated_at: string;
  items: DoctorLabOrderItem[];
};

export type NewLabTestInput = {
  test_catalog_id: string | null;
  test_name: string;
  sort_order: number;
};

export type LabResultInput = {
  itemId: string;
  resultValueNumeric: number | null;
  resultText: string | null;
  unit: string | null;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceText: string | null;
  resultNote: string | null;
};

export const getLabTestCatalog = async (): Promise<LabTestCatalogItem[]> => {
  const { data, error } = await supabase.rpc('get_lab_test_catalog');
  if (error) throw error;
  return (data ?? []) as LabTestCatalogItem[];
};

export const getDoctorLabOrder = async (appointmentId: string): Promise<DoctorLabOrder | null> => {
  const { data, error } = await supabase.rpc('get_doctor_lab_order', {
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
  return ((data ?? [])[0] as DoctorLabOrder | undefined) ?? null;
};

export const addDoctorLabTests = async (input: {
  appointmentId: string;
  orderNote: string | null;
  items: NewLabTestInput[];
}): Promise<void> => {
  const { error } = await supabase.rpc('add_doctor_lab_tests', {
    p_appointment_id: input.appointmentId,
    p_order_note: input.orderNote,
    p_items: input.items,
  });
  if (error) throw error;
};

export const resultDoctorLabItem = async (input: LabResultInput): Promise<void> => {
  const { error } = await supabase.rpc('result_doctor_lab_item', {
    p_item_id: input.itemId,
    p_result_value_numeric: input.resultValueNumeric,
    p_result_text: input.resultText,
    p_unit: input.unit,
    p_reference_min: input.referenceMin,
    p_reference_max: input.referenceMax,
    p_reference_text: input.referenceText,
    p_result_note: input.resultNote,
  });
  if (error) throw error;
};

export const cancelDoctorLabItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase.rpc('cancel_doctor_lab_item', { p_item_id: itemId });
  if (error) throw error;
};
