import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const DoctorAppointmentsPage = () => {
  const [items, setItems] = useState<DoctorAppointment[]>([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
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
    (!status || item.appointment_status === status) &&
    item.patient_name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header><p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Randevular</p><h1 className="text-3xl font-bold text-slate-950 dark:text-white">Randevu yönetimi</h1></header>
      <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-3">
        <label className="text-sm">Tarih<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label>
        <label className="text-sm">Durum<select value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus | '')} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="">Tümü</option>{Object.entries(appointmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm">Hasta ara<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hasta adı" className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label>
      </section>
      {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900"><tr>{['Hasta', 'Tarih', 'Saat', 'Durum', 'Aksiyon'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{filtered.map((item) => {
            const isToday = item.appointment_date === today;
            const isPast = item.appointment_date < today;
            const terminal = ['completed', 'cancelled', 'no_show'].includes(item.appointment_status);
            return <tr key={item.appointment_id}>
              <td className="px-4 py-4 font-medium">{item.patient_name}</td>
              <td className="px-4 py-4">{new Date(`${item.appointment_date}T00:00:00`).toLocaleDateString('tr-TR')}</td>
              <td className="px-4 py-4">{item.appointment_time.slice(0, 5)}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span></td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2">
                {item.appointment_status === 'pending' && !isPast && <button disabled={updating === item.appointment_id} onClick={() => void changeStatus(item, 'confirmed')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-white disabled:opacity-50">Onayla</button>}
                {item.appointment_status === 'confirmed' && isToday && <button disabled={updating === item.appointment_id} onClick={() => void changeStatus(item, 'in_progress')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-white disabled:opacity-50">Muayeneyi Başlat</button>}
                {item.appointment_status === 'confirmed' && isPast && <button disabled={updating === item.appointment_id} onClick={() => void changeStatus(item, 'no_show', true)} className="rounded-lg border border-rose-500 px-3 py-1.5 text-rose-600 disabled:opacity-50">Gelmedi</button>}
                <Link to={`/doctor/appointment/${item.appointment_id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700">{item.appointment_status === 'in_progress' ? 'Muayeneye Devam Et' : terminal ? 'Görüntüle' : 'Muayeneyi Aç'}</Link>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-slate-500">Filtrelere uygun randevu bulunamadı.</p>}
      </div>
    </div>
  );
};

export default DoctorAppointmentsPage;
