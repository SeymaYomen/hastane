import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-blue-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Elazığ<span className="text-teal-400">Sağlık</span></h3>
            <p className="text-gray-300 mb-4">
              Elazığ'ın sağlık ihtiyaçlarına yönelik modern çözümler sunan hastanemiz, 
              yüksek kaliteli sağlık hizmetlerine kolay erişim sağlamaktadır.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Hızlı Erişim</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-teal-400 transition-colors">Ana Sayfa</Link>
              </li>
              <li>
                <Link to="/appointment" className="text-gray-300 hover:text-teal-400 transition-colors">Randevu Al</Link>
              </li>
              <li>
                <Link to="/departments" className="text-gray-300 hover:text-teal-400 transition-colors">Bölümlerimiz</Link>
              </li>
              <li>
                <Link to="/doctors" className="text-gray-300 hover:text-teal-400 transition-colors">Doktorlarımız</Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Hakkımızda</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">İletişim</a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Hizmetlerimiz</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Acil Servis</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Laboratuvar</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Radyoloji</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Diş Sağlığı</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Fizik Tedavi</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-teal-400 transition-colors">Göz Sağlığı</a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-semibold mb-4">İletişim</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin size={20} className="text-teal-400 mt-1 flex-shrink-0" />
                <span className="text-gray-300">Fırat Üniversitesi Kampüsü, Elazığ Merkez, 23119</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={20} className="text-teal-400 flex-shrink-0" />
                <span className="text-gray-300">0424 233 44 55</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={20} className="text-teal-400 flex-shrink-0" />
                <span className="text-gray-300">info@elazigsaglik.com</span>
              </li>
              <li className="flex items-start space-x-3">
                <Clock size={20} className="text-teal-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-300">Pazartesi - Cuma: 08:00 - 18:00</p>
                  <p className="text-gray-300">Cumartesi: 08:00 - 14:00</p>
                  <p className="text-gray-300">Pazar: Kapalı (Acil servis 24 saat açık)</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-6">
          <p className="text-center text-gray-400">
            &copy; {new Date().getFullYear()} ElazığSağlık. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;