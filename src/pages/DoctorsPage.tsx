import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Award, GraduationCap, Languages, Stethoscope, Clock } from 'lucide-react';
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
    <div className="pt-16 pb-16 bg-gradient-to-b from-blue-900 to-gray-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-4xl font-bold text-white mb-4">Doktorlarımız</h1>
          <p className="text-xl text-blue-200">
            Alanında uzman ve deneyimli doktor kadromuzla hizmetinizdeyiz
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-blue-600/20 rounded-full">
                    <Stethoscope className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-white">
                      {getTitle(doctor.experience_years)} {doctor.full_name}
                    </h3>
                    <p className="text-blue-400">{doctor.department}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-gray-300">
                    <Award className="h-5 w-5 mr-3 text-yellow-500" />
                    <span>{doctor.experience_years} Yıl Deneyim</span>
                  </div>

                  <div className="flex items-center text-gray-300">
                    <GraduationCap className="h-5 w-5 mr-3 text-blue-400" />
                    <span>{doctor.education}</span>
                  </div>

                  <div className="flex items-center text-gray-300">
                    <Languages className="h-5 w-5 mr-3 text-green-400" />
                    <span>{doctor.languages.join(', ')}</span>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-purple-400" />
                      Uzmanlık Alanları
                    </h4>
                    <ul className="list-disc list-inside text-gray-300 ml-2">
                      {doctor.specialties.map((specialty, index) => (
                        <li key={index} className="text-sm">{specialty}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-teal-400" />
                      Çalışma Günleri
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {doctor.working_days.map((day, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAppointment(doctor)}
                  className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-900 transition-all duration-300"
                >
                  <Calendar className="mr-2 h-5 w-5" />
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