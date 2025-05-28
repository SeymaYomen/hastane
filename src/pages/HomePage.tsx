import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Award, Phone, Clock, MessageSquareText } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: <Calendar className="h-8 w-8 text-blue-800" />,
      title: 'Online Randevu',
      description: 'Hastane ziyaretinizi kolayca planlayın ve sıra beklemeden randevu alın.'
    },
    {
      icon: <Award className="h-8 w-8 text-blue-800" />,
      title: 'Uzman Doktorlar',
      description: 'Alanında uzman doktorlarımızla kaliteli sağlık hizmeti alın.'
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-blue-800" />,
      title: 'Modern Teknoloji',
      description: 'En son tıbbi cihazlar ve teknolojilerle donatılmış tesislerimiz.'
    },
    {
      icon: <MessageSquareText className="h-8 w-8 text-blue-800" />,
      title: 'Yapay Zeka Desteği',
      description: 'Hastalık tahmin sistemi ile semptomlarınıza göre ön değerlendirme.'
    }
  ];

  const departments = [
    {
      name: 'Kardiyoloji',
      image: 'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      description: 'Kalp ve damar hastalıklarının teşhis ve tedavisi'
    },
    {
      name: 'Nöroloji',
      image: 'https://images.pexels.com/photos/4226140/pexels-photo-4226140.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      description: 'Sinir sistemi hastalıklarının tanı ve tedavisi'
    },
    {
      name: 'Ortopedi',
      image: 'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      description: 'Kas ve iskelet sistemi rahatsızlıklarının tedavisi'
    },
    {
      name: 'Göz Hastalıkları',
      image: 'https://images.pexels.com/photos/5752287/pexels-photo-5752287.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      description: 'Göz ve görme ile ilgili hastalıkların teşhis ve tedavisi'
    }
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-r from-blue-900 to-blue-700">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)',
            opacity: '0.2'
          }}
        ></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative h-full flex flex-col justify-center">
          <div className="max-w-2xl animate-slide-up">
            <div className="text-teal-400 text-xl mb-4 font-medium">
              Hoş Geldiniz, Sağlıklı Günler Dileriz!
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Sağlığınız İçin En İyi Takip ve Hizmet
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Modern teknoloji ve uzman kadromuzla sağlık hizmetlerine erişimi kolaylaştırıyoruz. 
              Online randevu sistemimizle zaman kazanın.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/appointment"
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-300 text-center"
              >
                Randevu Al
              </Link>
              <Link
                to="/departments"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-300 text-center"
              >
                Bölümlerimiz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contact Section */}
      <section className="bg-white py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-600 rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Phone className="h-10 w-10 text-white mr-4" />
              <div>
                <h3 className="text-white text-lg font-bold">Acil Yardım Hattı</h3>
                <p className="text-red-100">7/24 Hizmet</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-white">112</div>
            <div className="hidden md:block h-12 w-0.5 bg-red-400 mx-6"></div>
            <div className="flex items-center mt-4 md:mt-0">
              <Phone className="h-10 w-10 text-white mr-4" />
              <div>
                <h3 className="text-white text-lg font-bold">Hastane Danışma</h3>
                <p className="text-red-100">Bilgi ve Destek</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-white">0424 233 44 55</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Neden Biz?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              ElazığSağlık olarak hastalarımıza en iyi hizmeti sunmak için çalışıyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Bölümlerimiz</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Farklı uzmanlık alanlarında deneyimli doktorlarımız ve modern ekipmanlarımızla hizmetinizdeyiz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {departments.map((department, index) => (
              <div
                key={index}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 group"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={department.image}
                    alt={department.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{department.name}</h3>
                  <p className="text-gray-600 mb-4">{department.description}</p>
                  <Link
                    to="/departments"
                    className="text-blue-800 hover:text-blue-600 font-medium inline-flex items-center"
                  >
                    Detaylı Bilgi
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/departments"
              className="inline-block bg-blue-800 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-300"
            >
              Tüm Bölümlerimiz
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-teal-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Sağlığınız İçin Hemen Randevu Alın
            </h2>
            <p className="text-xl text-teal-100 mb-8">
              Online randevu sistemimiz ile hızlıca doktorlarımızdan randevu alabilir, 
              sağlık hizmetlerimizden kolayca faydalanabilirsiniz.
            </p>
            <Link
              to="/appointment"
              className="inline-block bg-white hover:bg-gray-100 text-teal-800 font-medium py-3 px-8 rounded-lg transition-colors duration-300"
            >
              Hemen Randevu Al
            </Link>
          </div>
        </div>
      </section>

      {/* Working Hours */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-12">
                <div className="flex items-center mb-6">
                  <Clock className="h-8 w-8 text-blue-800 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Çalışma Saatlerimiz</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-700 font-medium">Pazartesi - Cuma</span>
                    <span className="text-gray-900">08:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-700 font-medium">Cumartesi</span>
                    <span className="text-gray-900">08:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-700 font-medium">Pazar</span>
                    <span className="text-gray-900">Kapalı</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-700 font-medium">Acil Servis</span>
                    <span className="text-red-600 font-medium">7/24 Açık</span>
                  </div>
                </div>
                <div className="mt-8">
                  <a
                    href="tel:+904242334455"
                    className="flex items-center text-blue-800 hover:text-blue-600 font-medium"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    <span>0424 233 44 55</span>
                  </a>
                </div>
              </div>
              <div 
                className="h-full bg-cover bg-center"
                style={{ 
                  backgroundImage: 'url(https://images.pexels.com/photos/1170979/pexels-photo-1170979.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260)'
                }}
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;