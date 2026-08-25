import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDoctorAppointments, toLocalDate, type DoctorAppointment } from '../../services/doctor/workspaceService';
import { BentoCard, HomeIntro, InlineState, type HomeTheme } from './HomePrimitives';

export const DoctorHomeDashboard = ({ theme }: { theme: HomeTheme }) => {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const today = toLocalDate(new Date());
    getDoctorAppointments(today, today).then((rows) => { if (active) { setAppointments(rows); setLoading(false); } }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const relevant = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return appointments.find((item) => item.appointment_status === 'in_progress') ?? appointments.find((item) => {
      const [hour, minute] = item.appointment_time.split(':').map(Number);
      return ['pending', 'confirmed'].includes(item.appointment_status) && hour * 60 + minute >= currentMinutes;
    }) ?? null;
  }, [appointments]);
  const waiting = appointments.filter((item) => ['pending', 'confirmed'].includes(item.appointment_status)).length;

  return <><HomeIntro eyebrow="Doktor çalışma alanı" title="Bugünün klinik akışı hazır." description="Günün randevularını ve sıradaki hastayı gerçek çalışma verileriniz üzerinden takip edin." />
    {loading && <InlineState>Bugünün çalışma planı yükleniyor…</InlineState>}
    {error && <InlineState error>Çalışma planı şu anda alınamadı.</InlineState>}
    {!loading && !error && <div className="grid gap-4 lg:grid-cols-3">
      <BentoCard theme={theme} className="lg:col-span-2"><p className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-300">Sıradaki klinik adım</p>{relevant ? <div className="mt-5"><h2 className="text-2xl font-black">{relevant.patient_name}</h2><p className="mt-2 flex items-center gap-2 text-slate-600 dark:text-slate-300"><Clock3 className="h-4 w-4" />{relevant.appointment_time.slice(0, 5)}</p><div className="mt-6 flex flex-wrap gap-3"><Link to={`/doctor/appointment/${relevant.appointment_id}`} className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white hover:bg-cyan-700">Randevuyu aç</Link><Link to={`/doctor/appointment/${relevant.appointment_id}`} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-2.5 font-semibold text-amber-700 hover:bg-amber-400/20 dark:text-amber-200"><Sparkles className="h-4 w-4" />Klinik Asistan</Link></div></div> : <InlineState>Bugün için sırada aktif bir randevu bulunmuyor.</InlineState>}</BentoCard>
      <BentoCard theme={theme}><CalendarDays className="h-6 w-6 text-cyan-500" /><p className="mt-4 text-3xl font-black">{appointments.length}</p><p className="text-sm text-slate-600 dark:text-slate-300">Bugünkü toplam randevu</p></BentoCard>
      <BentoCard theme={theme}><Users className="h-6 w-6 text-blue-500" /><p className="mt-4 text-3xl font-black">{waiting}</p><p className="text-sm text-slate-600 dark:text-slate-300">Bekleyen veya onaylı</p></BentoCard>
      <BentoCard theme={theme}><p className="text-sm text-slate-600 dark:text-slate-300">Tamamlanan</p><p className="mt-2 text-3xl font-black text-teal-600 dark:text-teal-300">{appointments.filter((item) => item.appointment_status === 'completed').length}</p></BentoCard>
      <BentoCard theme={theme}><p className="text-sm text-slate-600 dark:text-slate-300">Gelmedi</p><p className="mt-2 text-3xl font-black">{appointments.filter((item) => item.appointment_status === 'no_show').length}</p><Link to="/doctor/appointments" className="mt-4 inline-flex text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">Tüm randevular</Link></BentoCard>
    </div>}
  </>;
};
