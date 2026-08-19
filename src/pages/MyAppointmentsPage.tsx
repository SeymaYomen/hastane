import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppointmentQRCode from '../components/AppointmentQRCode';
import { supabase } from '../lib/supabase';

interface Appointment {
  id: string;
  department: string;
  doctor: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientTCKN: string;
  notes?: string;
  rating?: number;
  price: number;
  isFirstVisit: boolean;
}

interface CancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  currentRating: number;
}

const CancelDialog: React.FC<CancelDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Randevu İptali</h3>
        <p className="text-gray-600 mb-6">
          Randevunuzu iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            İptal Et
          </button>
        </div>
      </div>
    </div>
  );
};

const RatingDialog: React.FC<RatingDialogProps> = ({ isOpen, onClose, onSubmit, currentRating }) => {
  const [rating, setRating] = useState(currentRating);
  const [hover, setHover] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Doktor Değerlendirmesi</h3>
        <div className="flex justify-center space-x-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(null)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  (hover || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Vazgeç
          </button>
          <button
            onClick={() => onSubmit(rating)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Değerlendir
          </button>
        </div>
      </div>
    </div>
  );
};

const MyAppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
  const loadAppointments = async () => {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        console.error('Kullanıcı oturumu bulunamadı.');
        return;
      }

      const {
        data: appointmentRows,
        error: appointmentsError
      } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          notes,
          price,
          is_first_visit,
          rating,
          doctors (
            full_name,
            department
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      const {
        data: profile,
        error: profileError
      } = await supabase
        .from('users')
        .select('full_name, phone, email, tckn')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Profil bilgileri alınamadı:', profileError);
      }

      const mappedAppointments: Appointment[] = (appointmentRows || []).map(
        (row: any) => ({
          id: row.id,
          department: row.doctors?.department || 'Bölüm bilgisi yok',
          doctor: row.doctors?.full_name || 'Doktor bilgisi yok',
          date: row.date,
          time: row.time,
          status: row.status,
          patientName: profile?.full_name || '',
          patientPhone: profile?.phone || '',
          patientEmail: profile?.email || user.email || '',
          patientTCKN: profile?.tckn || '',
          notes: row.notes || undefined,
          rating: row.rating || undefined,
          price: Number(row.price || 0),
          isFirstVisit: row.is_first_visit
        })
      );

      setAppointments(mappedAppointments);
    } catch (error) {
      console.error('Randevular yüklenirken hata oluştu:', error);
    }
  };

  loadAppointments();
}, []);

  function handleCancelClick(id: string) {
    setSelectedAppointmentId(id);
    setCancelDialogOpen(true);
  }

  const handleCancelConfirm = async () => {
  if (!selectedAppointmentId) return;

  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', selectedAppointmentId);

    if (error) throw error;

    setAppointments(prevAppointments =>
      prevAppointments.map(app =>
        app.id === selectedAppointmentId
          ? { ...app, status: 'cancelled' as const }
          : app
      )
    );

    setCancelDialogOpen(false);
    setSelectedAppointmentId(null);
  } catch (error) {
    console.error('Randevu iptal edilirken hata oluştu:', error);
    alert('Randevu iptal edilirken bir hata oluştu.');
  }
};

  const handleRatingClick = (id: string) => {
    setSelectedAppointmentId(id);
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = async (rating: number) => {
  if (!selectedAppointmentId) return;

  try {
    const { error } = await supabase
      .from('appointments')
      .update({ rating })
      .eq('id', selectedAppointmentId);

    if (error) throw error;

    setAppointments(prevAppointments =>
      prevAppointments.map(app =>
        app.id === selectedAppointmentId
          ? { ...app, rating }
          : app
      )
    );

    setRatingDialogOpen(false);
    setSelectedAppointmentId(null);
  } catch (error) {
    console.error('Değerlendirme kaydedilirken hata oluştu:', error);
    alert('Değerlendirme kaydedilirken bir hata oluştu.');
  }
};
  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  const isAppointmentPassed = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hours, minutes);
    return appointmentDate < new Date();
  };

  const sortAppointments = (a: Appointment, b: Appointment) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  };

  const upcomingAppointments = appointments
  .filter(
    app =>
      app.status === 'upcoming' &&
      !isAppointmentPassed(app.date, app.time)
  )
  .sort(sortAppointments);

