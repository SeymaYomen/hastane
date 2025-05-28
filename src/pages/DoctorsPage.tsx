import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Calendar, Star, GraduationCap, Languages, Award, Clock } from 'lucide-react';

const DoctorsPage = () => {
  const { doctors } = useData();
  const navigate = useNavigate();

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
      </div>
    </div>
  );
};

export default DoctorsPage;