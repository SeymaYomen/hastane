/**
 * White-Label Clinic Configuration
 * Merkezi klinik/hastane bilgileri ve kurum-özel parametreleri tutar
 */

export interface ClinicConfig {
  // Kurum Bilgileri
  clinicName: string;        // Full name: "SağlıkTakip Hastanesi"
  shortName: string;         // Short name: "Sağlık Takip"
  chatbotName: string;       // Chatbot adı: "Sağlık Asistanı"
  logo?: string;             // Logo image path (isteğe bağlı)
  domain?: string;           // Website domain

  // İletişim Bilgileri
  contact: {
    phone: string;           // Main phone number
    email: string;           // Main email
    address: string;         // Street address
    city: string;            // City
    zipCode?: string;        // Postal code
    coordinates?: {          // Coordinates for maps
      latitude: number;
      longitude: number;
    };
  };

  // Çalışma Saatleri
  workingHours: {
    weekday: string;         // "09:00 - 17:00"
    weekend?: string;        // "09:00 - 13:00"
    note?: string;           // "7/24 Acil Hizmet"
  };

  // Sosyal Medya
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };

  // Tema ve UI
  defaultTheme?: 'blue' | 'green' | 'pink' | 'purple' | 'gray';
}

/**
 * Default Configuration - SağlıkTakip Platformu
 * Farklı klinikler için bu değerleri override edebilir
 */
export const clinicConfig: ClinicConfig = {
  // Kurum Bilgileri
  clinicName: 'SağlıkTakip',
  shortName: 'Sağlık Takip',
  chatbotName: 'Sağlık Asistanı',
  logo: undefined, // Logo path gelecekte eklenebilir
  domain: 'saglik-takip.com',

  // İletişim Bilgileri
  contact: {
    phone: '0424 233 44 55',
    email: 'info@saglik-takip.com',
    address: 'Fırat Üniversitesi Kampüsü',
    city: 'Elazığ',
    zipCode: '23119',
    coordinates: {
      latitude: 38.6814,
      longitude: 39.1931,
    },
  },

  // Çalışma Saatleri
  workingHours: {
    weekday: '09:00 - 17:00',
    weekend: '09:00 - 13:00',
    note: '7/24 Acil Hizmet',
  },

  // Sosyal Medya Linkleri
  socialMedia: {
    facebook: 'https://facebook.com/saglik-takip',
    twitter: 'https://twitter.com/saglik_takip',
    instagram: 'https://instagram.com/saglik_takip',
    linkedin: 'https://linkedin.com/company/saglik-takip',
  },

  // Tema
  defaultTheme: 'green',
};

/**
 * Export konfigurasyonu doğrudan kullanmak için
 */
export const getClinicConfig = (): ClinicConfig => {
  return clinicConfig;
};
