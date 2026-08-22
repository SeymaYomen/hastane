import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Pill, Plus, Trash2 } from 'lucide-react';
import {
  getDoctorPrescription,
  saveDoctorPrescription,
  type DoctorPrescription,
  type PrescriptionItemInput,
} from '../../services/doctor/prescriptionService';

type EditableItem = {
  medication_name: string;
  dose_instruction: string;
  frequency: string;
  duration: string;
  usage_note: string;
};

const emptyItem = (): EditableItem => ({
  medication_name: '', dose_instruction: '', frequency: '', duration: '', usage_note: '',
});

const toEditableItem = (item: PrescriptionItemInput): EditableItem => ({
  medication_name: item.medication_name,
  dose_instruction: item.dose_instruction ?? '',
  frequency: item.frequency ?? '',
  duration: item.duration ?? '',
  usage_note: item.usage_note ?? '',
});

const PrescriptionSection = ({ appointmentId }: { appointmentId: string }) => {
  const [prescription, setPrescription] = useState<DoctorPrescription | null>(null);
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [items, setItems] = useState<EditableItem[]>([emptyItem()]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    void getDoctorPrescription(appointmentId)
      .then((result) => {
        if (!mounted) return;
        setPrescription(result);
        if (result) {
          setPrescriptionNote(result.prescription_note ?? '');
          setItems(result.items.map(toEditableItem));
        }
      })
      .catch(() => { if (mounted) setError('Reçete bilgileri yüklenemedi.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [appointmentId]);

  const startEditing = () => {
    setError('');
    setSuccess('');
    setPrescriptionNote(prescription?.prescription_note ?? '');
    setItems(prescription?.items.map(toEditableItem) ?? [emptyItem()]);
    setEditing(true);
  };

  const updateItem = (index: number, field: keyof EditableItem, value: string) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (items.some((item) => !item.medication_name.trim())) {
      setError('Her reçete kalemi için ilaç adı girilmelidir.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await saveDoctorPrescription({
        appointmentId,
        prescriptionNote: prescriptionNote.trim() || null,
        items: items.map((item, index) => ({
          medication_name: item.medication_name.trim(),
          dose_instruction: item.dose_instruction.trim() || null,
          frequency: item.frequency.trim() || null,
          duration: item.duration.trim() || null,
          usage_note: item.usage_note.trim() || null,
          sort_order: index,
        })),
      });
      setPrescription(saved);
      setPrescriptionNote(saved.prescription_note ?? '');
      setItems(saved.items.map(toEditableItem));
      setEditing(false);
      setSuccess('Reçete kaydedildi.');
    } catch (saveError) {
      const message = saveError && typeof saveError === 'object' && 'message' in saveError
        && typeof saveError.message === 'string' ? saveError.message : 'Reçete kaydedilemedi.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 dark:border-emerald-900 dark:bg-slate-950" aria-labelledby="prescription-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Pill className="h-5 w-5" /></div><div><h2 id="prescription-title" className="text-xl font-semibold">Reçete</h2><p className="mt-1 text-sm text-slate-500">İlaç ve kullanım bilgileri doktor tarafından manuel olarak girilir.</p></div></div>{!loading && !editing && <button type="button" onClick={startEditing} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{prescription ? 'Reçeteyi Düzenle' : 'Reçete Oluştur'}</button>}</div>
    {loading && <p className="mt-5 text-sm text-slate-500">Reçete bilgileri yükleniyor...</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {success && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</p>}

    {!loading && !editing && !prescription && <p className="mt-5 text-sm text-slate-500">Henüz reçete oluşturulmadı.</p>}
    {!editing && prescription && <div className="mt-5 space-y-4">{prescription.items.map((item) => <article key={`${item.sort_order}-${item.medication_name}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold">{item.medication_name}</h3><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{item.dose_instruction && <div><dt className="text-slate-500">Doz / Kullanım Miktarı</dt><dd>{item.dose_instruction}</dd></div>}{item.frequency && <div><dt className="text-slate-500">Kullanım Sıklığı</dt><dd>{item.frequency}</dd></div>}{item.duration && <div><dt className="text-slate-500">Süre</dt><dd>{item.duration}</dd></div>}{item.usage_note && <div><dt className="text-slate-500">Ek Kullanım Notu</dt><dd className="whitespace-pre-wrap">{item.usage_note}</dd></div>}</dl></article>)}{prescription.prescription_note && <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900"><p className="font-semibold">Doktor notu</p><p className="mt-2 whitespace-pre-wrap">{prescription.prescription_note}</p></div>}</div>}

    {editing && <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5"><label className="block text-sm font-medium">Doktor notu<textarea rows={3} maxLength={2000} disabled={saving} value={prescriptionNote} onChange={(event) => setPrescriptionNote(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label>{items.map((item, index) => <fieldset key={index} disabled={saving} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><legend className="px-2 font-semibold">İlaç {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">İlaç Adı *<input required maxLength={200} value={item.medication_name} onChange={(event) => updateItem(index, 'medication_name', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Doz / Kullanım Miktarı<input maxLength={500} value={item.dose_instruction} onChange={(event) => updateItem(index, 'dose_instruction', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Kullanım Sıklığı<input maxLength={300} value={item.frequency} onChange={(event) => updateItem(index, 'frequency', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm">Süre<input maxLength={300} value={item.duration} onChange={(event) => updateItem(index, 'duration', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label><label className="text-sm sm:col-span-2">Ek Kullanım Notu<textarea rows={2} maxLength={1000} value={item.usage_note} onChange={(event) => updateItem(index, 'usage_note', event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label></div>{items.length > 1 && <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-rose-600"><Trash2 className="h-4 w-4" />Satırı Kaldır</button>}</fieldset>)}<div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={saving || items.length >= 20} onClick={() => setItems((current) => [...current, emptyItem()])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-300"><Plus className="h-4 w-4" />İlaç Ekle</button><div className="flex gap-3"><button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Vazgeç</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Reçeteyi Kaydet'}</button></div></div></form>}
  </section>;
};

export default PrescriptionSection;
