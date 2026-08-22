import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { getMyLabOrders, type PatientLabOrder } from '../../services/patient/labService';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric',
});

const statusLabel = { requested: 'Sonuç bekleniyor', resulted: 'Sonuçlandı', cancelled: 'İptal edildi' } as const;
const statusClass = {
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  resulted: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
} as const;

const LabOrdersSection = ({ cardClass }: { cardClass: string }) => {
  const [orders, setOrders] = useState<PatientLabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getMyLabOrders()
      .then((items) => { if (mounted) setOrders(items); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return <section className="mt-10" aria-labelledby="my-lab-orders-title">
    <div className="flex items-center gap-3"><FlaskConical className="h-6 w-6 text-cyan-600 dark:text-cyan-300" /><h2 id="my-lab-orders-title" className="text-2xl font-bold text-slate-950 dark:text-white">Tetkiklerim</h2></div>
    {loading && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Tetkikleriniz yükleniyor...</div>}
    {!loading && error && <div role="alert" className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Tetkikleriniz şu anda yüklenemedi. Lütfen tekrar deneyin.</div>}
    {!loading && !error && orders.length === 0 && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Henüz tetkik kaydınız bulunmuyor.</div>}
    {!loading && !error && orders.length > 0 && <div className="mt-5 space-y-5">{orders.map((order) => <article key={order.lab_order_id} className={`rounded-2xl p-6 ${cardClass}`}><header><p className="font-semibold">{formatDate(order.appointment_date)} · {order.appointment_time.slice(0, 5)}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{order.doctor_title ? `${order.doctor_title} ` : ''}{order.doctor_name} · {order.department}</p></header>{order.order_note && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900"><p className="font-semibold">Tetkik istem notu</p><p className="mt-2 whitespace-pre-wrap">{order.order_note}</p></div>}<div className="mt-5 space-y-3">{order.items.map((item) => <section key={`${item.sort_order}-${item.test_name}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold">{item.test_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span></div>{item.status === 'resulted' && <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{item.result_value_numeric !== null && <div><dt className="text-slate-500">Sayısal sonuç</dt><dd>{item.result_value_numeric}{item.unit ? ` ${item.unit}` : ''}</dd></div>}{item.result_text && <div><dt className="text-slate-500">Metin sonucu</dt><dd className="whitespace-pre-wrap">{item.result_text}</dd></div>}{(item.reference_min !== null || item.reference_max !== null) && <div><dt className="text-slate-500">Referans aralığı</dt><dd>{item.reference_min ?? '—'} – {item.reference_max ?? '—'}</dd></div>}{item.reference_text && <div><dt className="text-slate-500">Referans açıklaması</dt><dd className="whitespace-pre-wrap">{item.reference_text}</dd></div>}{item.result_note && <div className="sm:col-span-2"><dt className="text-slate-500">Sonuç notu</dt><dd className="whitespace-pre-wrap">{item.result_note}</dd></div>}{item.resulted_at && <div className="sm:col-span-2"><dt className="text-slate-500">Sonuç tarihi</dt><dd>{new Date(item.resulted_at).toLocaleString('tr-TR')}</dd></div>}</dl>}</section>)}</div></article>)}</div>}
    <p className="mt-4 text-xs text-slate-500">Sonuç ve referans bilgileri bilgilendirme amacıyla gösterilir; bu ekran tıbbi yorum veya tedavi önerisi sunmaz.</p>
  </section>;
};

export default LabOrdersSection;
