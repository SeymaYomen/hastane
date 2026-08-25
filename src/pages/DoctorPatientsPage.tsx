import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getDoctorPatients, type DoctorPatient } from '../services/doctor/workspaceService';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR');

const DoctorPatientsPage = () => {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  useEffect(() => {
    void getDoctorPatients().then(setPatients).catch((loadError) => {
      console.error(loadError);
      setError('Hasta listesi yüklenemedi.');
    }).finally(() => setLoading(false));
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedSearch) return patients;
    return patients.filter((patient) =>
      patient.patient_name.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
    );
  }, [patients, search]);

  const surfaceClass = isHighContrast
    ? 'border-white bg-black text-white'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';
  const patientCardInteraction = isHighContrast
    ? 'hover:border-white hover:shadow-md active:bg-white/10'
    : 'hover:border-cyan-500 hover:shadow-md active:bg-cyan-50 dark:active:bg-cyan-950/30';

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <p className={`text-sm font-medium ${isHighContrast ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}`}>Hastalar</p>
      <h1 className={`text-3xl font-bold ${isHighContrast ? 'text-white' : 'text-slate-950 dark:text-white'}`}>Kendi hasta listeniz</h1>
      <p className={`mt-2 text-sm ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Yalnızca size atanmış randevusu bulunan hastalar gösterilir.</p>

      <div className={`mt-6 rounded-2xl border p-4 ${surfaceClass}`}>
        <label htmlFor="doctor-patient-search" className="text-sm font-medium">Hasta ara</label>
        <input id="doctor-patient-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hasta ara" className={`mt-2 block min-h-11 w-full rounded-lg border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-300 bg-transparent dark:border-slate-700'}`} />
      </div>

      {error && <p role="alert" className="mt-5 text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {filteredPatients.map((patient) => (
          <Link key={patient.patient_id} to={`/doctor/patients/${patient.patient_id}`} className={`rounded-2xl border p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${surfaceClass} ${patientCardInteraction}`}>
            <h2 className={`font-semibold ${isHighContrast ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{patient.patient_name}</h2>
            <div className={`mt-3 space-y-1.5 text-sm ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {patient.last_appointment_at
                ? <p>Son görüşme: {new Date(patient.last_appointment_at).toLocaleDateString('tr-TR')}</p>
                : <p>Henüz tamamlanmış görüşme yok</p>}
              <p>{patient.appointment_count} tamamlanmış görüşme</p>
              {patient.next_appointment_date && <p className={isHighContrast ? 'font-medium text-white' : 'font-medium text-cyan-700 dark:text-cyan-300'}>Sonraki randevu: {formatDate(patient.next_appointment_date)}</p>}
            </div>
          </Link>
        ))}
        {!loading && patients.length === 0 && <p className={isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}>Henüz hasta kaydı bulunmuyor.</p>}
        {!loading && patients.length > 0 && filteredPatients.length === 0 && <p role="status" className={isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}>Aramanıza uygun hasta bulunamadı.</p>}
      </div>
    </div>
  );
};

export default DoctorPatientsPage;
