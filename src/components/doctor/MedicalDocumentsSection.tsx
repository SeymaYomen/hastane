import { FormEvent, useEffect, useState } from 'react';
import { FileUp, FolderOpen } from 'lucide-react';
import {
  createDoctorDocumentUploadIntent,
  getDoctorAppointmentDocuments,
  type DoctorMedicalDocument,
} from '../../services/doctor/medicalDocumentService';
import {
  finalizeMedicalDocument, getMedicalDocumentSignedUrl, medicalDocumentCategoryLabels,
  uploadDocumentToSignedTarget, type MedicalDocumentCategory,
} from '../../services/medicalDocuments';

const MAX_BYTES = 10 * 1024 * 1024;
const categories = Object.entries(medicalDocumentCategoryLabels) as [MedicalDocumentCategory, string][];

const MedicalDocumentsSection = ({ appointmentId, allowUpload }: { appointmentId: string; allowUpload: boolean }) => {
  const [documents, setDocuments] = useState<DoctorMedicalDocument[]>([]);
  const [category, setCategory] = useState<MedicalDocumentCategory>('lab_report');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null); const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const refresh = async () => setDocuments(await getDoctorAppointmentDocuments(appointmentId));

  useEffect(() => {
    let mounted = true;
    void getDoctorAppointmentDocuments(appointmentId).then((items) => { if (mounted) setDocuments(items); })
      .catch(() => { if (mounted) setError('Belgeler yüklenemedi.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [appointmentId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !file || !allowUpload) return;
    if (!['application/pdf','image/jpeg','image/png'].includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size < 1 || file.size > MAX_BYTES) {
      setError('PDF, JPEG veya PNG biçiminde ve en fazla 10 MB bir dosya seçin.'); return;
    }
    setBusy(true); setError(''); setSuccess(''); setStage('Yükleniyor...');
    try {
      const intent = await createDoctorDocumentUploadIntent({ appointmentId, category, title: title.trim(), description: description.trim() || null, file });
      await uploadDocumentToSignedTarget(file, intent); setStage('Doğrulanıyor...');
      await finalizeMedicalDocument(intent.documentId); await refresh();
      setStage('Tamamlandı'); setSuccess('Belge hastanın arşivine eklendi.'); setTitle(''); setDescription(''); setFile(null); setShowForm(false);
    } catch (uploadError) {
      setStage(''); setError(uploadError instanceof Error ? uploadError.message : 'Belge yüklenemedi. Yeni bir yükleme başlatın.');
    } finally { setBusy(false); }
  };

  const view = async (documentId: string) => {
    if (busy) return; setBusy(true); setError('');
    try { const url = await getMedicalDocumentSignedUrl(documentId); const link = window.document.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.click(); }
    catch (viewError) { setError(viewError instanceof Error ? viewError.message : 'Belge görüntülenemedi.'); }
    finally { setBusy(false); }
  };

  return <section className="mt-6 rounded-2xl border border-violet-200 bg-white p-6 dark:border-violet-900 dark:bg-slate-950" aria-labelledby="doctor-documents-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><FolderOpen className="h-5 w-5 text-violet-600" /><div><h2 id="doctor-documents-title" className="text-xl font-semibold">Tıbbi Belgeler</h2><p className="mt-1 text-sm text-slate-500">Yalnızca bu randevuyla paylaşılan tamamlanmış belgeler</p></div></div>{allowUpload && <button type="button" disabled={busy} onClick={() => setShowForm((current) => !current)} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FileUp className="mr-2 inline h-4 w-4" />Belge Yükle</button>}</div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}{success && <p role="status" className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">{success}</p>}{stage && <p aria-live="polite" className="mt-3 text-sm font-medium text-violet-700 dark:text-violet-300">{stage}</p>}
    {showForm && allowUpload && <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-800"><label className="text-sm">Belge Türü *<select disabled={busy} value={category} onChange={(event) => setCategory(event.target.value as MedicalDocumentCategory)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700">{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm">Başlık *<input required maxLength={200} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Açıklama<textarea rows={3} maxLength={2000} disabled={busy} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Dosya *<input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /><span className="mt-1 block text-xs text-slate-500">PDF, JPEG veya PNG · En fazla 10 MB</span></label><div className="sm:col-span-2 sm:text-right"><button type="submit" disabled={busy || !file} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? stage || 'Yükleniyor...' : 'Belgeyi Yükle'}</button></div></form>}
    {loading && <p className="mt-5 text-sm text-slate-500">Belgeler yükleniyor...</p>}{!loading && documents.length === 0 && <p className="mt-5 text-sm text-slate-500">Bu randevuyla paylaşılmış belge bulunmuyor.</p>}{documents.length > 0 && <div className="mt-5 space-y-3">{documents.map((item) => <article key={item.document_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{medicalDocumentCategoryLabels[item.category]}</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.original_file_name} · {new Date(item.finalized_at).toLocaleString('tr-TR')}</p></div><button type="button" disabled={busy} onClick={() => void view(item.document_id)} className="rounded-lg border border-violet-600 px-3 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:text-violet-300">Belgeyi Görüntüle</button></div>{item.description && <p className="mt-3 whitespace-pre-wrap text-sm">{item.description}</p>}<p className="mt-3 text-xs text-slate-500">{item.uploader_role === 'doctor' ? 'Doktor tarafından yüklendi' : 'Hasta tarafından yüklendi'}</p></article>)}</div>}
    <p className="mt-4 text-xs text-slate-500">V1 dosya biçimini ve boyutunu doğrular; antivirüs taraması veya içerik güvenliği garantisi sunmaz.</p>
  </section>;
};

export default MedicalDocumentsSection;
