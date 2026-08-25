import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUserRole } from '../services/auth/roleService';
import { AuthRoleContext, type AuthRoleState } from './authRoleContextValue';

const initialState: AuthRoleState = {
  session: null,
  user: null,
  isAuthenticated: false,
  role: null,
  loading: true,
  error: null,
};

export const AuthRoleProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthRoleState>(initialState);

  useEffect(() => {
    let active = true;
    let requestVersion = 0;
    let lastSessionKey: string | null | undefined;
    const pendingTimers = new Set<number>();

    const applySession = async (session: Session | null) => {
      const sessionKey = session
        ? `${session.user.id}:${session.user.updated_at ?? ''}:${session.access_token}`
        : null;
      if (!active || sessionKey === lastSessionKey) return;

      lastSessionKey = sessionKey;
      const currentRequest = ++requestVersion;

      if (!session?.user) {
        setState({ ...initialState, loading: false });
        return;
      }

      setState({
        session,
        user: session.user,
        isAuthenticated: true,
        role: null,
        loading: true,
        error: null,
      });

      try {
        const role = await getCurrentUserRole(session.user.id);
        if (!active || currentRequest !== requestVersion) return;

        setState({
          session,
          user: session.user,
          isAuthenticated: true,
          role,
          loading: false,
          error: null,
        });
      } catch {
        if (!active || currentRequest !== requestVersion) return;

        setState({
          session,
          user: session.user,
          isAuthenticated: true,
          role: null,
          loading: false,
          error: 'Kullanıcı rolü doğrulanamadı.',
        });
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setState({ ...initialState, loading: false, error: 'Oturum doğrulanamadı.' });
        return;
      }
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        void applySession(session);
      }, 0);
      pendingTimers.add(timer);
    });

    return () => {
      active = false;
      requestVersion += 1;
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
    };
  }, []);

  return <AuthRoleContext.Provider value={state}>{children}</AuthRoleContext.Provider>;
};
