import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDoctorPatients, type DoctorPatient } from '../services/doctor/workspaceService';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR');

const DoctorPatientsPage = () => {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void getDoctorPatients().then(setPatients).catch((loadError) => {
      console.error(loadError);
      setError('Hasta listesi yüklenemedi.');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Hastalar</p>
      <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Kendi hasta listeniz</h1>
      <p className="mt-2 text-sm text-slate-500">Yalnızca size atanmış randevusu bulunan hastalar gösterilir.</p>
      {error && <p className="mt-5 text-rose-600">{error}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {patients.map((patient) => (
          <Link key={patient.patient_id} to={`/doctor/patients/${patient.patient_id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="font-semibold text-slate-950 dark:text-white">{patient.patient_name}</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              {patient.last_appointment_at
                ? <p>Son görüşme: {new Date(patient.last_appointment_at).toLocaleDateString('tr-TR')}</p>
                : <p>Henüz tamamlanmış görüşme yok</p>}
              <p>{patient.appointment_count} tamamlanmış görüşme</p>
              {patient.next_appointment_date && <p className="font-medium text-cyan-700 dark:text-cyan-300">Sonraki randevu: {formatDate(patient.next_appointment_date)}</p>}
            </div>
          </Link>
        ))}
        {!loading && patients.length === 0 && <p className="text-slate-500">Henüz hasta kaydı bulunmuyor.</p>}
      </div>
    </div>
  );
};

export default DoctorPatientsPage;
