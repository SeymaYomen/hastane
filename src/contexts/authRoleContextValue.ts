import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '../services/auth/roleService';

export type AuthRoleState = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
};

export const AuthRoleContext = createContext<AuthRoleState | undefined>(undefined);
