import { supabase } from '../../lib/supabase';
import type { UserRole } from '../auth/roleService';

export type ManagedAdminRole = Exclude<UserRole, 'doctor'>;

export type AdminUserDirectoryItem = {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type AdminUserDirectoryQuery = {
  search?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
};

export type AdminRoleChangeResult = {
  target_user_id: string;
  previous_role: UserRole;
  new_role: UserRole;
};

export const listAdminUsers = async (
  query: AdminUserDirectoryQuery = {},
): Promise<AdminUserDirectoryItem[]> => {
  const limit = Math.min(50, Math.max(1, Math.trunc(query.limit ?? 25)));
  const offset = Math.min(10000, Math.max(0, Math.trunc(query.offset ?? 0)));
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: query.search?.trim() || null,
    p_role: query.role ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminUserDirectoryItem[];
};

export const setAdminUserRole = async (
  userId: string,
  role: ManagedAdminRole,
): Promise<AdminRoleChangeResult> => {
  const { data, error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;

  const row = (data as AdminRoleChangeResult[] | null)?.[0];
  if (!row) throw new Error('Kullanıcı rolü güncellenemedi.');
  return row;
};
