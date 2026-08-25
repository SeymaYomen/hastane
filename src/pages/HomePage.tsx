import { useEffect, useState } from 'react';
import { AdminHomeFallback } from '../components/home/AdminHomeFallback';
import { DoctorHomeDashboard } from '../components/home/DoctorHomeDashboard';
import { GuestHome } from '../components/home/GuestHome';
import { HomePageFrame, InlineState } from '../components/home/HomePrimitives';
import { PatientHomeDashboard } from '../components/home/PatientHomeDashboard';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { getCurrentUserRole, type UserRole } from '../services/auth/roleService';

type HomeIdentity =
  | { state: 'loading' }
  | { state: 'guest' }
  | { state: 'authenticated'; role: UserRole }
  | { state: 'error' };

const HomePage = () => {
  const { theme } = useTheme();
  const [identity, setIdentity] = useState<HomeIdentity>({ state: 'loading' });

  useEffect(() => {
    let active = true;

    const resolveIdentity = async (userId?: string) => {
      if (!userId) {
        if (active) setIdentity({ state: 'guest' });
        return;
      }
      if (active) setIdentity({ state: 'loading' });
      try {
        const role = await getCurrentUserRole(userId);
        if (active) setIdentity({ state: 'authenticated', role });
      } catch {
        if (active) setIdentity({ state: 'error' });
      }
    };

    void supabase.auth.getSession().then(({ data }) => resolveIdentity(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveIdentity(session?.user.id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <HomePageFrame theme={theme}>
      {identity.state === 'loading' && <InlineState>Ana sayfanız hazırlanıyor…</InlineState>}
      {identity.state === 'error' && <InlineState error>Kullanıcı rolü doğrulanamadı. Lütfen oturumunuzu yenileyip tekrar deneyin.</InlineState>}
      {identity.state === 'guest' && <GuestHome theme={theme} />}
      {identity.state === 'authenticated' && identity.role === 'patient' && <PatientHomeDashboard theme={theme} />}
      {identity.state === 'authenticated' && identity.role === 'doctor' && <DoctorHomeDashboard theme={theme} />}
      {identity.state === 'authenticated' && identity.role === 'admin' && <AdminHomeFallback theme={theme} />}
    </HomePageFrame>
  );
};

export default HomePage;
