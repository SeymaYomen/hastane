import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileHeart,
  Pill,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyNotifications, type AppNotification } from '../../services/notifications/notificationService';
import { getNextPatientAppointment, type PatientHomeAppointment } from '../../services/patient/homeService';
import { appointmentStatusLabels } from '../../types/appointmentStatus';
import { BentoCard, HomeIntro, InlineState, type HomeTheme } from './HomePrimitives';

type Loadable<T> = { value: T; loading: boolean; error: boolean };
const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
}).format(new Date(`${value}T12:00:00`));

export const PatientHomeDashboard = ({ theme }: { theme: HomeTheme }) => {
  const [appointment, setAppointment] = useState<Loadable<PatientHomeAppointment | null>>({ value: null, loading: true, error: false });
  const [notifications, setNotifications] = useState<Loadable<AppNotification[]>>({ value: [], loading: true, error: false });
  const isHighContrast = theme === 'high-contrast';

  useEffect(() => {
    let active = true;
    getNextPatientAppointment()
      .then((value) => active && setAppointment({ value, loading: false, error: false }))
      .catch(() => active && setAppointment({ value: null, loading: false, error: true }));
    getMyNotifications(3)
      .then((value) => active && setNotifications({ value, loading: false, error: false }))
      .catch(() => active && setNotifications({ value: [], loading: false, error: true }));
    return () => { active = false; };
  }, []);

  const shortcutClass = `group rounded-2xl border p-4 font-semibold shadow-sm motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${isHighContrast ? 'border-white bg-black text-white hover:bg-white/10' : 'border-slate-200/80 bg-white/50 hover:border-cyan-400 dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-cyan-400/60'}`;
  const secondaryActionClass = `flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-safe:transition ${isHighContrast ? 'border-white text-white hover:bg-white/10' : 'border-slate-300 text-slate-800 hover:border-cyan-400 hover:bg-cyan-50 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/[0.06]'}`;

  return (
    <>
      <HomeIntro eyebrow="Hasta ana sayfası" title="Bakım planınız, tek bakışta." description="Yaklaşan randevunuzu görün, güncel bildirimlerinizi takip edin ve sağlık alanınıza hızlıca ulaşın." />
      <div className="grid gap-4 lg:grid-cols-3">
        <BentoCard theme={theme} className="relative overflow-hidden lg:col-span-2">
          <p className={`text-xs font-bold uppercase tracking-widest ${isHighContrast ? 'text-white' : 'text-cyan-600 dark:text-cyan-300'}`}>En yakın randevu</p>
          <div className="relative z-10 mt-5">
            {appointment.loading && <InlineState>Randevu bilgisi yükleniyor…</InlineState>}
            {appointment.error && <InlineState error>Randevu bilgisi şu anda alınamadı.</InlineState>}
            {!appointment.loading && !appointment.error && !appointment.value && (
              <div>
                <InlineState>Henüz yaklaşan randevunuz yok.</InlineState>
                <Link to="/appointment" className="mt-4 inline-flex rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">Randevu Al</Link>
              </div>
            )}
            {appointment.value && (
              <div className="max-w-xl sm:pr-24">
                <h2 className="text-2xl font-black sm:text-3xl">{appointment.value.department}</h2>
                <p className={`mt-2 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{appointment.value.doctorName}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className={`text-base font-bold sm:text-lg ${isHighContrast ? 'text-white' : 'text-cyan-800 dark:text-cyan-100'}`}>{formatDate(appointment.value.date)} · {appointment.value.time.slice(0, 5)}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-slate-500/10 text-slate-700 dark:border-white/15 dark:text-slate-200'}`}>{appointmentStatusLabels[appointment.value.status]}</span>
                </div>
                <Link to="/my-appointments" className={`mt-6 inline-flex rounded-lg text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}`}>Randevu ayrıntıları</Link>
              </div>
            )}
          </div>
          {appointment.value && !isHighContrast && (
            <div aria-hidden="true" className="pointer-events-none absolute bottom-5 right-6 hidden h-24 w-24 items-center justify-center rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.045] text-cyan-500/30 sm:flex">
              <CalendarDays className="h-10 w-10" />
            </div>
          )}
        </BentoCard>

        <BentoCard theme={theme} className="flex flex-col">
          <div className="flex items-center gap-2"><Bell aria-hidden="true" className="h-5 w-5 text-cyan-500" /><h2 className="font-bold">Son bildirimler</h2></div>
          <div className="mt-4 flex-1 space-y-2">
            {notifications.loading && <InlineState>Bildirimler yükleniyor…</InlineState>}
            {notifications.error && <InlineState error>Bildirimler şu anda alınamadı.</InlineState>}
            {!notifications.loading && !notifications.error && notifications.value.length === 0 && <InlineState>Henüz bir bildiriminiz yok.</InlineState>}
            {notifications.value.map((item) => (
              <div key={item.id} className={`rounded-xl border p-3 text-sm ${isHighContrast ? 'border-white bg-black' : item.is_read ? 'border-transparent border-b-slate-200 dark:border-b-white/10' : 'border-cyan-300/60 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-500/[0.08]'}`}>
                <div className="flex items-start gap-2">
                  {!item.is_read && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />}
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p>{!item.is_read && <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isHighContrast ? 'border-white text-white' : 'border-cyan-400/60 text-cyan-700 dark:text-cyan-200'}`}>Yeni</span>}</div><p className={`mt-1 line-clamp-2 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.message}</p></div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/notifications" className={`mt-4 inline-flex w-fit text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}`}>Tüm bildirimler</Link>
        </BentoCard>

        <BentoCard theme={theme} className="h-full lg:col-span-2">
          <h2 className="text-lg font-bold">Sağlık alanım</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link to="/health-record" className={shortcutClass}><FileHeart aria-hidden="true" className="mb-3 h-6 w-6 text-teal-500 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />Sağlık kayıtları</Link>
            <Link to="/health-record" className={shortcutClass}><Pill aria-hidden="true" className="mb-3 h-6 w-6 text-blue-500 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />Reçeteler</Link>
            <Link to="/health-record" className={shortcutClass}><ClipboardList aria-hidden="true" className="mb-3 h-6 w-6 text-cyan-500 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />Tetkik ve belgeler</Link>
          </div>
        </BentoCard>

        <BentoCard theme={theme} className="h-full">
          <h2 className="text-lg font-bold">Hızlı işlemler</h2>
          <div className="mt-4 space-y-3">
            <Link to="/appointment" className="flex min-h-11 items-center gap-3 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-safe:transition"><CalendarPlus aria-hidden="true" className="h-5 w-5" />Yeni Randevu</Link>
            <Link to="/my-appointments" className={secondaryActionClass}><CalendarDays aria-hidden="true" className="h-5 w-5 text-cyan-500" />Randevularım</Link>
            <Link to="/notifications" className={secondaryActionClass}><Bell aria-hidden="true" className="h-5 w-5 text-cyan-500" />Bildirimler</Link>
          </div>
        </BentoCard>
      </div>
    </>
  );
};
