import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { PwaRegister } from '@/components/pwa-register';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Aloft',
  description:
    'Study. Earn. Build. Verified focus and real recall pay for a floating island.',
  applicationName: 'Aloft',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  // Installed on iOS: full-screen, dark status bar, our name on the home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aloft',
  },
};

export const viewport: Viewport = {
  themeColor: '#14161f',
  // Lets the bottom tab bar extend under the home indicator on phones.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
