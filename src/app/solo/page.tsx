import type { Metadata } from 'next';
import SoloScreen from '@/components/SoloScreen';

export const metadata: Metadata = {
  title: 'Tú contra la CPU · FondaVS',
  description:
    'Practica los cuatro juegos de la fonda con tres rivales CPU, desde una sola pantalla.',
};

export default function Page() {
  return <SoloScreen />;
}
