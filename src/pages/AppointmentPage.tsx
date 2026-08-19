import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Search, Phone, MessageSquareText, Loader2, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppointmentQRCode from '../components/AppointmentQRCode';
import { useData } from '../contexts/DataContext';

// Time slots by day type
const timeSlots = {
  weekday: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  weekend: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
};

const AppointmentPage = () => {
  const { doctors, departments } = useData();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientTCKN, setPatientTCKN] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [showUnavailableMessage, setShowUnavailableMessage] = useState(false);
  const [unavailableDoctor, setUnavailableDoctor] = useState('');
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);

 const departmentPrices: Record<string, number> = {
    'Kardiyoloji': 1200,
    'Nöroloji': 1100,
    'Genel Cerrahi': 1000,
    'Ortopedi': 950,
    'Göz Hastalıkları': 850,
    'Kulak Burun Boğaz': 800,
    'Üroloji': 900,
    'Dahiliye': 750,
    'Cildiye': 700,
    'Kadın Hastalıkları ve Doğum': 1000,
    'Fizik Tedavi ve Rehabilitasyon': 900,
    'Psikiyatri': 1000
  };

  useEffect(() => {
    const savedDoctor = localStorage.getItem('selectedDoctor');
    if (savedDoctor) {
      const { name, department } = JSON.parse(savedDoctor);
      setSelectedDepartment(department);
      setSelectedDoctor(name);
      localStorage.removeItem('selectedDoctor');
    }
    
    const chatbotDepartment = localStorage.getItem('selectedDepartment');
    if (chatbotDepartment) {
      setSelectedDepartment(chatbotDepartment);
      localStorage.removeItem('selectedDepartment');
    }
  }, []);

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      const date = new Date(selectedDate);
      const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      const doctor = doctors.find(d => d.full_name === selectedDoctor);
      
      if (doctor && doctor.working_days) {
        if (!doctor.working_days.includes(dayName)) {
          setShowUnavailableMessage(true);
          setUnavailableDoctor(selectedDoctor);
          
          // Find available doctors for this day
          const available = doctors
            .filter(d => d.working_days.includes(dayName))
            .map(d => d.full_name);
          setAvailableDoctors(available);
        } else {
          setShowUnavailableMessage(false);
          setUnavailableDoctor('');
          setAvailableDoctors([]);
          
          // Weekend schedule for Saturday
          if (dayName === 'Cumartesi') {
            setAvailableTimes(timeSlots.weekend);
          } else {
            setAvailableTimes(timeSlots.weekday);
          }
        }
      }
    }
  }, [selectedDate, selectedDoctor, doctors]);

  // Function to check if a date is available
  const isDateAvailable = (date: Date) => {
    const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
    const doctor = doctors.find(d => d.full_name === selectedDoctor);
    return doctor ? doctor.working_days.includes(dayName) : false;
  };

  // Function to format date for display
  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!selectedDepartment) newErrors.department = 'Lütfen bir bölüm seçin';
        if (!selectedDoctor) newErrors.doctor = 'Lütfen bir doktor seçin';
        break;
      case 2:
        if (!selectedDate) newErrors.date = 'Lütfen bir tarih seçin';
        if (!selectedTime) newErrors.time = 'Lütfen bir saat seçin';
        break;
      case 3:
        if (!patientName.trim()) {
          newErrors.name = 'Ad Soyad zorunludur';
        } else if (patientName.trim().split(' ').length < 2) {
          newErrors.name = 'Lütfen ad ve soyadınızı girin';
        }
        
        if (!patientPhone) {
          newErrors.phone = 'Telefon numarası zorunludur';
        } else if (!/^[0-9]{11}$/.test(patientPhone)) {
          newErrors.phone = 'Telefon numarası 11 haneli olmalıdır';
        }
        
        if (!patientTCKN) {
          newErrors.tckn = 'T.C. Kimlik No zorunludur';
        } else if (!/^[0-9]{11}$/.test(patientTCKN)) {
          newErrors.tckn = 'T.C. Kimlik No 11 haneli olmalıdır';
        }
        
        if (!patientEmail) {
          newErrors.email = 'E-posta adresi zorunludur';
        } else if (!/\S+@\S+\.\S+/.test(patientEmail)) {
          newErrors.email = 'Geçerli bir e-posta adresi girin';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);

    const existingAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const isFirstVisit = !existingAppointments.some(
      (app: any) => app.department === selectedDepartment && app.patientTCKN === patientTCKN
    );

    const appointmentPrice = isFirstVisit ? 
      departmentPrices[selectedDepartment] : 
      departmentPrices[selectedDepartment] * 0.8;

    const newAppointment = {
      id: Date.now().toString(),
      department: selectedDepartment,
      doctor: selectedDoctor,
      date: selectedDate,
      time: selectedTime,
      status: 'upcoming',
      patientName,
      patientPhone,
      patientEmail,
      patientTCKN,
      notes,
      price: appointmentPrice,
      isFirstVisit
    };

    try {
      const updatedAppointments = [...existingAppointments, newAppointment];
      localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
      setIsSubmitting(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/my-appointments');
      }, 2000);
    } catch (error) {
      console.error('Error saving appointment:', error);
      setIsSubmitting(false);
      alert('Randevu kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Adım 1: Bölüm ve Doktor Seçimi</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bölüm Seçimi*
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.department ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="" disabled>
  Bölüm Seçiniz
</option>

{departments.map((department) => (
  <option key={department.id} value={department.name}>
    {department.name}
  </option>
))}
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doktor Seçimi*
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  setSelectedDate('');
                  setSelectedTime('');
                  setShowUnavailableMessage(false);
                }}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.doctor ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={!selectedDepartment}
              >
                <option value="">Doktor Seçiniz</option>
                {doctors
                  .filter(doctor => doctor.department === selectedDepartment)
                  .map(doctor => (
                    <option key={doctor.id} value={doctor.full_name}>
                      {doctor.full_name} ({doctor.working_days.join(', ')})
                    </option>
                  ))
                }
              </select>
              {errors.doctor && (
                <p className="mt-1 text-sm text-red-600">{errors.doctor}</p>
              )}
              {selectedDoctor && (
                <p className="mt-2 text-sm text-gray-600">
                  Seçilen doktorun çalışma günleri: {doctors.find(d => d.full_name === selectedDoctor)?.working_days.join(', ')}
                </p>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Adım 2: Randevu Zamanı</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Randevu Tarihi*
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
              {selectedDate && (
                <p className="mt-2 text-sm text-gray-600">
                  Seçilen tarih: {formatDateForDisplay(selectedDate)}
                </p>
              )}

              {showUnavailableMessage && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <p className="text-yellow-700">
                        {unavailableDoctor} seçilen tarihte hizmet vermemektedir.
                      </p>
                      {availableDoctors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-yellow-700 font-medium">Bu tarihte çalışan doktorlarımız:</p>
                          <ul className="mt-1 list-disc list-inside">
                            {availableDoctors.map((doctor) => (
                              <li key={doctor} className="text-yellow-700">
                                {doctor}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              setSelectedDoctor(availableDoctors[0]);
                              setShowUnavailableMessage(false);
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Müsait doktora geç
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Randevu Saati*
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.time ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={!selectedDate || showUnavailableMessage}
              >
                <option value="">Saat Seçiniz</option>
                {availableTimes.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {errors.time && (
                <p className="mt-1 text-sm text-red-600">{errors.time}</p>
              )}
              {selectedDate && showUnavailableMessage && (
                <p className="mt-2 text-sm text-red-600">
                  Lütfen önce uygun bir doktor seçin.
                </p>
              )}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Adım 3: Kişisel Bilgiler</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad*
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                T.C. Kimlik No*
              </label>
              <input
                type="text"
                value={patientTCKN}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) setPatientTCKN(value);
                }}
                placeholder="11 haneli TC Kimlik No"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.tckn ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.tckn && (
                <p className="mt-1 text-sm text-red-600">{errors.tckn}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon*
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) setPatientPhone(value);
                }}
                placeholder="05XX XXX XX XX"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta*
              </label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="ornek@email.com"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar (İsteğe bağlı)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Doktorunuza iletmek istediğiniz bilgiler..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="pt-16 pb-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Online Randevu Sistemi</h1>
          <p className="text-lg text-gray-600">
            Sağlık Takip'ten kolayca online randevu alın. 
            Uzman doktorlarımıza birkaç adımda ulaşabilirsiniz.
          </p>
        </div>
        
        {isSuccess ? (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Randevunuz Başarıyla Oluşturuldu!</h2>
              <div className="mb-6 text-left max-w-md mx-auto">
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Randevu Bilgileri</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li><span className="font-medium">Bölüm:</span> {selectedDepartment}</li>
                    <li><span className="font-medium">Doktor:</span> {selectedDoctor}</li>
                    <li><span className="font-medium">Tarih:</span> {selectedDate}</li>
                    <li><span className="font-medium">Saat:</span> {selectedTime}</li>
                    <li><span className="font-medium">Hasta:</span> {patientName}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {[1, 2, 3].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`flex items-center ${
                      stepNumber < step ? 'text-blue-600' : 
                      stepNumber === step ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      stepNumber < step ? 'bg-blue-600 border-blue-600 text-white' :
                      stepNumber === step ? 'border-blue-600 text-blue-600' : 'border-gray-300'
                    }`}>
                      {stepNumber}
                    </div>
                    <span className="ml-2 text-sm font-medium">
                      {stepNumber === 1 ? 'Bölüm' :
                       stepNumber === 2 ? 'Zaman' : 'Bilgiler'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2"></div>
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-300"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <form onSubmit={handleSubmit}>
                {renderStepContent()}
                
                <div className="mt-8 flex justify-between">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Geri
                    </button>
                  )}
                  
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ml-auto"
                    >
                      İleri
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 ml-auto disabled:bg-green-400"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          İşleniyor...
                        </>
                      ) : (
                        'Randevuyu Onayla'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentPage;