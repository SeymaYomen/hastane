import { supabase } from '../../lib/supabase';

export type UserRole = 'patient' | 'doctor' | 'secretary' | 'admin';

const validRoles: UserRole[] = ['patient', 'doctor', 'secretary', 'admin'];

const roleHomePaths: Record<UserRole, string> = {
  patient: '/',
  doctor: '/doctor',
  secretary: '/secretary',
  admin: '/admin',
};

export const getCurrentUserRole = async (
  userId: string
): Promise<UserRole> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  if (!data || !validRoles.includes(data.role as UserRole)) {
    throw new Error('Geçerli kullanıcı rolü bulunamadı.');
  }

  return data.role as UserRole;
};

export const getRoleHomePath = (role: UserRole): string => roleHomePaths[role];
