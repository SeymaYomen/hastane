import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import type { DoctorProfile } from '../services/doctor/doctorProfileService';
import {
  getDoctorAppointments,
  toLocalDate,
  type DoctorAppointment,
} from '../services/doctor/workspaceService';
import { appointmentStatusLabels, statusBadgeClass } from '../types/appointmentStatus';
import { useTheme } from '../contexts/ThemeContext';

const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const selectNextPatient = (
  appointments: DoctorAppointment[],
  currentTime: string,
) => appointments.find((item) => item.appointment_status === 'in_progress')
  ?? appointments.find((item) =>
    item.appointment_status === 'confirmed'
    && item.appointment_time.slice(0, 5) >= currentTime
  )
  ?? null;

const DoctorDashboard = () => {
  const { doctorProfile } = useOutletContext<{ doctorProfile: DoctorProfile | null }>();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';
  const today = toLocalDate(new Date());

  useEffect(() => {
    void getDoctorAppointments(today, today)
      .then(setAppointments)
      .catch((loadError) => {
        console.error(loadError);
        setError('Bugünkü program yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [today]);

  const nextPatient = useMemo(
    () => selectNextPatient(appointments, getCurrentTime()),
    [appointments],
  );
  const cards = [
    { label: 'Bugünkü Randevu', value: appointments.length, icon: CalendarDays, color: 'text-cyan-600 dark:text-cyan-300' },
    { label: 'Bekleyen', value: appointments.filter((item) => ['pending', 'confirmed'].includes(item.appointment_status)).length, icon: Clock3, color: 'text-amber-600 dark:text-amber-300' },
    { label: 'Tamamlanan', value: appointments.filter((item) => item.appointment_status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'İptal / Gelmedi', value: appointments.filter((item) => ['cancelled', 'no_show'].includes(item.appointment_status)).length, icon: XCircle, color: 'text-rose-600 dark:text-rose-300' },
  ];

  return (
    <div className={`mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-8 ${isHighContrast ? '[&_article]:border-white [&_article]:bg-black [&_h1]:text-white [&_h2]:text-white [&_p]:text-white' : ''}`}>
      <header>
        <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Genel Bakış</p>
        <h1 className="mt-1 break-words text-3xl font-bold text-slate-950 dark:text-white">
          Merhaba, {doctorProfile?.title || 'Dr.'} {doctorProfile?.full_name || ''}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
              <span className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><Icon className={`h-5 w-5 ${color}`} /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{loading ? '—' : value}</p>
          </article>
        ))}
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100">{error}</p>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`min-w-0 rounded-2xl border p-5 shadow-sm ${isHighContrast ? 'border-white bg-black' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Bugünün Programı</h2>
            <Link to="/doctor/calendar" className="rounded-lg text-sm font-medium text-cyan-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300">Takvimi aç</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {!loading && appointments.length === 0 && (
              <div className="flex flex-col items-center px-4 py-7 text-center">
                <span className={`rounded-2xl border p-3 ${isHighContrast ? 'border-white bg-black' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}><CalendarDays className="h-7 w-7 text-cyan-600 dark:text-cyan-300" /></span>
                <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">Bugün için randevu bulunmuyor.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link to="/doctor/calendar" className="rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">Takvimi Aç</Link>
                  <Link to="/doctor/appointments" className={`rounded-lg border px-3.5 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white text-white hover:bg-white/10' : 'border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-900'}`}>Randevuları Gör</Link>
                </div>
              </div>
            )}
            {appointments.map((item) => (
              <div key={item.appointment_id} className="grid gap-3 py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto_auto] sm:items-center">
                <span className={`text-lg font-bold tabular-nums ${isHighContrast ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{item.appointment_time.slice(0, 5)}</span>
                <p className="min-w-0 truncate font-medium text-slate-900 dark:text-white">{item.patient_name}</p>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span>
                <Link to={`/doctor/appointment/${item.appointment_id}`} className="w-fit rounded-lg border border-cyan-600 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-950/30">
                  {item.appointment_status === 'in_progress' ? 'Muayeneye Devam Et' : 'Muayeneyi Aç'}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <article className="rounded-2xl border border-cyan-300 bg-cyan-50/60 p-5 shadow-sm dark:border-cyan-800 dark:bg-cyan-950/20">
            <div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-cyan-700 dark:text-cyan-300" /><h2 className="font-semibold text-slate-950 dark:text-white">Sonraki Hasta</h2></div>
            {nextPatient ? <div className="mt-4"><p className="text-lg font-semibold text-slate-950 dark:text-white">{nextPatient.patient_name}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{nextPatient.appointment_time.slice(0, 5)} · {appointmentStatusLabels[nextPatient.appointment_status]}</p><Link to={`/doctor/appointment/${nextPatient.appointment_id}`} className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">{nextPatient.appointment_status === 'in_progress' ? 'Muayeneye Devam Et' : 'Muayeneyi Aç'}</Link></div> : <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">Bugün sırada onaylanmış veya devam eden hasta bulunmuyor.</p>}
          </article>

          <article className="rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500 dark:bg-amber-950/20">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-300" /><h2 className="font-semibold text-slate-950 dark:text-white">Klinik Asistan</h2><span className="rounded-full border border-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">AI</span></div>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">Klinik Asistan, uygun randevunun ayrıntısında doktor isteğiyle kullanılabilir.</p>
            {nextPatient ? <Link to={`/doctor/appointment/${nextPatient.appointment_id}`} className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">Klinik Asistanı Aç</Link> : <><p className="mt-3 text-sm text-slate-700 dark:text-slate-200">Klinik Asistan, onaylanmış veya devam eden randevularda kullanılabilir.</p><Link to="/doctor/appointments" className="mt-4 inline-flex rounded-lg border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-200 dark:hover:bg-amber-950/40">Randevuları Aç</Link></>}
          </article>
        </div>
      </section>
    </div>
  );
};

export default DoctorDashboard;
