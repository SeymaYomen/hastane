import { supabase } from '../../lib/supabase';

export const cancelMyAppointment = async (appointmentId: string) => {
  const { data, error } = await supabase.rpc('cancel_my_appointment', {
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
  return data?.[0];
};
