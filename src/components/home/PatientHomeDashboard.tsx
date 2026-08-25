import { useEffect, useState } from 'react';
import { Bell, CalendarPlus, ClipboardList, FileHeart, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyNotifications, type AppNotification } from '../../services/notifications/notificationService';
import { getNextPatientAppointment, type PatientHomeAppointment } from '../../services/patient/homeService';
import { appointmentStatusLabels } from '../../types/appointmentStatus';
import { BentoCard, HomeIntro, InlineState, type HomeTheme } from './HomePrimitives';

type Loadable<T> = { value: T; loading: boolean; error: boolean };
const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${value}T12:00:00`));

export const PatientHomeDashboard = ({ theme }: { theme: HomeTheme }) => {
  const [appointment, setAppointment] = useState<Loadable<PatientHomeAppointment | null>>({ value: null, loading: true, error: false });
  const [notifications, setNotifications] = useState<Loadable<AppNotification[]>>({ value: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    getNextPatientAppointment().then((value) => active && setAppointment({ value, loading: false, error: false })).catch(() => active && setAppointment({ value: null, loading: false, error: true }));
    getMyNotifications(3).then((value) => active && setNotifications({ value, loading: false, error: false })).catch(() => active && setNotifications({ value: [], loading: false, error: true }));
    return () => { active = false; };
  }, []);

  return (
    <>
      <HomeIntro eyebrow="Hasta ana sayfası" title="Bakım planınız, tek bakışta." description="Yaklaşan randevunuzu görün, güncel bildirimlerinizi takip edin ve sağlık alanınıza hızlıca ulaşın." />
      <div className="grid gap-4 lg:grid-cols-3">
        <BentoCard theme={theme} className="lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-300">En yakın randevu</p>
          <div className="mt-5">
            {appointment.loading && <InlineState>Randevu bilgisi yükleniyor…</InlineState>}
            {appointment.error && <InlineState error>Randevu bilgisi şu anda alınamadı.</InlineState>}
            {!appointment.loading && !appointment.error && !appointment.value && <InlineState>Yaklaşan aktif bir randevunuz bulunmuyor.</InlineState>}
            {appointment.value && <div><h2 className="text-2xl font-black">{appointment.value.department}</h2><p className="mt-1 text-slate-600 dark:text-slate-300">{appointment.value.doctorName}</p><div className="mt-5 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-cyan-700 dark:text-cyan-200">{formatDate(appointment.value.date)} · {appointment.value.time.slice(0, 5)}</span><span className="rounded-full bg-slate-500/10 px-3 py-1.5">{appointmentStatusLabels[appointment.value.status]}</span></div></div>}
          </div>
          <Link to="/my-appointments" className="mt-6 inline-flex font-semibold text-cyan-600 hover:underline dark:text-cyan-300">Tüm randevularım</Link>
        </BentoCard>
        <BentoCard theme={theme}>
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-cyan-500" /><h2 className="font-bold">Son bildirimler</h2></div>
          <div className="mt-4 space-y-3">
            {notifications.loading && <InlineState>Bildirimler yükleniyor…</InlineState>}
            {notifications.error && <InlineState error>Bildirimler şu anda alınamadı.</InlineState>}
            {!notifications.loading && !notifications.error && notifications.value.length === 0 && <InlineState>Henüz bir bildiriminiz yok.</InlineState>}
            {notifications.value.map((item) => <div key={item.id} className="border-b border-slate-200 pb-3 text-sm last:border-0 dark:border-white/10"><p className="font-semibold">{item.title}</p><p className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-300">{item.message}</p></div>)}
          </div>
          <Link to="/notifications" className="mt-4 inline-flex text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">Tüm bildirimler</Link>
        </BentoCard>
        <BentoCard theme={theme} className="lg:col-span-2"><h2 className="text-lg font-bold">Sağlık alanım</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Link to="/health-record" className="rounded-2xl bg-teal-500/10 p-4 font-semibold"><FileHeart className="mb-3 h-6 w-6 text-teal-500" />Sağlık kayıtları</Link><Link to="/health-record" className="rounded-2xl bg-blue-500/10 p-4 font-semibold"><Pill className="mb-3 h-6 w-6 text-blue-500" />Reçeteler</Link><Link to="/health-record" className="rounded-2xl bg-cyan-500/10 p-4 font-semibold"><ClipboardList className="mb-3 h-6 w-6 text-cyan-500" />Tetkik ve belgeler</Link></div></BentoCard>
        <BentoCard theme={theme}><h2 className="text-lg font-bold">Hızlı işlem</h2><Link to="/appointment" className="mt-4 flex items-center gap-3 rounded-2xl bg-cyan-600 p-4 font-semibold text-white hover:bg-cyan-700"><CalendarPlus className="h-5 w-5" />Yeni randevu al</Link></BentoCard>
      </div>
    </>
  );
};
