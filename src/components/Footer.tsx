import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { clinicConfig } from '../config/clinicConfig';

const Footer = () => {
  return (
    <footer className="bg-blue-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-semibold mb-4">{clinicConfig.clinicName}</h3>
            <p className="text-gray-300 mb-4">
              {clinicConfig.contact.city}'de sağlık ihtiyaçlarına yönelik modern çözümler sunan kuruluşumuz, 
              yüksek kaliteli sağlık hizmetlerine kolay erişim sağlamaktadır.
            </p>
            <div className="flex space-x-4 mt-4">
              {clinicConfig.socialMedia?.facebook && (
                <a href={clinicConfig.socialMedia.facebook} className="text-gray-300 hover:text-teal-400 transition-colors">
                  <Facebook size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.twitter && (
                <a href={clinicConfig.socialMedia.twitter} className="text-gray-300 hover:text-teal-400 transition-colors">
                  <Twitter size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.instagram && (
                <a href={clinicConfig.socialMedia.instagram} className="text-gray-300 hover:text-teal-400 transition-colors">
                  <Instagram size={20} />
                </a>
              )}
              {clinicConfig.socialMedia?.linkedin && (
                <a href={clinicConfig.socialMedia.linkedin} className="text-gray-300 hover:text-teal-400 transition-colors">
                  <Linkedin size={20} />
                </a>
              )}
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
                <span className="text-gray-300">
                  {clinicConfig.contact.address}, {clinicConfig.contact.city} {clinicConfig.contact.zipCode || ''}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={20} className="text-teal-400 flex-shrink-0" />
                <a href={`tel:+90${clinicConfig.contact.phone.replace(/\D/g, '').slice(1)}`} className="text-gray-300 hover:text-teal-400">
                  {clinicConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={20} className="text-teal-400 flex-shrink-0" />
                <a href={`mailto:${clinicConfig.contact.email}`} className="text-gray-300 hover:text-teal-400">
                  {clinicConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start space-x-3">
                <Clock size={20} className="text-teal-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-300">Hafta içi: {clinicConfig.workingHours.weekday}</p>
                  {clinicConfig.workingHours.weekend && (
                    <p className="text-gray-300">Hafta sonu: {clinicConfig.workingHours.weekend}</p>
                  )}
                  {clinicConfig.workingHours.note && (
                    <p className="text-gray-300">{clinicConfig.workingHours.note}</p>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-6">
          <p className="text-center text-gray-400">
            &copy; {new Date().getFullYear()} {clinicConfig.clinicName}. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;