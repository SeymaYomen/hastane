import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Stethoscope } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  getDoctorAppointmentDetail,
  saveDoctorVisitNote,
  type ClinicalNoteFormat,
  type DoctorAppointmentDetail,
} from '../services/doctor/visitService';
import { appointmentStatusLabels, statusBadgeClass } from '../types/appointmentStatus';
import PreVisitBriefPanel from '../components/doctor/PreVisitBriefPanel';
import PrescriptionSection from '../components/doctor/PrescriptionSection';
import LabOrderSection from '../components/doctor/LabOrderSection';

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const soapFields = [
  { key: 'subjective', letter: 'S', label: 'Subjective', help: 'Hastanın anlattıkları / yakınmalar' },
  { key: 'objective', letter: 'O', label: 'Objective', help: 'Muayene bulguları / mevcut objektif bilgiler' },
  { key: 'assessment', letter: 'A', label: 'Assessment', help: 'Doktorun klinik değerlendirmesi' },
  { key: 'plan', letter: 'P', label: 'Plan', help: 'Doktorun planı' },
] as const;

const DoctorAppointmentDetailPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [detail, setDetail] = useState<DoctorAppointmentDetail | null>(null);
  const [noteFormat, setNoteFormat] = useState<ClinicalNoteFormat>('free_text');
  const [clinicalNote, setClinicalNote] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!appointmentId) { setLoading(false); return undefined; }
    void getDoctorAppointmentDetail(appointmentId).then((data) => {
      if (!mounted) return;
      setDetail(data);
      if (data) {
        setNoteFormat(data.note_format ?? 'free_text');
        setClinicalNote(data.clinical_note ?? '');
        setSubjective(data.subjective ?? '');
        setObjective(data.objective ?? '');
        setAssessment(data.assessment ?? '');
        setPlan(data.plan ?? '');
        setFollowUpRequired(data.follow_up_required);
        setFollowUpDate(data.follow_up_date ?? '');
        setFollowUpNote(data.follow_up_note ?? '');
      }
    }).catch((loadError) => {
      console.error('Muayene detayı yüklenemedi:', loadError);
      if (mounted) setError('Muayene detayı yüklenirken bir hata oluştu.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [appointmentId]);

  const changeFormat = (next: ClinicalNoteFormat) => {
    if (next === noteFormat) return;
    const hasCurrentContent = noteFormat === 'free_text'
      ? Boolean(clinicalNote.trim())
      : Boolean(subjective.trim() || objective.trim() || assessment.trim() || plan.trim());
    if (hasCurrentContent && !window.confirm('Not türünü değiştirmek mevcut klinik not yapısını değiştirebilir. Devam edilsin mi?')) return;
    setError('');
    setNoteFormat(next);
  };

  const save = async (markCompleted: boolean) => {
    if (!appointmentId || !detail || saving || ['cancelled', 'no_show'].includes(detail.appointment_status)) return;
    if (noteFormat === 'soap' && ![subjective, objective, assessment, plan].some((value) => value.trim())) {
      setError('SOAP kaydı için en az bir alan doldurun.');
      return;
    }
    if (markCompleted && noteFormat === 'free_text' && !clinicalNote.trim()) {
      setError('Muayeneyi tamamlamak için doktor muayene notu gereklidir.');
      return;
    }
    if (markCompleted && !window.confirm('Muayene kaydedilecek ve tamamlandı olarak işaretlenecek. Devam edilsin mi?')) return;

    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await saveDoctorVisitNote({
        appointmentId, clinicalNote, noteFormat, subjective, objective,
        assessment, plan, followUpRequired,
        followUpDate: followUpDate || null,
        followUpNote: followUpNote || null,
        markCompleted,
      });
      setDetail((current) => current ? {
        ...current,
        appointment_status: result.appointment_status,
        visit_note_id: result.visit_note_id,
        note_format: noteFormat,
        clinical_note: noteFormat === 'free_text' ? clinicalNote : '',
        subjective: noteFormat === 'soap' ? subjective || null : null,
        objective: noteFormat === 'soap' ? objective || null : null,
        assessment: noteFormat === 'soap' ? assessment || null : null,
        plan: noteFormat === 'soap' ? plan || null : null,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? followUpDate || null : null,
        follow_up_note: followUpRequired ? followUpNote || null : null,
        visit_updated_at: result.updated_at,
      } : current);
      setSuccess(markCompleted ? 'Muayene kaydedildi ve tamamlandı.' : 'Değişiklikler kaydedildi.');
    } catch (saveError) {
      console.error('Muayene kaydı kaydedilemedi:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Muayene kaydı kaydedilemedi.');
    } finally { setSaving(false); }
  };

  const handleSubmit = (event: FormEvent) => { event.preventDefault(); void save(false); };
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-slate-600 dark:text-slate-300">Muayene detayı yükleniyor...</div>;
  if (!detail) return <div className="mx-auto max-w-3xl px-4 py-10"><p>Randevu bulunamadı veya erişim yetkiniz yok.</p>{error && <p className="mt-3 text-rose-600">{error}</p>}<Link to="/doctor" className="mt-5 inline-flex text-cyan-700">← Doktor Paneline Dön</Link></div>;

  const locked = ['cancelled', 'no_show'].includes(detail.appointment_status);
  const completed = detail.appointment_status === 'completed';
  const soapValues = { subjective, objective, assessment, plan };
  const setSoapValue = { subjective: setSubjective, objective: setObjective, assessment: setAssessment, plan: setPlan };

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <Link to="/doctor" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Doktor Paneline Dön</Link>
    <header className="mt-5 flex items-center gap-3"><div className="rounded-xl bg-cyan-600 p-3 text-white"><Stethoscope className="h-6 w-6" /></div><div><p className="text-sm text-cyan-600">Doktor Paneli</p><h1 className="text-2xl font-bold">Muayene Detayı</h1></div></header>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-semibold">{detail.patient_name}</h2><div className="mt-2 flex gap-4 text-sm text-slate-500"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(detail.appointment_date)}</span><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{detail.appointment_time.slice(0, 5)}</span></div></div><span className={`h-fit rounded-full px-3 py-1 text-xs ${statusBadgeClass[detail.appointment_status]}`}>{appointmentStatusLabels[detail.appointment_status]}</span></div>{detail.appointment_notes && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">{detail.appointment_notes}</p>}</section>
    {locked && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">İptal veya gelmedi durumundaki randevuların klinik kaydı düzenlenemez.</p>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {success && <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</p>}
    <PreVisitBriefPanel appointmentId={detail.appointment_id} />
    <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
      <fieldset disabled={locked || saving}><legend className="font-semibold">Not Türü</legend><div className="mt-3 inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">{(['free_text', 'soap'] as const).map((format) => <button key={format} type="button" onClick={() => changeFormat(format)} className={`rounded-lg px-4 py-2 text-sm font-medium ${noteFormat === format ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{format === 'free_text' ? 'Serbest Not' : 'SOAP'}</button>)}</div></fieldset>
      {noteFormat === 'free_text' ? <div><label htmlFor="clinical-note" className="font-semibold">Doktor Muayene Notu</label><p id="clinical-note-help" className="mt-1 text-sm text-slate-500">Doktora özel klinik kayıttır; hastaya gösterilmez.</p><textarea id="clinical-note" aria-describedby="clinical-note-help" maxLength={10000} rows={8} disabled={locked || saving} value={clinicalNote} onChange={(event) => { setError(''); setClinicalNote(event.target.value); }} className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 dark:border-slate-700" /></div> : <div className="grid gap-5">{soapFields.map((field) => <div key={field.key}><label htmlFor={`soap-${field.key}`} className="font-semibold"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{field.letter}</span>{field.label}</label><p id={`soap-${field.key}-help`} className="mt-1 text-sm text-slate-500">{field.help}</p><textarea id={`soap-${field.key}`} aria-describedby={`soap-${field.key}-help`} maxLength={5000} rows={4} disabled={locked || saving} value={soapValues[field.key]} onChange={(event) => { setError(''); setSoapValue[field.key](event.target.value); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 dark:border-slate-700" /></div>)}</div>}
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={followUpRequired} disabled={locked || saving} onChange={(event) => setFollowUpRequired(event.target.checked)} className="h-5 w-5 rounded text-cyan-600" />Kontrol gerekli</label>{followUpRequired && <div className="mt-4 grid gap-4"><label className="text-sm">Kontrol tarihi<input type="date" min={detail.appointment_date} value={followUpDate} disabled={locked || saving} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Hastaya gösterilecek kontrol notu<textarea maxLength={2000} rows={4} value={followUpNote} disabled={locked || saving} onChange={(event) => setFollowUpNote(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label></div>}</div>
      {!locked && <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="submit" disabled={saving} className="rounded-lg border border-cyan-600 px-5 py-2.5 font-medium text-cyan-700 disabled:opacity-50 dark:text-cyan-300">{saving ? 'Kaydediliyor...' : completed ? 'Değişiklikleri Kaydet' : 'Taslağı Kaydet'}</button>{detail.appointment_status === 'in_progress' && <button type="button" disabled={saving} onClick={() => void save(true)} className="rounded-lg bg-cyan-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">Kaydet ve Muayeneyi Tamamla</button>}</div>}
    </form>
    {['in_progress', 'completed'].includes(detail.appointment_status) && <LabOrderSection appointmentId={detail.appointment_id} />}
    {completed && <PrescriptionSection appointmentId={detail.appointment_id} />}
  </div>;
};

export default DoctorAppointmentDetailPage;
