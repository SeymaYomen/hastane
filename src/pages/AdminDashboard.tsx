import { useEffect, useState } from 'react';
import { Building2, Stethoscope, UserRound, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  getAdminDashboardCounts,
  type AdminDashboardCounts,
} from '../services/admin/dashboardService';

const AdminDashboard = () => {
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  useEffect(() => {
    let active = true;
    void getAdminDashboardCounts()
      .then((result) => {
        if (active) setCounts(result);
      })
      .catch(() => {
        if (active) setError('Yönetim özeti yüklenemedi. Lütfen tekrar deneyin.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const cards = counts ? [
    { label: 'Aktif bölüm', value: counts.activeDepartmentCount, icon: Building2 },
    { label: 'Toplam doktor', value: counts.totalDoctorCount, icon: Stethoscope },
    { label: 'Sekreter', value: counts.secretaryCount, icon: UserRound },
    { label: 'Hasta', value: counts.patientCount, icon: UsersRound },
  ] : [];

  const cardClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Yönetim</p>
        <h1 className={`mt-2 text-3xl font-bold ${isHighContrast ? 'text-white' : 'text-slate-950 dark:text-white'}`}>Genel Bakış</h1>
        <p className={`mt-3 max-w-2xl leading-7 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          Yalnızca idari kapsamlı, gerçek sistem sayımları gösterilir.
        </p>
      </header>

      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {loading && <p role="status" className="mt-8 text-sm text-slate-500 dark:text-slate-300">Yönetim özeti yükleniyor...</p>}

      {!loading && counts && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <section key={label} className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-sm ${isHighContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </div>
                <div className={`rounded-xl p-3 ${isHighContrast ? 'border border-white' : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200'}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { to: '/admin/departments', title: 'Bölümler', text: 'Bölüm kayıtlarını ve aktiflik durumlarını yönetin.' },
          { to: '/admin/users', title: 'Kullanıcılar ve Roller', text: 'Uygun kullanıcıların idari rollerini güvenli biçimde yönetin.' },
          { to: '/admin/audit', title: 'İşlem Geçmişi', text: 'Değiştirilemeyen idari güvenlik olaylarını inceleyin.' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-500 ${cardClass}`}>
            <h2 className="font-bold">{item.title}</h2>
            <p className={`mt-2 text-sm leading-6 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
