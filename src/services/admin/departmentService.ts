import { supabase } from '../../lib/supabase';

export type AdminDepartment = {
  department_id: string;
  name: string;
  description: string | null;
  services: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  doctor_count: number;
};

export type AdminDepartmentInput = {
  name: string;
  description: string | null;
  services: string[];
  sortOrder: number;
};

type DepartmentMutationRow = Omit<AdminDepartment, 'doctor_count'>;

const rowsFromRpc = async <T>(
  name: string,
  params?: Record<string, unknown>,
): Promise<T[]> => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return (data ?? []) as T[];
};

const mutationParams = (input: AdminDepartmentInput) => ({
  p_name: input.name,
  p_description: input.description,
  p_services: input.services,
  p_sort_order: input.sortOrder,
});

export const getAdminDepartments = async (): Promise<AdminDepartment[]> => {
  const rows = await rowsFromRpc<AdminDepartment>('admin_list_departments');
  return rows.map((row) => ({
    ...row,
    sort_order: Number(row.sort_order),
    doctor_count: Number(row.doctor_count),
    services: row.services ?? [],
  }));
};

export const createAdminDepartment = async (
  input: AdminDepartmentInput,
): Promise<DepartmentMutationRow> => {
  const rows = await rowsFromRpc<DepartmentMutationRow>(
    'admin_create_department',
    mutationParams(input),
  );
  if (!rows[0]) throw new Error('Bölüm oluşturulamadı.');
  return rows[0];
};

export const updateAdminDepartment = async (
  departmentId: string,
  input: AdminDepartmentInput,
): Promise<DepartmentMutationRow> => {
  const rows = await rowsFromRpc<DepartmentMutationRow>(
    'admin_update_department',
    { p_department_id: departmentId, ...mutationParams(input) },
  );
  if (!rows[0]) throw new Error('Bölüm güncellenemedi.');
  return rows[0];
};

export const setAdminDepartmentActive = async (
  departmentId: string,
  isActive: boolean,
): Promise<DepartmentMutationRow> => {
  const rows = await rowsFromRpc<DepartmentMutationRow>(
    'admin_set_department_active',
    { p_department_id: departmentId, p_is_active: isActive },
  );
  if (!rows[0]) throw new Error('Bölüm durumu güncellenemedi.');
  return rows[0];
};
