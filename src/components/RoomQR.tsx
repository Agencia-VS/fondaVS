'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
export default function RoomQR({ code }: { code: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(`${window.location.origin}/play/${code}`, {
      width: 220,
      margin: 2,
      color: { dark: '#142f38', light: '#fff8e6' },
    })
      .then((s) => {
        if (active) setUrl(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code]);
  return url ? (
    <Image
      unoptimized
      className="room-qr"
      src={url}
      width={180}
      height={180}
      alt={`Escanea para entrar a la sala ${code}`}
    />
  ) : (
    <span>Entra con el código {code}</span>
  );
}
