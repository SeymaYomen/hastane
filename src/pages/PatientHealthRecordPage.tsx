import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, FileHeart, Pill, Stethoscope } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import {
  getMyHealthRecord,
  type PatientHealthRecordItem,
} from '../services/patient/healthRecordService';
import {
  getMyPrescriptions,
  type PatientPrescription,
} from '../services/patient/prescriptionService';
import LabOrdersSection from '../components/patient/LabOrdersSection';
import MedicalDocumentsSection from '../components/patient/MedicalDocumentsSection';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric',
});

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasMeaningfulFollowUp = (item: PatientHealthRecordItem) =>
  item.follow_up_required && Boolean(item.follow_up_date || item.follow_up_note?.trim());

const PatientHealthRecordPage = () => {
  const [records, setRecords] = useState<PatientHealthRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);
  const [prescriptionsError, setPrescriptionsError] = useState(false);
  const { theme } = useTheme();
  const highContrast = theme === 'high-contrast';

  useEffect(() => {
    let mounted = true;
    void getMyHealthRecord()
      .then((items) => { if (mounted) setRecords(items); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void getMyPrescriptions()
      .then((items) => { if (mounted) setPrescriptions(items); })
      .catch(() => { if (mounted) setPrescriptionsError(true); })
      .finally(() => { if (mounted) setPrescriptionsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const activeFollowUps = useMemo(
    () => records.filter(hasMeaningfulFollowUp),
    [records],
  );
  const nextFollowUp = useMemo(() => activeFollowUps
    .filter((item) => item.follow_up_date && item.follow_up_date >= localDate())
    .sort((a, b) => (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? ''))[0] ?? null,
  [activeFollowUps]);

  const cardClass = highContrast
    ? 'border-2 border-white bg-black text-white'
    : 'border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Hasta sağlık geçmişi</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Sağlık Dosyam</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Tamamlanmış muayenelerinizi ve doktorunuzun sizinle paylaştığı kontrol planlarını görüntüleyin.
        </p>
      </header>

      {loading && <div className={`mt-8 rounded-2xl p-8 text-center ${cardClass}`}>Sağlık dosyanız yükleniyor...</div>}
      {!loading && error && (
        <div role="alert" className={`mt-8 rounded-2xl p-8 text-center ${cardClass}`}>
          Sağlık dosyanız şu anda yüklenemedi. Lütfen tekrar deneyin.
        </div>
      )}

      {!loading && !error && (
        <>
          <section aria-label="Sağlık dosyası özeti" className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className={`rounded-2xl p-5 ${cardClass}`}>
              <CheckCircle2 className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
              <p className="mt-4 text-3xl font-bold">{records.length}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tamamlanmış muayene</p>
            </article>
            <article className={`rounded-2xl p-5 ${cardClass}`}>
              <FileHeart className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
              <p className="mt-4 text-3xl font-bold">{activeFollowUps.length}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Kontrol planı</p>
            </article>
            <article className={`rounded-2xl p-5 ${cardClass}`}>
              <CalendarClock className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
              <p className="mt-4 text-lg font-bold">{nextFollowUp?.follow_up_date ? formatDate(nextFollowUp.follow_up_date) : 'Planlanmış kontrol yok'}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">En yakın gelecek kontrolü</p>
            </article>
          </section>

          <section className={`mt-6 rounded-2xl p-6 ${cardClass}`}>
            <div className="flex items-center gap-3"><CalendarClock className="h-6 w-6 text-cyan-600 dark:text-cyan-300" /><h2 className="text-xl font-semibold">Yaklaşan Kontrol Planı</h2></div>
            {nextFollowUp ? (
              <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50/70 p-5 dark:border-cyan-900 dark:bg-cyan-950/20">
                <p className="text-lg font-semibold">{formatDate(nextFollowUp.follow_up_date!)}</p>
                <p className="mt-2 text-sm">{nextFollowUp.doctor_title ? `${nextFollowUp.doctor_title} ` : ''}{nextFollowUp.doctor_name} · {nextFollowUp.department}</p>
                {nextFollowUp.follow_up_note && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{nextFollowUp.follow_up_note}</p>}
                <p className="mt-3 text-sm font-medium text-cyan-800 dark:text-cyan-200">Doktorunuz bu tarih için kontrol planı oluşturdu.</p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Bu bir randevu değildir.</p>
                <Link to="/appointment" className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2">Randevu Al</Link>
              </div>
            ) : <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">Planlanmış kontrol yok</p>}
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-3"><Stethoscope className="h-6 w-6 text-cyan-600 dark:text-cyan-300" /><h2 className="text-2xl font-bold text-slate-950 dark:text-white">Muayene Geçmişim</h2></div>
            {records.length === 0 ? (
              <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Henüz tamamlanmış muayene kaydınız bulunmuyor.</div>
            ) : (
              <div className="mt-5 space-y-4">
                {records.map((record) => (
                  <article key={record.appointment_id} className={`rounded-2xl p-6 ${cardClass}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{formatDate(record.appointment_date)} · {record.appointment_time.slice(0, 5)}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{record.doctor_title ? `${record.doctor_title} ` : ''}{record.doctor_name}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{record.department}</p>
                      </div>
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Tamamlandı</span>
                    </div>
                    {hasMeaningfulFollowUp(record) && (
                      <div className="mt-5 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
                        <p className="font-semibold text-cyan-800 dark:text-cyan-200">Kontrol planı</p>
                        {record.follow_up_date && <p className="mt-2">Tarih: {formatDate(record.follow_up_date)}</p>}
                        {record.follow_up_note && <p className="mt-2 text-slate-700 dark:text-slate-200">{record.follow_up_note}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-10" aria-labelledby="my-prescriptions-title">
        <div className="flex items-center gap-3"><Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-300" /><h2 id="my-prescriptions-title" className="text-2xl font-bold text-slate-950 dark:text-white">Reçetelerim</h2></div>
        {prescriptionsLoading && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Reçeteleriniz yükleniyor...</div>}
        {!prescriptionsLoading && prescriptionsError && <div role="alert" className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Reçeteleriniz şu anda yüklenemedi. Lütfen tekrar deneyin.</div>}
        {!prescriptionsLoading && !prescriptionsError && prescriptions.length === 0 && <div className={`mt-5 rounded-2xl p-8 text-center ${cardClass}`}>Henüz reçete kaydınız bulunmuyor.</div>}
        {!prescriptionsLoading && !prescriptionsError && prescriptions.length > 0 && <div className="mt-5 space-y-5">{prescriptions.map((prescription) => <article key={prescription.prescription_id} className={`rounded-2xl p-6 ${cardClass}`}><header><p className="font-semibold">{formatDate(prescription.appointment_date)} · {prescription.appointment_time.slice(0, 5)}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{prescription.doctor_title ? `${prescription.doctor_title} ` : ''}{prescription.doctor_name} · {prescription.department}</p></header><div className="mt-5 space-y-3">{prescription.items.map((item) => <section key={`${item.sort_order}-${item.medication_name}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold">{item.medication_name}</h3><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{item.dose_instruction && <div><dt className="text-slate-500">Doz / Kullanım Miktarı</dt><dd>{item.dose_instruction}</dd></div>}{item.frequency && <div><dt className="text-slate-500">Kullanım Sıklığı</dt><dd>{item.frequency}</dd></div>}{item.duration && <div><dt className="text-slate-500">Süre</dt><dd>{item.duration}</dd></div>}{item.usage_note && <div><dt className="text-slate-500">Ek Kullanım Notu</dt><dd className="whitespace-pre-wrap">{item.usage_note}</dd></div>}</dl></section>)}</div>{prescription.prescription_note && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900"><p className="font-semibold">Doktor notu</p><p className="mt-2 whitespace-pre-wrap">{prescription.prescription_note}</p></div>}</article>)}</div>}
      </section>
      <LabOrdersSection cardClass={cardClass} />
      <MedicalDocumentsSection cardClass={cardClass} />
    </div>
  );
};

export default PatientHealthRecordPage;
