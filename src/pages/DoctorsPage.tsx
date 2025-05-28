import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const DoctorsPage = () => {
  const navigate = useNavigate();
  const { doctors } = useData();

  const getTitle = (years: number) => {
    if (years >= 20) return 'Prof. Dr.';
    if (years >= 15) return 'Doç. Dr.';
    if (years >= 10) return 'Uzm. Dr.';
    return 'Dr.';
  };

  const handleAppointment = (doctor) => {
    localStorage.setItem('selectedDoctor', JSON.stringify({
      name: `${getTitle(doctor.experience_years)} ${doctor.full_name}`,
      department: doctor.department
    }));
    navigate('/appointment');
  };

  return (
    <div className="pt-16 pb-16 bg-dark-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-white mb-4">Doktorlarımız</h1>
          <p className="text-lg text-gray-300">
            Sağlık Takip'te alanında uzman, deneyimli doktorlarımızla sizlere en iyi sağlık hizmetini sunuyoruz.
          </p>
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-dark-800 rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-2 border border-dark-700"
            >
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">
                    {getTitle(doctor.experience_years)} {doctor.full_name}
                  </h3>
                  <p className="text-blue-400 font-medium">{doctor.department}</p>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-gray-300 w-28">Deneyim:</span>
                    <span className="text-gray-400">{doctor.experience_years} yıl</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-gray-300 w-28">Eğitim:</span>
                    <span className="text-gray-400">{doctor.education}</span>
                  </div>
                  <div className="flex items-start mb-2">
                    <span className="font-medium text-gray-300 w-28">Uzmanlık:</span>
                    <div>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        {doctor.specialties.map((specialty, index) => (
                          <li key={index} className="text-sm">{specialty}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-gray-300 w-28">Diller:</span>
                    <span className="text-gray-400">{doctor.languages.join(', ')}</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="font-medium text-gray-300 block mb-2">Çalışma Günleri:</span>
                  <div className="flex flex-wrap gap-1">
                    {doctor.working_days.map((day, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-900/50 text-blue-200 text-xs px-2 py-1 rounded"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => handleAppointment(doctor)}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Randevu Al
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorsPage;