import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Star } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const DoctorsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const navigate = useNavigate();
  const { doctors } = useData();

  const getTitle = (years: number) => {
    if (years >= 20) return 'Prof. Dr.';
    if (years >= 15) return 'Doç. Dr.';
    if (years >= 10) return 'Uzm. Dr.';
    return 'Dr.';
  };

  const departments = [...new Set(doctors.map(doctor => doctor.department))];

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment ? doctor.department === selectedDepartment : true;
    
    return matchesSearch && matchesDepartment;
  });

  const handleDoctorClick = (doctor) => {
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

        {/* Search and Filter */}
        <div className="max-w-5xl mx-auto mb-10">
          <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-md flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Doktor adı veya bölüm ara..."
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 text-white placeholder-gray-400 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="w-full sm:w-56 pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">Tüm Bölümler</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-dark-800 rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-2 border border-dark-700 cursor-pointer"
                onClick={() => handleDoctorClick(doctor)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDoctorClick(doctor);
                    }}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Randevu Al
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-dark-800 rounded-lg">
            <div className="mx-auto w-24 h-24 bg-dark-700 rounded-full flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sonuç Bulunamadı</h3>
            <p className="text-gray-300 max-w-md mx-auto">
              Aramanızla eşleşen doktor bulunamadı. Lütfen farklı bir arama terimi kullanın veya filtreleri temizleyin.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('');
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-200 bg-blue-900/50 hover:bg-blue-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorsPage;