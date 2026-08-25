import { AdminHomeFallback } from '../components/home/AdminHomeFallback';
import { DoctorHomeDashboard } from '../components/home/DoctorHomeDashboard';
import { GuestHome } from '../components/home/GuestHome';
import { HomePageFrame, InlineState } from '../components/home/HomePrimitives';
import { PatientHomeDashboard } from '../components/home/PatientHomeDashboard';
import { SecretaryHomeFallback } from '../components/home/SecretaryHomeFallback';
import { useAuthRole } from '../hooks/useAuthRole';
import { useTheme } from '../contexts/ThemeContext';

const HomePage = () => {
  const { theme } = useTheme();
  const { isAuthenticated, role, loading, error } = useAuthRole();

  return (
    <HomePageFrame theme={theme}>
      {loading && <InlineState>Ana sayfanız hazırlanıyor…</InlineState>}
      {!loading && (error || (isAuthenticated && !role)) && (
        <InlineState error>
          Kullanıcı rolü doğrulanamadı. Lütfen oturumunuzu yenileyip tekrar deneyin.
        </InlineState>
      )}
      {!loading && !error && !isAuthenticated && <GuestHome theme={theme} />}
      {!loading && role === 'patient' && <PatientHomeDashboard theme={theme} />}
      {!loading && role === 'doctor' && <DoctorHomeDashboard theme={theme} />}
      {!loading && role === 'secretary' && <SecretaryHomeFallback theme={theme} />}
      {!loading && role === 'admin' && <AdminHomeFallback theme={theme} />}
    </HomePageFrame>
  );
};

export default HomePage;
