import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Brain, Bone, Eye, Ear, Activity, User, Droplet, Stethoscope } from 'lucide-react';

const DepartmentsPage = () => {
  const departments = [
    {
      id: 1,
      name: 'Kardiyoloji',
      icon: <Heart className="h-10 w-10 text-red-600" />,
      description:
        'Kalp ve damar hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Kalp yetmezliği, koroner arter hastalığı, ritim bozuklukları ve hipertansiyon gibi hastalıkların tedavisini sağlar.',
      services: ['EKG', 'Ekokardiografi', 'Efor Testi', 'Holter Monitörizasyonu', 'Anjiyografi'],
      doctors: ['Dr. Ahmet Yılmaz', 'Dr. Ayşe Demir', 'Dr. Mehmet Kaya'],
    },
    {
      id: 2,
      name: 'Nöroloji',
      icon: <Brain className="h-10 w-10 text-purple-600" />,
      description:
        'Beyin, omurilik ve sinir sistemi hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Baş ağrıları, migren, epilepsi, inme ve nörodejeneratif hastalıkları tedavi eder.',
      services: ['EEG', 'EMG', 'Uyku Testi', 'Lomber Ponksiyon', 'Nöropsikolojik Testler'],
      doctors: ['Dr. Zeynep Aydın', 'Dr. Kemal Şahin', 'Dr. Selin Yıldız'],
    },
    {
      id: 3,
      name: 'Ortopedi',
      icon: <Bone className="h-10 w-10 text-amber-600" />,
      description:
        'Kas ve iskelet sistemi hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Kırıklar, çıkıklar, bağ yaralanmaları, eklem hastalıkları ve omurga problemlerini tedavi eder.',
      services: ['Artroskopi', 'Eklem Protezi', 'Kırık Tedavisi', 'Fizik Tedavi', 'Spor Yaralanmaları'],
      doctors: ['Dr. Emre Güneş', 'Dr. Burak Akın', 'Dr. Deniz Yücel'],
    },
    {
      id: 4,
      name: 'Göz Hastalıkları',
      icon: <Eye className="h-10 w-10 text-blue-600" />,
      description:
        'Göz ve görme ile ilgili hastalıkların teşhis ve tedavisi ile ilgilenen bölüm. Katarakt, glokom, şaşılık, retina hastalıkları ve göz kuruluğu gibi sorunları tedavi eder.',
      services: ['Göz Muayenesi', 'Görme Alanı Testi', 'Katarakt Ameliyatı', 'Göz İçi Basınç Ölçümü', 'Lazer Tedavisi'],
      doctors: ['Dr. Elif Doğan', 'Dr. Murat Arslan', 'Dr. Sema Çelik'],
    },
    {
      id: 5,
      name: 'Kulak Burun Boğaz',
      icon: <Ear className="h-10 w-10 text-orange-600" />,
      description:
        'Kulak, burun, boğaz, baş ve boyun bölgesi hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. İşitme kaybı, sinüzit, geniz eti, bademcik iltihabı ve ses kısıklığı gibi hastalıkları tedavi eder.',
      services: ['İşitme Testi', 'Endoskopik Muayene', 'Burun ve Sinüs Ameliyatları', 'İşitme Cihazı Uygulamaları', 'Vertigo Tedavisi'],
      doctors: ['Dr. Cem Kartal', 'Dr. Seda Öz', 'Dr. Tarık Yalçın'],
    },
    {
      id: 6,
      name: 'Üroloji',
      icon: <Droplet className="h-10 w-10 text-cyan-600" />,
      description:
        'Böbrek, idrar yolları ve erkek üreme sistemi hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Böbrek taşları, prostat büyümesi, idrar yolu enfeksiyonları ve üriner sistem kanserleri gibi hastalıkları tedavi eder.',
      services: ['Sistoskopi', 'Taş Kırma', 'Prostat Biyopsisi', 'Endoskopik Cerrahi', 'Prostat Ameliyatı'],
      doctors: ['Dr. Serkan Demir', 'Dr. İsmail Yılmaz', 'Dr. Berna Aktaş'],
    },
    {
      id: 7,
      name: 'Dahiliye',
      icon: <Stethoscope className="h-10 w-10 text-green-600" />,
      description:
        'İç hastalıkları olarak da bilinen, erişkinlerde görülen hastalıkların teşhis ve tedavisi ile ilgilenen bölüm. Diyabet, tiroit hastalıkları, tansiyon, kolesterol yüksekliği ve enfeksiyon hastalıklarını tedavi eder.',
      services: ['Genel Sağlık Kontrolü', 'Diyabet Takibi', 'Tiroit Fonksiyon Testleri', 'Aşılama', 'Beslenme Danışmanlığı'],
      doctors: ['Dr. Mert Ergin', 'Dr. Canan Aksoy', 'Dr. Serdar Kara'],
    },
    {
      id: 8,
      name: 'Cildiye',
      icon: <User className="h-10 w-10 text-pink-600" />,
      description:
        'Deri, saç ve tırnak hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Egzama, sedef hastalığı, akne, mantar enfeksiyonları ve alerjik deri hastalıklarını tedavi eder.',
      services: ['Cilt Biyopsisi', 'Siğil Tedavisi', 'Lazer Tedavisi', 'Botoks ve Dolgu', 'Saç Dökülmesi Tedavisi'],
      doctors: ['Dr. Aylin Koç', 'Dr. Hakan Ateş', 'Dr. Şule Yıldırım'],
    },
    {
      id: 9,
      name: 'Kardiyoloji',
      icon: <Activity className="h-10 w-10 text-red-600" />,
      description:
        'Kalp ve damar hastalıklarının teşhis ve tedavisi ile ilgilenen bölüm. Kalp yetmezliği, koroner arter hastalığı, ritim bozuklukları ve hipertansiyon gibi hastalıkların tedavisini sağlar.',
      services: ['EKG', 'Ekokardiografi', 'Efor Testi', 'Holter Monitörizasyonu', 'Anjiyografi'],
      doctors: ['Dr. Ahmet Yılmaz', 'Dr. Ayşe Demir', 'Dr. Mehmet Kaya'],
    },
  ];

  return (
    <div className="pt-16 pb-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bölümlerimiz</h1>
          <p className="text-lg text-gray-600">
            ElazığSağlık'ta alanında uzman doktorlarımız ve modern teknolojimizle
            birçok farklı bölümde hizmet vermekteyiz.
          </p>
        </div>

        {/* Departments grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {departments.map((department) => (
            <div
              key={department.id}
              className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-2"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-full mr-4">
                    {department.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{department.name}</h3>
                </div>
                
                <p className="text-gray-600 mb-6">{department.description}</p>
                
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Hizmetler</h4>
                  <ul className="space-y-1">
                    {department.services.map((service, index) => (
                      <li key={index} className="text-gray-600 flex items-center">
                        <svg
                          className="w-4 h-4 text-blue-800 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Doktorlarımız</h4>
                  <ul className="space-y-1">
                    {department.doctors.map((doctor, index) => (
                      <li key={index} className="text-gray-600">{doctor}</li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  to="/appointment"
                  className="block w-full text-center bg-blue-800 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300"
                >
                  Randevu Al
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sık Sorulan Sorular</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hangi bölüme başvurmalıyım?</h3>
              <p className="text-gray-600">
                Şikayetlerinize uygun bölümü seçmekte zorlanıyorsanız, öncelikle Dahiliye (İç Hastalıkları) bölümüne başvurabilir 
                veya chatbot asistanımızdan yardım alabilirsiniz. Doktorunuz gerekirse sizi ilgili bölüme yönlendirecektir.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Randevusuz muayene olabilir miyim?</h3>
              <p className="text-gray-600">
                Hasta yoğunluğuna göre değişmekle birlikte, randevusuz hastalar da kabul edilmektedir. 
                Ancak randevulu hastalara öncelik verildiği için bekleme süreniz uzayabilir. 
                En iyi hizmeti alabilmek için online randevu almanızı öneririz.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tüm bölümlerde SGK anlaşması var mı?</h3>
              <p className="text-gray-600">
                Evet, hastanemizin tüm bölümlerinde SGK anlaşması bulunmaktadır. 
                Ayrıca çeşitli özel sağlık sigortaları ile de anlaşmalı olarak hizmet vermekteyiz.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Laboratuvar sonuçlarımı nasıl öğrenebilirim?</h3>
              <p className="text-gray-600">
                Laboratuvar sonuçlarınızı hastanemiz web sitesinden, e-Nabız sisteminden veya
                telefonla hasta hizmetlerini arayarak öğrenebilirsiniz. Ayrıca sonuçlarınız hazır olduğunda
                SMS ile bilgilendirme de yapılmaktadır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentsPage;