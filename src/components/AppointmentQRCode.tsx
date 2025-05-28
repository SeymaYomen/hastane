import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface AppointmentQRCodeProps {
  appointment: {
    id: string;
    department: string;
    doctor: string;
    date: string;
    time: string;
    patientName: string;
    patientTCKN: string;
    price: number;
  };
}

const AppointmentQRCode: React.FC<AppointmentQRCodeProps> = ({ appointment }) => {
  const qrData = JSON.stringify({
    id: appointment.id,
    department: appointment.department,
    doctor: appointment.doctor,
    date: appointment.date,
    time: appointment.time,
    patientName: appointment.patientName,
    patientTCKN: appointment.patientTCKN,
    price: appointment.price,
    verificationCode: btoa(`${appointment.id}-${appointment.patientTCKN}`).substring(0, 8)
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <QRCodeSVG
        value={qrData}
        size={200}
        level="H"
        includeMargin={true}
        imageSettings={{
          src: "/vite.svg",
          x: undefined,
          y: undefined,
          height: 24,
          width: 24,
          excavate: true,
        }}
      />
      <div className="mt-4 text-center space-y-2">
        <div>
          <p className="text-sm text-gray-600">Randevu Kodu:</p>
          <p className="text-lg font-bold text-gray-900">{btoa(`${appointment.id}-${appointment.patientTCKN}`).substring(0, 8)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Muayene Ücreti:</p>
          <p className="text-lg font-bold text-blue-600">{formatPrice(appointment.price)}</p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentQRCode;