import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Stethoscope } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  getDoctorAppointmentDetail,
  saveDoctorVisitNote,
  type DoctorAppointmentDetail,
} from '../services/doctor/visitService';
import { appointmentStatusLabels, statusBadgeClass } from '../types/appointmentStatus';

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const DoctorAppointmentDetailPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [detail, setDetail] = useState<DoctorAppointmentDetail | null>(null);
  const [clinicalNote, setClinicalNote] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      if (!appointmentId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getDoctorAppointmentDetail(appointmentId);
        if (!mounted) return;

        setDetail(data);
        if (data) {
          setClinicalNote(data.clinical_note ?? '');
          setFollowUpRequired(data.follow_up_required);
          setFollowUpDate(data.follow_up_date ?? '');
          setFollowUpNote(data.follow_up_note ?? '');
        }
      } catch (loadError) {
        console.error('Muayene detayı yüklenemedi:', loadError);
        if (mounted) setError('Muayene detayı yüklenirken bir hata oluştu.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  const save = async (markCompleted: boolean) => {
    if (!appointmentId || !detail || saving || ['cancelled', 'no_show'].includes(detail.appointment_status)) return;

    if (markCompleted && !window.confirm('Muayene kaydedilecek ve randevu tamamlandı olarak işaretlenecek. Devam edilsin mi?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const result = await saveDoctorVisitNote({
        appointmentId,
        clinicalNote,
        followUpRequired,
        followUpDate: followUpDate || null,
        followUpNote: followUpNote || null,
        markCompleted,
      });

      setDetail((current) => current ? {
        ...current,
        appointment_status: result.appointment_status,
        visit_note_id: result.visit_note_id,
        clinical_note: clinicalNote,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? followUpDate || null : null,
        follow_up_note: followUpRequired ? followUpNote || null : null,
        visit_updated_at: result.updated_at,
      } : current);
      setSuccess(markCompleted ? 'Muayene kaydedildi ve tamamlandı.' : 'Değişiklikler kaydedildi.');
    } catch (saveError) {
      console.error('Muayene kaydı kaydedilemedi:', saveError);
      const message = saveError instanceof Error ? saveError.message : 'Muayene kaydı kaydedilemedi.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-600 dark:text-slate-300">Muayene detayı yükleniyor...</div>;
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-700 dark:text-slate-200">Randevu bulunamadı veya bu randevuya erişim yetkiniz yok.</p>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Link to="/doctor" className="mt-6 inline-flex items-center gap-2 text-cyan-700 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-cyan-300">
            <ArrowLeft className="h-4 w-4" /> Doktor Paneline Dön
          </Link>
        </div>
      </div>
    );
  }

  const cancelled = ['cancelled', 'no_show'].includes(detail.appointment_status);
  const completed = detail.appointment_status === 'completed';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/doctor" className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> Doktor Paneline Dön
        </Link>

        <div className="mt-5 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-3 text-white"><Stethoscope className="h-6 w-6" /></div>
          <div><p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Doktor Paneli</p><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Muayene Detayı</h1></div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="appointment-summary">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 id="appointment-summary" className="text-xl font-semibold text-slate-900 dark:text-white">{detail.patient_name}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Randevu özeti</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass[detail.appointment_status]}`}>{appointmentStatusLabels[detail.appointment_status]}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(detail.appointment_date)}</span>
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{detail.appointment_time.slice(0, 5)}</span>
          </div>
          {detail.appointment_notes && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">{detail.appointment_notes}</p>}
        </section>

        {cancelled && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">İptal edilmiş randevuların muayene kaydı düzenlenemez.</div>}
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
        {success && <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label htmlFor="clinical-note" className="block font-semibold text-slate-900 dark:text-white">Doktor Muayene Notu</label>
            <p id="clinical-note-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bu alan doktorun klinik kaydıdır ve hasta takip ekranında doğrudan gösterilmez.</p>
            <textarea id="clinical-note" aria-describedby="clinical-note-help" maxLength={10000} rows={8} disabled={cancelled || saving} value={clinicalNote} onChange={(event) => setClinicalNote(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <label className="flex cursor-pointer items-center gap-3 font-semibold text-slate-900 dark:text-white">
              <input type="checkbox" checked={followUpRequired} disabled={cancelled || saving} onChange={(event) => setFollowUpRequired(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              Kontrol gerekli
            </label>
            {followUpRequired && (
              <div className="mt-5 grid gap-5">
                <div><label htmlFor="follow-up-date" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Kontrol tarihi</label><input id="follow-up-date" type="date" min={detail.appointment_date} disabled={cancelled || saving} value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-auto" /></div>
                <div><label htmlFor="follow-up-note" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Hastaya gösterilecek kontrol notu</label><textarea id="follow-up-note" maxLength={2000} rows={4} disabled={cancelled || saving} value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
              </div>
            )}
          </div>

          {!cancelled && <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="submit" disabled={saving} className="rounded-lg border border-cyan-600 px-5 py-2.5 font-medium text-cyan-700 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-300 dark:hover:bg-cyan-950/40">{saving ? 'Kaydediliyor...' : completed ? 'Değişiklikleri Kaydet' : 'Taslağı Kaydet'}</button>
            {detail.appointment_status === 'in_progress' && <button type="button" disabled={saving} onClick={() => void save(true)} className="rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-5 py-2.5 font-medium text-white hover:from-cyan-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60">Kaydet ve Muayeneyi Tamamla</button>}
          </div>}
        </form>
      </div>
    </div>
  );
};

export default DoctorAppointmentDetailPage;
