import { supabase } from '../../lib/supabase';

export type PatientLabItemStatus = 'requested' | 'resulted' | 'cancelled';

export type PatientLabOrderItem = {
  test_name: string;
  status: PatientLabItemStatus;
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

export type PatientLabOrder = {
  lab_order_id: string;
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  doctor_title: string | null;
  department: string;
  order_note: string | null;
  created_at: string;
  updated_at: string;
  items: PatientLabOrderItem[];
};

export const getMyLabOrders = async (): Promise<PatientLabOrder[]> => {
  const { data, error } = await supabase.rpc('get_my_lab_orders');
  if (error) throw error;
  return (data ?? []) as PatientLabOrder[];
};
