import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Plus, XCircle } from 'lucide-react';
import {
  addDoctorLabTests,
  cancelDoctorLabItem,
  getDoctorLabOrder,
  getLabTestCatalog,
  resultDoctorLabItem,
  type DoctorLabOrder,
  type DoctorLabOrderItem,
  type LabTestCatalogItem,
} from '../../services/doctor/labService';

type NewTestRow = { testCatalogId: string; testName: string };
type ResultForm = {
  numeric: string; text: string; unit: string; referenceMin: string;
  referenceMax: string; referenceText: string; note: string;
};

const emptyTest = (): NewTestRow => ({ testCatalogId: '', testName: '' });
const emptyResult = (unit = ''): ResultForm => ({
  numeric: '', text: '', unit, referenceMin: '', referenceMax: '', referenceText: '', note: '',
});

const errorMessage = (error: unknown, fallback: string) => (
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : fallback
);

const statusLabel = { requested: 'Sonuç Bekleniyor', resulted: 'Sonuçlandı', cancelled: 'İptal Edildi' } as const;
const statusClass = {
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  resulted: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
} as const;

const LabOrderSection = ({ appointmentId }: { appointmentId: string }) => {
  const [order, setOrder] = useState<DoctorLabOrder | null>(null);
  const [catalog, setCatalog] = useState<LabTestCatalogItem[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [newTests, setNewTests] = useState<NewTestRow[]>([emptyTest()]);
  const [adding, setAdding] = useState(false);
  const [resultItemId, setResultItemId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState<ResultForm>(emptyResult());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshOrder = async () => {
    const nextOrder = await getDoctorLabOrder(appointmentId);
    setOrder(nextOrder);
    setOrderNote(nextOrder?.order_note ?? '');
  };

  useEffect(() => {
    let mounted = true;
    void Promise.all([getDoctorLabOrder(appointmentId), getLabTestCatalog()])
      .then(([nextOrder, nextCatalog]) => {
        if (!mounted) return;
        setOrder(nextOrder);
        setOrderNote(nextOrder?.order_note ?? '');
        setCatalog(nextCatalog);
      })
      .catch(() => { if (mounted) setError('Tetkik bilgileri yüklenemedi.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [appointmentId]);

  const updateNewTest = (index: number, next: Partial<NewTestRow>) => {
    setNewTests((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...next } : item
    )));
  };

  const selectCatalog = (index: number, catalogId: string) => {
    const selected = catalog.find((item) => item.id === catalogId);
    updateNewTest(index, {
      testCatalogId: catalogId,
      testName: selected?.display_name ?? '',
    });
  };

  const addTests = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (newTests.some((item) => !item.testName.trim())) {
      setError('Her kalem için tetkik adı girilmelidir.');
      return;
    }
    if ((order?.items.length ?? 0) + newTests.length > 50) {
      setError('Bir tetkik isteminde en fazla 50 kalem bulunabilir.');
      return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      await addDoctorLabTests({
        appointmentId,
        orderNote: orderNote.trim() || null,
        items: newTests.map((item, index) => ({
          test_catalog_id: item.testCatalogId || null,
          test_name: item.testName.trim(),
          sort_order: index,
        })),
      });
      await refreshOrder();
      setNewTests([emptyTest()]);
      setAdding(false);
      setSuccess('Tetkik istemi kaydedildi.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Tetkik istemi kaydedilemedi.'));
    } finally { setBusy(false); }
  };

  const openResult = (item: DoctorLabOrderItem) => {
    setError(''); setSuccess(''); setResultItemId(item.item_id); setResultForm(emptyResult(item.unit ?? ''));
  };

  const saveResult = async (event: FormEvent) => {
    event.preventDefault();
    if (!resultItemId || busy) return;
    const numeric = resultForm.numeric.trim() === '' ? null : Number(resultForm.numeric);
    if (numeric !== null && !Number.isFinite(numeric)) {
      setError('Sayısal sonuç geçerli bir sayı olmalıdır.'); return;
    }
    if (numeric === null && !resultForm.text.trim()) {
      setError('Sayısal sonuç veya metin sonucu girilmelidir.'); return;
    }
    const parseOptionalNumber = (value: string) => value.trim() === '' ? null : Number(value);
    const referenceMin = parseOptionalNumber(resultForm.referenceMin);
    const referenceMax = parseOptionalNumber(resultForm.referenceMax);
    if ((referenceMin !== null && !Number.isFinite(referenceMin)) || (referenceMax !== null && !Number.isFinite(referenceMax))) {
      setError('Referans sınırları geçerli sayı olmalıdır.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      await resultDoctorLabItem({
        itemId: resultItemId, resultValueNumeric: numeric,
        resultText: resultForm.text.trim() || null, unit: resultForm.unit.trim() || null,
        referenceMin, referenceMax, referenceText: resultForm.referenceText.trim() || null,
        resultNote: resultForm.note.trim() || null,
      });
      await refreshOrder();
      setResultItemId(null);
      setSuccess('Tetkik sonucu kaydedildi.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Tetkik sonucu kaydedilemedi.'));
    } finally { setBusy(false); }
  };

  const cancelItem = async (itemId: string) => {
    if (busy || !window.confirm('Bu tetkik istemini iptal etmek istediğinizden emin misiniz?')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await cancelDoctorLabItem(itemId);
      await refreshOrder();
      setResultItemId((current) => current === itemId ? null : current);
      setSuccess('Tetkik istemi iptal edildi.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Tetkik istemi iptal edilemedi.'));
    } finally { setBusy(false); }
  };

  const resultDetails = (item: DoctorLabOrderItem) => [
    item.result_value_numeric !== null ? `Sayısal sonuç: ${item.result_value_numeric}${item.unit ? ` ${item.unit}` : ''}` : null,
    item.result_text ? `Metin sonucu: ${item.result_text}` : null,
    item.reference_min !== null || item.reference_max !== null
      ? `Referans aralığı: ${item.reference_min ?? '—'} – ${item.reference_max ?? '—'}` : null,
    item.reference_text ? `Referans açıklaması: ${item.reference_text}` : null,
  ].filter((value): value is string => Boolean(value));

  return <section className="mt-6 rounded-2xl border border-cyan-200 bg-white p-6 dark:border-cyan-900 dark:bg-slate-950" aria-labelledby="lab-order-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><FlaskConical className="h-5 w-5" /></div><div><h2 id="lab-order-title" className="text-xl font-semibold">Tetkikler</h2><p className="mt-1 text-sm text-slate-500">Tetkik istemleri ve ham sonuç bilgileri</p></div></div>{!loading && !adding && <button type="button" disabled={busy || (order?.items.length ?? 0) >= 50} onClick={() => { setAdding(true); setError(''); setSuccess(''); }} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{order ? 'Tetkik Ekle' : 'Tetkik İste'}</button>}</div>
    {loading && <p className="mt-5 text-sm text-slate-500">Tetkik bilgileri yükleniyor...</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {success && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200"><CheckCircle2 className="h-4 w-4" />{success}</p>}
    {!loading && !order && !adding && <p className="mt-5 text-sm text-slate-500">Henüz tetkik istemi oluşturulmadı.</p>}
    {order && <div className="mt-5"><p className="text-sm text-slate-500">{order.items.length} tetkik · {order.items.filter((item) => item.status === 'resulted').length} sonuçlandı · {order.items.filter((item) => item.status === 'cancelled').length} iptal edildi</p>{order.order_note && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900"><p className="font-semibold">Hastaya gösterilen istem notu</p><p className="mt-2 whitespace-pre-wrap">{order.order_note}</p></div>}<div className="mt-4 space-y-4">{order.items.map((item) => <article key={item.item_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold">{item.test_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span></div>{item.status === 'resulted' && <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">{resultDetails(item).map((line) => <p key={line}>{line}</p>)}{item.result_note && <p className="whitespace-pre-wrap">Sonuç notu: {item.result_note}</p>}{item.resulted_at && <p className="text-xs text-slate-500">Sonuç tarihi: {new Date(item.resulted_at).toLocaleString('tr-TR')}</p>}</div>}{item.status === 'requested' && <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => openResult(item)} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Sonuç Gir</button><button type="button" disabled={busy} onClick={() => void cancelItem(item.item_id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-400 px-3 py-2 text-sm font-semibold disabled:opacity-50"><XCircle className="h-4 w-4" />İptal Et</button></div>}{item.status === 'requested' && resultItemId === item.item_id && <form onSubmit={(event) => void saveResult(event)} className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-900"><label className="text-sm">Sayısal Sonuç<input type="number" step="any" value={resultForm.numeric} onChange={(event) => setResultForm((current) => ({ ...current, numeric: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Metin Sonucu<input maxLength={1000} value={resultForm.text} onChange={(event) => setResultForm((current) => ({ ...current, text: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Birim<input maxLength={100} value={resultForm.unit} onChange={(event) => setResultForm((current) => ({ ...current, unit: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Referans Alt Sınır<input type="number" step="any" value={resultForm.referenceMin} onChange={(event) => setResultForm((current) => ({ ...current, referenceMin: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Referans Üst Sınır<input type="number" step="any" value={resultForm.referenceMax} onChange={(event) => setResultForm((current) => ({ ...current, referenceMax: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Referans Açıklaması<input maxLength={500} value={resultForm.referenceText} onChange={(event) => setResultForm((current) => ({ ...current, referenceText: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Sonuç Notu<textarea rows={3} maxLength={2000} value={resultForm.note} onChange={(event) => setResultForm((current) => ({ ...current, note: event.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label><div className="flex gap-3 sm:col-span-2 sm:justify-end"><button type="button" disabled={busy} onClick={() => setResultItemId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Vazgeç</button><button type="submit" disabled={busy} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Kaydediliyor...' : 'Sonucu Kaydet'}</button></div></form>}</article>)}</div></div>}
    {adding && <form onSubmit={(event) => void addTests(event)} className="mt-6 space-y-4"><label className="block text-sm font-medium">Hastaya gösterilecek istem notu<textarea rows={3} maxLength={2000} disabled={busy} value={orderNote} onChange={(event) => setOrderNote(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label>{newTests.map((item, index) => <fieldset key={index} disabled={busy} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><legend className="px-2 font-semibold">Tetkik {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Katalog (isteğe bağlı)<select value={item.testCatalogId} onChange={(event) => selectCatalog(index, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"><option value="">Diğer / Manuel Tetkik</option>{catalog.map((catalogItem) => <option key={catalogItem.id} value={catalogItem.id}>{catalogItem.display_name} ({catalogItem.code})</option>)}</select></label><label className="text-sm">Tetkik Adı *<input required maxLength={200} readOnly={Boolean(item.testCatalogId)} value={item.testName} onChange={(event) => updateNewTest(index, { testName: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 read-only:opacity-70 dark:border-slate-700" /></label></div>{newTests.length > 1 && <button type="button" onClick={() => setNewTests((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Satırı Kaldır</button>}</fieldset>)}<div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={busy || newTests.length + (order?.items.length ?? 0) >= 50} onClick={() => setNewTests((current) => [...current, emptyTest()])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-600 px-4 py-2.5 text-sm font-semibold text-cyan-700 disabled:opacity-50 dark:text-cyan-300"><Plus className="h-4 w-4" />Tetkik Satırı Ekle</button><div className="flex gap-3"><button type="button" disabled={busy} onClick={() => setAdding(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Vazgeç</button><button type="submit" disabled={busy} className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Kaydediliyor...' : 'Tetkikleri Kaydet'}</button></div></div></form>}
  </section>;
};

export default LabOrderSection;
