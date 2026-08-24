import { useEffect, useState } from 'react';
import { FilePenLine, Sparkles } from 'lucide-react';
import { AIServiceError, getClinicalAssistantSummary, getClinicalNoteDraft } from '../../services/ai/aiService';
import type { ClinicalAssistantCurrentNote, ClinicalAssistantDraft, ClinicalAssistantSummary } from '../../services/ai/types';
import type { AppointmentStatus } from '../../types/appointmentStatus';

const RATE_LIMIT_COOLDOWN_SECONDS = 60;

type Props = {
  appointmentId: string;
  status: AppointmentStatus;
  currentNote: ClinicalAssistantCurrentNote;
  onApplyDraft: (draft: ClinicalAssistantDraft) => void;
};

const hasMeaningfulClinicalNote = (note: ClinicalAssistantCurrentNote) => note.noteFormat === 'free_text'
  ? Boolean(note.clinicalNote?.trim())
  : [note.subjective, note.objective, note.assessment, note.plan].some((value) => Boolean(value?.trim()));

const ClinicalAssistantPanel = ({ appointmentId, status, currentNote, onApplyDraft }: Props) => {
  const [summary, setSummary] = useState<ClinicalAssistantSummary | null>(null);
  const [draft, setDraft] = useState<ClinicalAssistantDraft | null>(null);
  const [loadingAction, setLoadingAction] = useState<'summary' | 'clinical_note_draft' | null>(null);
  const [error, setError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => setCooldownSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleError = (requestError: unknown) => {
    if (requestError instanceof AIServiceError) {
      setError(requestError.message);
      if (requestError.kind === 'rate_limit') setCooldownSeconds(RATE_LIMIT_COOLDOWN_SECONDS);
    } else setError('Klinik Asistan isteği tamamlanamadı. Lütfen tekrar deneyin.');
  };

  const prepareSummary = async () => {
    if (loadingAction || cooldownSeconds > 0) return;
    setLoadingAction('summary'); setError('');
    try { setSummary(await getClinicalAssistantSummary(appointmentId)); }
    catch (requestError) { handleError(requestError); }
    finally { setLoadingAction(null); }
  };

  const prepareDraft = async () => {
    if (loadingAction || cooldownSeconds > 0 || !hasMeaningfulClinicalNote(currentNote)) return;
    setLoadingAction('clinical_note_draft'); setError('');
    try { setDraft(await getClinicalNoteDraft(appointmentId, currentNote)); }
    catch (requestError) { handleError(requestError); }
    finally { setLoadingAction(null); }
  };

  const summaryAllowed = ['confirmed', 'in_progress', 'completed'].includes(status);
  const draftAllowed = status === 'in_progress';
  const emptyDraftInput = !hasMeaningfulClinicalNote(currentNote);
  if (!summaryAllowed && !draftAllowed) return null;

  return <section className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-6 dark:border-cyan-900 dark:bg-cyan-950/10" aria-labelledby="clinical-assistant-title">
    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-600" /><h2 id="clinical-assistant-title" className="text-lg font-semibold">Klinik Asistan</h2></div>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Yalnız doğrulanmış kayıtları düzenler; tanı veya tedavi önermez.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      {summaryAllowed && <button type="button" disabled={Boolean(loadingAction) || cooldownSeconds > 0} onClick={() => void prepareSummary()} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loadingAction === 'summary' ? 'Özetleniyor...' : 'Kayıtları Özetle'}</button>}
      {draftAllowed && <button type="button" disabled={Boolean(loadingAction) || cooldownSeconds > 0 || emptyDraftInput} onClick={() => void prepareDraft()} className="rounded-lg border border-cyan-700 px-4 py-2.5 text-sm font-semibold text-cyan-800 disabled:opacity-50 dark:text-cyan-200"><FilePenLine className="mr-2 inline h-4 w-4" />{loadingAction === 'clinical_note_draft' ? 'Taslak oluşturuluyor...' : 'Klinik Not Taslağı Oluştur'}</button>}
    </div>
    {draftAllowed && emptyDraftInput && <p className="mt-2 text-xs text-slate-500">Önce klinik not alanına bilgi girin.</p>}
    {cooldownSeconds > 0 && <p className="mt-2 text-xs text-slate-500">Tekrar denemek için {cooldownSeconds} sn</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {summary && <div className="mt-5 space-y-4 rounded-xl bg-white/70 p-4 dark:bg-slate-950/50"><section><h3 className="font-semibold">Kısa özet</h3><p className="mt-2 whitespace-pre-wrap text-sm">{summary.summary}</p></section><section><h3 className="font-semibold">Önemli noktalar</h3>{summary.keyPoints.length ? <ul className="mt-2 space-y-2">{summary.keyPoints.map((point, index) => <li key={`${point.text}-${index}`} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><p>{point.text}</p><p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">Kanıt: {point.evidenceRefs.join(', ')}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Doğrulanmış önemli nokta bulunmuyor.</p>}</section><section><h3 className="font-semibold">Eksik / sınırlı bilgiler</h3>{summary.limitations.length ? <ul className="mt-2 list-disc pl-5 text-sm">{summary.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Ek sınırlılık belirtilmedi.</p>}</section></div>}
    {draft && <div className="mt-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20"><p className="text-sm font-black tracking-wide text-amber-900 dark:text-amber-100">AI TASLAĞI</p><p className="mt-1 font-semibold text-amber-900 dark:text-amber-100">Doktor kontrolü gereklidir</p><div className="mt-4 space-y-3 text-sm">{draft.noteFormat === 'free_text' ? <p className="whitespace-pre-wrap">{draft.freeTextDraft}</p> : (['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => <section key={field}><h4 className="font-semibold uppercase">{field}</h4><p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{draft[field] || '—'}</p></section>)}</div>{draft.limitations.length > 0 && <ul className="mt-4 list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">{draft.limitations.map((item) => <li key={item}>{item}</li>)}</ul>}<button type="button" onClick={() => onApplyDraft(draft)} className="mt-4 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">Taslağı Forma Aktar</button><p className="mt-2 text-xs text-amber-900 dark:text-amber-100">Bu işlem yalnızca form alanlarını doldurur; kaydetmez veya klinik onay anlamına gelmez.</p></div>}
  </section>;
};

export default ClinicalAssistantPanel;
