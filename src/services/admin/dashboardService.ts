import { supabase } from '../../lib/supabase';

export type AdminDashboardCounts = {
  activeDepartmentCount: number;
  totalDoctorCount: number;
  secretaryCount: number;
  patientCount: number;
};

type DashboardCountsRow = {
  active_department_count: number | string;
  total_doctor_count: number | string;
  secretary_count: number | string;
  patient_count: number | string;
};

export const getAdminDashboardCounts = async (): Promise<AdminDashboardCounts> => {
  const { data, error } = await supabase.rpc('admin_get_dashboard_counts');
  if (error) throw error;

  const row = (data as DashboardCountsRow[] | null)?.[0];
  if (!row) throw new Error('Yönetim özeti alınamadı.');

  return {
    activeDepartmentCount: Number(row.active_department_count),
    totalDoctorCount: Number(row.total_doctor_count),
    secretaryCount: Number(row.secretary_count),
    patientCount: Number(row.patient_count),
  };
};
