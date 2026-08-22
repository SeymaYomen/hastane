import { FormEvent, useEffect, useState } from 'react';
import { FileUp, FolderOpen } from 'lucide-react';
import {
  createPatientDocumentUploadIntent,
  getMyDocumentShareableAppointments,
  getMyMedicalDocuments,
  type DocumentShareableAppointment,
  type PatientMedicalDocument,
} from '../../services/patient/medicalDocumentService';
import {
  finalizeMedicalDocument,
  getMedicalDocumentSignedUrl,
  medicalDocumentCategoryLabels,
  uploadDocumentToSignedTarget,
  type MedicalDocumentCategory,
} from '../../services/medicalDocuments';

const MAX_BYTES = 10 * 1024 * 1024;
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const categories = Object.entries(medicalDocumentCategoryLabels) as [MedicalDocumentCategory, string][];
const formatDate = (value: string) => new Date(value).toLocaleString('tr-TR');
const appointmentLabel = (item: DocumentShareableAppointment) => `${new Date(`${item.appointment_date}T00:00:00`).toLocaleDateString('tr-TR')} · ${item.doctor_title ? `${item.doctor_title} ` : ''}${item.doctor_name} · ${item.department}`;

const MedicalDocumentsSection = ({ cardClass }: { cardClass: string }) => {
  const [documents, setDocuments] = useState<PatientMedicalDocument[]>([]);
  const [appointments, setAppointments] = useState<DocumentShareableAppointment[]>([]);
  const [category, setCategory] = useState<MedicalDocumentCategory>('lab_report');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [appointmentIds, setAppointmentIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = async () => setDocuments(await getMyMedicalDocuments());
  useEffect(() => {
    let mounted = true;
    void Promise.all([getMyMedicalDocuments(), getMyDocumentShareableAppointments()])
      .then(([nextDocuments, nextAppointments]) => { if (mounted) { setDocuments(nextDocuments); setAppointments(nextAppointments); } })
      .catch(() => { if (mounted) setError('Belge bilgileri yüklenemedi.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !file) return;
    if (!allowedTypes.includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size < 1 || file.size > MAX_BYTES) {
      setError('PDF, JPEG veya PNG biçiminde ve en fazla 10 MB bir dosya seçin.'); return;
    }
    setBusy(true); setError(''); setSuccess(''); setStage('Yükleniyor...');
    try {
      const intent = await createPatientDocumentUploadIntent({
        category, title: title.trim(), description: description.trim() || null, file, appointmentIds,
      });
      await uploadDocumentToSignedTarget(file, intent);
      setStage('Doğrulanıyor...');
      await finalizeMedicalDocument(intent.documentId);
      await refresh();
      setStage('Tamamlandı'); setSuccess('Belge arşivinize eklendi.');
      setTitle(''); setDescription(''); setFile(null); setAppointmentIds([]); setShowForm(false);
    } catch (uploadError) {
      setStage('');
      setError(uploadError instanceof Error ? uploadError.message : 'Belge yüklenemedi. Yeni bir yükleme başlatın.');
    } finally { setBusy(false); }
  };

  const view = async (documentId: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const url = await getMedicalDocumentSignedUrl(documentId);
      const link = window.document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : 'Belge görüntülenemedi.');
    } finally { setBusy(false); }
  };

  return <section className="mt-10" aria-labelledby="my-documents-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><FolderOpen className="h-6 w-6 text-violet-600 dark:text-violet-300" /><h2 id="my-documents-title" className="text-2xl font-bold text-slate-950 dark:text-white">Belgelerim</h2></div><button type="button" disabled={busy} onClick={() => setShowForm((current) => !current)} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FileUp className="mr-2 inline h-4 w-4" />Belge Yükle</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">{success}</p>}
    {stage && <p aria-live="polite" className="mt-3 text-sm font-medium text-violet-700 dark:text-violet-300">{stage}</p>}
    {showForm && <form onSubmit={(event) => void submit(event)} className={`mt-5 space-y-4 rounded-2xl p-6 ${cardClass}`}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Belge Türü *<select value={category} disabled={busy} onChange={(event) => setCategory(event.target.value as MedicalDocumentCategory)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700">{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm">Başlık *<input required maxLength={200} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Açıklama<textarea rows={3} maxLength={2000} disabled={busy} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Dosya *<input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /><span className="mt-1 block text-xs text-slate-500">PDF, JPEG veya PNG · En fazla 10 MB</span></label></div><fieldset disabled={busy}><legend className="text-sm font-semibold">Randevularla Paylaş (isteğe bağlı)</legend><div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{appointments.map((appointment) => <label key={appointment.appointment_id} className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><input type="checkbox" checked={appointmentIds.includes(appointment.appointment_id)} onChange={(event) => setAppointmentIds((current) => event.target.checked ? [...current, appointment.appointment_id] : current.filter((id) => id !== appointment.appointment_id))} />{appointmentLabel(appointment)}</label>)}{appointments.length === 0 && <p className="text-sm text-slate-500">Paylaşıma uygun randevu bulunmuyor.</p>}</div></fieldset>{appointmentIds.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">Bu belge herhangi bir randevuyla paylaşılmıyor.</p>}<div className="flex justify-end"><button type="submit" disabled={busy || !file} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? stage || 'Yükleniyor...' : 'Belgeyi Yükle'}</button></div></form>}
    {loading && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Belgeleriniz yükleniyor...</div>}
    {!loading && documents.length === 0 && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Henüz tamamlanmış belge kaydınız bulunmuyor.</div>}
    {!loading && documents.length > 0 && <div className="mt-5 space-y-4">{documents.map((item) => <article key={item.document_id} className={`rounded-2xl p-6 ${cardClass}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{medicalDocumentCategoryLabels[item.category]}</p><h3 className="mt-1 text-lg font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.original_file_name} · {formatDate(item.finalized_at)}</p></div><button type="button" disabled={busy} onClick={() => void view(item.document_id)} className="rounded-lg border border-violet-600 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:text-violet-300">Belgeyi Görüntüle</button></div>{item.description && <p className="mt-4 whitespace-pre-wrap text-sm">{item.description}</p>}<p className="mt-3 text-sm text-slate-500">{item.uploader_role === 'doctor' ? 'Doktor tarafından yüklendi' : 'Hasta tarafından yüklendi'}</p>{item.linked_appointments.length ? <ul className="mt-4 space-y-2 text-sm">{item.linked_appointments.map((appointment) => <li key={appointment.appointment_id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">{appointmentLabel({ ...appointment, appointment_status: '' })}</li>)}</ul> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">Bu belge herhangi bir randevuyla paylaşılmıyor.</p>}</article>)}</div>}
    <p className="mt-4 text-xs text-slate-500">V1 dosya biçimini ve boyutunu doğrular; antivirüs taraması veya içerik güvenliği garantisi sunmaz.</p>
  </section>;
};

export default MedicalDocumentsSection;
