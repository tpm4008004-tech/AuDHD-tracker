import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '../components/Providers';

export const metadata: Metadata = {
  title: 'AuDHD MBA Life Tracker',
  description: 'Sensory-friendly mobile PWA for executive function & MBA tracking',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#121218',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-audhd-dark-bg text-gray-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
