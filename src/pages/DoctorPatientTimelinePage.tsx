import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getDoctorPatientTimeline, type PatientTimelineItem } from '../services/doctor/workspaceService';
import { appointmentStatusLabels, statusBadgeClass } from '../types/appointmentStatus';

const DoctorPatientTimelinePage = () => {
  const { patientId } = useParams();
  const [items, setItems] = useState<PatientTimelineItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    void getDoctorPatientTimeline(patientId).then(setItems).catch((loadError) => {
      console.error(loadError); setError('Hasta geçmişi yüklenemedi.');
    }).finally(() => setLoading(false));
  }, [patientId]);

  return <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
    <Link to="/doctor/patients" className="text-sm text-cyan-700 dark:text-cyan-300">← Hastalara dön</Link>
    <h1 className="mt-4 text-3xl font-bold">Hasta zaman çizelgesi</h1>
    <p className="mt-2 text-sm text-slate-500">Yalnızca sizin bu hastayla olan randevu ve muayene kayıtlarınız.</p>
    {error && <p className="mt-5 text-rose-600">{error}</p>}
    <div className="mt-7 border-l-2 border-cyan-200 pl-6 dark:border-cyan-900">{items.map((item) => {
      const hasClinicalNote = item.note_format === 'soap'
        ? Boolean(item.subjective || item.objective || item.assessment || item.plan)
        : Boolean(item.clinical_note);
      const isExpanded = expanded === item.appointment_id;
      return <article key={item.appointment_id} className="relative mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <span className="absolute -left-[31px] top-6 h-3 w-3 rounded-full bg-cyan-500" />
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{new Date(`${item.appointment_date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</h2><p className="text-sm text-slate-500">{item.department} · {item.appointment_time.slice(0, 5)}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs ${statusBadgeClass[item.appointment_status]}`}>{appointmentStatusLabels[item.appointment_status]}</span></div>
        {hasClinicalNote && <div className="mt-4"><button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : item.appointment_id)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-slate-900"><span>{item.note_format === 'soap' ? 'SOAP Klinik Notu' : 'Serbest Klinik Not'}</span><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>{isExpanded && <div className="mt-2 space-y-4 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">{item.note_format === 'free_text' ? <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{item.clinical_note}</p> : ([['Subjective', item.subjective], ['Objective', item.objective], ['Assessment', item.assessment], ['Plan', item.plan]] as const).filter(([, value]) => value).map(([label, value]) => <section key={label}><h3 className="font-semibold text-cyan-700 dark:text-cyan-300">{label}</h3><p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{value}</p></section>)}</div>}</div>}
        {item.follow_up_required && <div className="mt-3 text-sm text-violet-700 dark:text-violet-300"><p className="font-medium">Kontrol planı{item.follow_up_date ? ` · ${new Date(`${item.follow_up_date}T00:00:00`).toLocaleDateString('tr-TR')}` : ''}</p>{item.follow_up_note && <p className="mt-1 whitespace-pre-wrap">{item.follow_up_note}</p>}</div>}
        <Link to={`/doctor/appointment/${item.appointment_id}`} className="mt-4 inline-flex text-sm font-medium text-cyan-700 dark:text-cyan-300">Muayeneyi Aç →</Link>
      </article>;
    })}{!loading && items.length === 0 && <p className="text-slate-500">Bu hasta için erişilebilir kayıt bulunamadı.</p>}</div>
  </div>;
};

export default DoctorPatientTimelinePage;
