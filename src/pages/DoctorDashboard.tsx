import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getDoctorDayAppointments,
  getLocalDateString,
  type DoctorDayAppointment,
} from '../services/doctor/doctorService';
const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<DoctorDayAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoadingAppointments(true);
        setAppointmentsError('');

        const today = getLocalDateString();
        const data = await getDoctorDayAppointments(today);

        setAppointments(data);
      } catch (error) {
        console.error('Doktor randevuları yüklenemedi:', error);
        setAppointmentsError('Bugünkü randevular yüklenemedi.');
      } finally {
        setLoadingAppointments(false);
      }
    };

    loadAppointments();
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Üst başlık */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 p-3 dark:bg-cyan-950">
              <Stethoscope className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
            </div>

            <div>
              <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                Doktor Paneli
              </p>

              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Klinik çalışma alanı
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Randevularınızı görüntüleyin, muayene kayıtlarını yönetin ve
            klinik süreçlerinizi tek ekrandan takip edin.
          </p>
        </div>

        {/* Üst kartlar */}
        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/50">
                <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
  Bugünkü Randevular
</h2>

<div className="mt-4 space-y-3">
  {loadingAppointments && (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Randevular yükleniyor...
    </p>
  )}

  {!loadingAppointments && appointmentsError && (
    <p className="text-sm text-red-500">
      {appointmentsError}
    </p>
  )}

  {!loadingAppointments &&
    !appointmentsError &&
    appointments.length === 0 && (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Bugün için atanmış randevu bulunmuyor.
      </p>
    )}

  {!loadingAppointments &&
    !appointmentsError &&
    appointments.map((appointment) => (
      <div
        key={appointment.appointment_id}
        className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {appointment.patient_name}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {appointment.appointment_time.slice(0, 5)}
            </p>
          </div>

          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
            {appointment.appointment_status}
          </span>
        </div>

        {appointment.appointment_notes && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {appointment.appointment_notes}
          </p>
        )}
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          {appointment.appointment_status === 'cancelled' ? (
            <span className="inline-flex rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
              İptal edildi
            </span>
          ) : (
            <Link
              to={`/doctor/appointment/${appointment.appointment_id}`}
              className="inline-flex rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-cyan-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              Muayeneyi Aç
            </Link>
          )}
        </div>
      </div>
    ))}
</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <div className="inline-flex rounded-xl bg-violet-50 p-3 dark:bg-violet-950/50">
                <ClipboardList className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Muayene Kayıtları
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Günlük randevularınızdan muayene kayıtlarını ve kontrol planlarını yönetin.
            </p>
          </div>

          {/* AI görsel kimliği */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-6 shadow-sm dark:border-cyan-900/60 dark:from-cyan-950/40 dark:via-slate-900 dark:to-violet-950/40">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-300/20 blur-3xl" />

            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-3 text-white shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>

                <span className="rounded-full border border-cyan-200 bg-white/70 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-slate-900/70 dark:text-cyan-300">
                  Yakında
                </span>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Klinik Asistan
              </h2>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Doktor notlarını düzenleme ve klinik bilgileri özetleme
                özellikleri hazır olduğunda burada kullanılabilecek.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
