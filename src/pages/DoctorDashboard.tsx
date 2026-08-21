import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Sparkles, UserRoundCheck, XCircle } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import type { DoctorProfile } from '../services/doctor/doctorProfileService';
import { getDoctorAppointments, toLocalDate, type DoctorAppointment } from '../services/doctor/workspaceService';
import { appointmentStatusLabels, statusBadgeClass } from '../types/appointmentStatus';

const DoctorDashboard = () => {
  const { doctorProfile } = useOutletContext<{ doctorProfile: DoctorProfile | null }>();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = toLocalDate(new Date());

  useEffect(() => {
    void getDoctorAppointments(today, today).then(setAppointments).catch((loadError) => {
      console.error(loadError); setError('Bugünkü program yüklenemedi.');
    }).finally(() => setLoading(false));
  }, [today]);

  const nextPatient = useMemo(() => appointments.find((item) =>
    ['pending', 'confirmed', 'in_progress'].includes(item.appointment_status) &&
    item.appointment_time.slice(0, 5) >= new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  ), [appointments]);
  const cards = [
    { label: 'Bugünkü Randevu', value: appointments.length, icon: CalendarDays, color: 'text-cyan-600' },
    { label: 'Bekleyen', value: appointments.filter((a) => ['pending', 'confirmed'].includes(a.appointment_status)).length, icon: Clock3, color: 'text-amber-600' },
    { label: 'Tamamlanan', value: appointments.filter((a) => a.appointment_status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'İptal / Gelmedi', value: appointments.filter((a) => ['cancelled', 'no_show'].includes(a.appointment_status)).length, icon: XCircle, color: 'text-rose-600' },
  ];

  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-8">
    <header><p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Genel Bakış</p><h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Merhaba, {doctorProfile?.title || 'Dr.'} {doctorProfile?.full_name || ''}</h1><p className="mt-2 text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between"><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">{loading ? '—' : value}</p></article>)}</section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Bugünün Programı</h2><Link to="/doctor/calendar" className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Takvimi aç</Link></div><div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">{!loading && appointments.length === 0 && <p className="py-8 text-center text-slate-500">Bugün için randevu bulunmuyor.</p>}{appointments.map((item) => <div key={item.appointment_id} className="flex flex-wrap items-center gap-4 py-4"><span className="w-14 font-semibold text-slate-900 dark:text-white">{item.appointment_time.slice(0, 5)}</span><div className="min-w-0 flex-1"><p className="font-medium text-slate-900 dark:text-white">{item.patient_name}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span></div><Link to={`/doctor/appointment/${item.appointment_id}`} className="rounded-lg border border-cyan-600 px-3 py-2 text-sm font-medium text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300">Muayeneyi Aç</Link></div>)}</div></div>
      <div className="space-y-6"><article className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-900 dark:bg-cyan-950/20"><div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-cyan-600" /><h2 className="font-semibold text-slate-950 dark:text-white">Sonraki Hasta</h2></div>{nextPatient ? <div className="mt-4"><p className="text-lg font-semibold text-slate-950 dark:text-white">{nextPatient.patient_name}</p><p className="mt-1 text-sm text-slate-500">{nextPatient.appointment_time.slice(0, 5)} · {appointmentStatusLabels[nextPatient.appointment_status]}</p><Link to={`/doctor/appointment/${nextPatient.appointment_id}`} className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">Muayeneyi Aç</Link></div> : <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Bugün sırada bekleyen hasta bulunmuyor.</p>}</article><article className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/20"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><h2 className="font-semibold text-slate-950 dark:text-white">Klinik Asistan</h2><span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-200">Yakında</span></div><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Bu özellik henüz aktif değildir.</p></article></div>
    </section>
  </div>;
};
export default DoctorDashboard;
