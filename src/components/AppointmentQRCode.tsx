import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface AppointmentQRCodeProps {
  appointment: {
    id: string;
  };
}

const AppointmentQRCode: React.FC<AppointmentQRCodeProps> = ({ appointment }) => {
  // QR içerisinde kişisel veri tutulmaz.
  // Sadece randevu kaydını işaret eden benzersiz ID bulunur.
  const qrData = JSON.stringify({
    type: 'appointment',
    appointmentId: appointment.id
  });

  // Kullanıcıya gösterilecek kısa referans kodu.
  // Bu bir parola veya güvenlik anahtarı değildir.
  const appointmentCode = appointment.id
    .replace(/-/g, '')
    .slice(-8)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <QRCodeSVG
        value={qrData}
        size={200}
        level="H"
        includeMargin={true}
        imageSettings={{
          src: '/vite.svg',
          x: undefined,
          y: undefined,
          height: 24,
          width: 24,
          excavate: true
        }}
      />

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">Randevu Kodu:</p>
        <p className="text-lg font-bold text-gray-900">
          {appointmentCode}
        </p>
      </div>
    </div>
  );
};

export default AppointmentQRCode;