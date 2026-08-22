import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AIServiceError, getPreVisitBrief } from '../../services/ai/aiService';
import type { PreVisitBrief } from '../../services/ai/types';

const RATE_LIMIT_COOLDOWN_SECONDS = 60;

const PreVisitBriefPanel = ({ appointmentId }: { appointmentId: string }) => {
  const [brief, setBrief] = useState<PreVisitBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const prepare = async () => {
    if (loading || cooldownSeconds > 0) return;
    setLoading(true);
    setError('');
    try {
      setBrief(await getPreVisitBrief(appointmentId));
    } catch (requestError) {
      if (requestError instanceof AIServiceError) {
        setError(requestError.message);
        if (requestError.kind === 'rate_limit') setCooldownSeconds(RATE_LIMIT_COOLDOWN_SECONDS);
      } else {
        setError('Hasta özeti hazırlanamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonDisabled = loading || cooldownSeconds > 0;

  return <section className="mt-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/70 to-cyan-50/50 p-6 dark:border-violet-900 dark:from-violet-950/20 dark:to-cyan-950/10" aria-labelledby="pre-visit-brief-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><h2 id="pre-visit-brief-title" className="text-lg font-semibold">Randevu Öncesi Hasta Özeti</h2></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Doğrulanmış geçmiş yalnız doktor isteğiyle özetlenir.</p></div><div className="text-right"><button type="button" onClick={() => void prepare()} disabled={buttonDisabled} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60">✦ {loading ? 'Doğrulanmış geçmiş hazırlanıyor...' : brief ? 'Özeti Yeniden Hazırla' : 'Hasta Özetini Hazırla'}</button>{cooldownSeconds > 0 && <p className="mt-2 text-xs text-slate-500" aria-live="polite">Tekrar denemek için {cooldownSeconds} sn</p>}</div></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {!brief && !loading && !error && <p className="mt-5 text-sm text-slate-500">Özet henüz oluşturulmadı.</p>}
    {brief && <div className="mt-5 space-y-5"><section><h3 className="text-sm font-semibold">Kısa özet</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{brief.summary}</p></section><section><h3 className="text-sm font-semibold">Önemli noktalar</h3>{brief.keyPoints.length ? <ul className="mt-2 space-y-2">{brief.keyPoints.map((point, index) => <li key={`${point.text}-${index}`} className="rounded-xl bg-white/70 p-3 text-sm dark:bg-slate-950/50"><p>{point.text}</p><p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">Kanıt: {point.evidenceRefs.join(', ')}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Doğrulanmış önemli nokta bulunmuyor.</p>}</section><section><h3 className="text-sm font-semibold">Doğrulanmış takip planı</h3><p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{brief.followUp.required ? [brief.followUp.date, brief.followUp.note].filter(Boolean).join(' · ') || 'Takip gerekli olarak işaretlenmiş.' : 'Mevcut kayıtlarda aktif takip planı belirtilmemiş.'}</p></section><section><h3 className="text-sm font-semibold">Eksik / sınırlı bilgiler</h3>{brief.limitations.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{brief.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Ek sınırlılık belirtilmedi.</p>}</section></div>}
    <p className="mt-6 border-t border-violet-200 pt-4 text-xs text-slate-500 dark:border-violet-900 dark:text-slate-400">AI destekli özet — yalnız mevcut klinik kayıtlardan oluşturulur. Klinik karar yerine geçmez.</p>
  </section>;
};

export default PreVisitBriefPanel;
