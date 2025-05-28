import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Calendar, Star, GraduationCap, Languages, Award, Clock, Search, Filter } from 'lucide-react';

const DoctorsPage = () => {
  const { doctors } = useData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const departments = [...new Set(doctors.map(doctor => doctor.department))];

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment ? doctor.department === selectedDepartment : true;
    
    return matchesSearch && matchesDepartment;
  });

  const handleAppointment = (doctor) => {
    localStorage.setItem('selectedDoctor', JSON.stringify({
      name: doctor.full_name,
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
                className="bg-dark-800 rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-2 border border-dark-700"
              >
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {doctor.title} {doctor.full_name}
                    </h3>
                    <p className="text-blue-400 font-medium">{doctor.department}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center text-gray-300">
                      <Award className="h-5 w-5 mr-2 text-blue-500" />
                      <span>{doctor.experience_years} Yıl Deneyim</span>
                    </div>

                    <div className="flex items-start">
                      <GraduationCap className="h-5 w-5 mr-2 text-blue-500 mt-1" />
                      <span className="text-gray-300">{doctor.education}</span>
                    </div>

                    <div>
                      <div className="flex items-center mb-2">
                        <Award className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-gray-300">Uzmanlık Alanları</span>
                      </div>
                      <ul className="list-disc list-inside text-gray-400 ml-7 space-y-1">
                        {doctor.specialties.map((specialty, index) => (
                          <li key={index}>{specialty}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center mb-2">
                        <Languages className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-gray-300">Konuştuğu Diller</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doctor.languages.map((language, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded text-sm"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center mb-2">
                        <Clock className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="text-gray-300">Çalışma Günleri</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doctor.working_days.map((day, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded text-sm"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAppointment(doctor)}
                    className="mt-6 w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
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