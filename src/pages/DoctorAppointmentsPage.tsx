import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  getDoctorAppointments,
  toLocalDate,
  updateDoctorAppointmentStatus,
  type DoctorAppointment,
} from '../services/doctor/workspaceService';
import {
  appointmentStatusLabels,
  statusBadgeClass,
  type AppointmentStatus,
} from '../types/appointmentStatus';

const terminalStatuses: AppointmentStatus[] = ['completed', 'cancelled', 'no_show'];
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR');

type AppointmentActionsProps = {
  item: DoctorAppointment;
  today: string;
  updating: string | null;
  isHighContrast: boolean;
  onChangeStatus: (
    item: DoctorAppointment,
    next: AppointmentStatus,
    needsConfirm?: boolean,
  ) => Promise<void>;
};

const AppointmentActions = ({ item, today, updating, isHighContrast, onChangeStatus }: AppointmentActionsProps) => {
  const isToday = item.appointment_date === today;
  const isPast = item.appointment_date < today;
  const isTerminal = terminalStatuses.includes(item.appointment_status);
  const detailLabel = item.appointment_status === 'in_progress'
    ? 'Muayeneye Devam Et'
    : isTerminal || (item.appointment_status === 'confirmed' && isPast)
      ? 'Görüntüle'
      : 'Muayeneyi Aç';
  const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1.5';

  return (
    <div className="flex flex-wrap gap-2">
      {item.appointment_status === 'pending' && !isPast && (
        <button disabled={updating === item.appointment_id} onClick={() => void onChangeStatus(item, 'confirmed')} className={`${actionClass} bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800`}>Onayla</button>
      )}
      {item.appointment_status === 'confirmed' && isToday && (
        <button disabled={updating === item.appointment_id} onClick={() => void onChangeStatus(item, 'in_progress')} className={`${actionClass} bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800`}>Muayeneyi Başlat</button>
      )}
      {item.appointment_status === 'confirmed' && isPast && (
        <button disabled={updating === item.appointment_id} onClick={() => void onChangeStatus(item, 'no_show', true)} className={`${actionClass} border border-rose-500 ${isHighContrast ? 'text-white hover:bg-white/10' : 'text-rose-700 hover:bg-rose-50 active:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-950/30'}`}>Gelmedi</button>
      )}
      <Link to={`/doctor/appointment/${item.appointment_id}`} className={`${actionClass} border ${isHighContrast ? 'border-white text-white hover:bg-white/10' : 'border-slate-400 text-slate-800 hover:bg-slate-100 active:bg-slate-200 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800'}`}>{detailLabel}</Link>
    </div>
  );
};

const DoctorAppointmentsPage = () => {
  const [items, setItems] = useState<DoctorAppointment[]>([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';
  const today = toLocalDate(new Date());

  useEffect(() => {
    const start = date || '2000-01-01';
    const end = date || '2100-12-31';
    void getDoctorAppointments(start, end).then(setItems).catch((loadError) => {
      console.error(loadError);
      setError('Randevular yüklenemedi.');
    });
  }, [date]);

  const filtered = useMemo(() => items.filter((item) =>
    (!status || item.appointment_status === status)
    && item.patient_name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
  ), [items, search, status]);

  const changeStatus = async (
    item: DoctorAppointment,
    next: AppointmentStatus,
    needsConfirm = false,
  ) => {
    if (updating || (needsConfirm && !window.confirm(`Randevu “${appointmentStatusLabels[next]}” durumuna geçirilsin mi?`))) return;
    setUpdating(item.appointment_id);
    setError('');
    try {
      await updateDoctorAppointmentStatus(item.appointment_id, next);
      setItems((current) => current.map((row) =>
        row.appointment_id === item.appointment_id
          ? { ...row, appointment_status: next }
          : row
      ));
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : 'Durum güncellenemedi.');
    } finally {
      setUpdating(null);
    }
  };

  const surfaceClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';
  const fieldClass = `mt-1 block min-h-11 w-full rounded-lg border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-transparent dark:border-slate-700 dark:bg-slate-950'}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header>
        <p className={`text-sm font-medium ${isHighContrast ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}`}>Randevular</p>
        <h1 className={`text-3xl font-bold ${isHighContrast ? 'text-white' : 'text-slate-950 dark:text-white'}`}>Randevu yönetimi</h1>
      </header>

      <section className={`mt-6 grid gap-4 rounded-2xl border p-4 md:grid-cols-3 ${surfaceClass}`}>
        <label className="text-sm font-medium">Tarih<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-medium">Durum<select value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus | '')} className={fieldClass}><option value="">Tümü</option>{Object.entries(appointmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium">Hasta ara<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hasta adı" className={fieldClass} /></label>
      </section>

      {error && <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="mt-6 space-y-4 md:hidden">
        {filtered.map((item) => (
          <article key={item.appointment_id} className={`rounded-2xl border p-4 shadow-sm ${surfaceClass}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-words text-lg font-semibold">{item.patient_name}</h2>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span>
            </div>
            <dl className={`mt-4 grid grid-cols-2 gap-3 text-sm ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <div><dt className="font-medium">Tarih</dt><dd className="mt-1">{formatDate(item.appointment_date)}</dd></div>
              <div><dt className="font-medium">Saat</dt><dd className="mt-1 tabular-nums">{item.appointment_time.slice(0, 5)}</dd></div>
            </dl>
            <div className={`mt-5 border-t pt-4 ${isHighContrast ? 'border-white' : 'border-slate-200 dark:border-slate-800'}`}>
              <AppointmentActions item={item} today={today} updating={updating} isHighContrast={isHighContrast} onChangeStatus={changeStatus} />
            </div>
          </article>
        ))}
      </div>

      <div className={`mt-6 hidden overflow-x-auto rounded-2xl border md:block ${surfaceClass}`}>
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className={isHighContrast ? 'border-b border-white bg-black text-white' : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300'}><tr>{['Hasta', 'Tarih', 'Saat', 'Durum', 'Aksiyon'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody className={isHighContrast ? 'divide-y divide-white' : 'divide-y divide-slate-200 dark:divide-slate-800'}>
            {filtered.map((item) => <tr key={item.appointment_id}><td className="px-4 py-4 font-medium">{item.patient_name}</td><td className="px-4 py-4">{formatDate(item.appointment_date)}</td><td className="px-4 py-4">{item.appointment_time.slice(0, 5)}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span></td><td className="px-4 py-4"><AppointmentActions item={item} today={today} updating={updating} isHighContrast={isHighContrast} onChangeStatus={changeStatus} /></td></tr>)}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <p role="status" className={`mt-6 rounded-2xl border p-8 text-center ${surfaceClass}`}>Filtrelere uygun randevu bulunamadı.</p>}
    </div>
  );
};

export default DoctorAppointmentsPage;