const pastAppointments = appointments
  .filter(
    app =>
      app.status !== 'upcoming' ||
      isAppointmentPassed(app.date, app.time)
  )
  .sort((a, b) => sortAppointments(b, a));

  return (
    <div className="pt-16 pb-16 bg-dark-900 min-h-screen">
      <CancelDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelConfirm}
      />
      <RatingDialog
        isOpen={ratingDialogOpen}
        onClose={() => setRatingDialogOpen(false)}
        onSubmit={handleRatingSubmit}
        currentRating={appointments.find(app => app.id === selectedAppointmentId)?.rating || 0}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-white mb-4">Randevularım</h1>
          <p className="text-lg text-gray-300">
            Randevularınızı görüntüleyin, iptal edin veya yeni randevu alın.
          </p>
        </div>

        {/* New Appointment Button */}
        <div className="max-w-4xl mx-auto mb-8">
          <Link
            to="/appointment"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Yeni Randevu Al
          </Link>
        </div>

        {/* Appointments Lists */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upcoming Appointments */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Yaklaşan Randevular</h2>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-dark-800 rounded-lg shadow-md p-6 animate-fade-in border border-dark-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-white">
                          {appointment.department}
                        </h3>
                        <p className="text-gray-300">{appointment.doctor}</p>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-gray-400">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(appointment.date)}
                          </div>
                          <div className="flex items-center text-gray-400">
                            <Clock className="h-4 w-4 mr-1" />
                            {appointment.time}
                          </div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/50 text-green-200">
                            Yaklaşan
                          </span>
                        </div>
                        <div className="text-blue-400 font-medium mt-2">
                          Muayene Ücreti: {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: 'TRY'
                          }).format(appointment.price)}
                          {!appointment.isFirstVisit && (
                            <span className="text-green-400 text-sm ml-2">(Kontrol indirimi uygulandı)</span>
                          )}
                        </div>
                        <div className="mt-4">
                          <AppointmentQRCode appointment={appointment} />
                        </div>
                      </div>

                      {appointment.status === 'upcoming' && (
                        <button
                          onClick={() => handleCancelClick(appointment.id)}
                          className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-dark-800 rounded-lg shadow-md border border-dark-700">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">Yaklaşan randevunuz yok</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Yeni bir randevu almak için yukarıdaki butonu kullanabilirsiniz.
                </p>
              </div>
            )}
          </div>

          {/* Past Appointments */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Geçmiş Randevular</h2>
            {pastAppointments.length > 0 ? (
              <div className="space-y-4">
                {pastAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-dark-800 rounded-lg shadow-md p-6 border border-dark-700"
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">
                        {appointment.department}
                      </h3>
                      <p className="text-gray-300">{appointment.doctor}</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(appointment.date)}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-4 w-4 mr-1" />
                          {appointment.time}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          appointment.status !== 'cancelled'
                            ? 'bg-gray-900/50 text-gray-200' 
                            : 'bg-red-900/50 text-red-200'
                        }`}>
                          {appointment.status === 'cancelled'
  ? 'İptal Edildi'
  : 'Tamamlandı'}
                        </span>
                      </div>
                      
                      {appointment.status !== 'cancelled' && isAppointmentPassed(appointment.date, appointment.time) && (
                        <div className="mt-4">
                          {appointment.rating ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-300">Değerlendirme:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                      star <= appointment.rating!
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={() => handleRatingClick(appointment.id)}
                                className="text-blue-400 hover:text-blue-300 text-sm ml-2"
                              >
                                Değerlendirmeyi Güncelle
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRatingClick(appointment.id)}
                              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                              Doktoru Değerlendir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-dark-800 rounded-lg shadow-md border border-dark-700">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">Geçmiş randevunuz yok</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Tamamlanan veya iptal edilen randevularınız burada görüntülenecektir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAppointmentsPage;