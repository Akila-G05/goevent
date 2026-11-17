import type { Metadata } from 'next';
import { Bebas_Neue, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/shared/navbar';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { RouteLoader } from '@/components/ui/route-loader';
import { Toaster } from '@/components/ui/toaster';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GoEvent - Event Discovery & Booking Platform',
  description: 'Discover, host and manage workshops, concerts, sports and campus events in one place.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f8f9fa] text-gray-900 font-sans antialiased selection:bg-black selection:text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <RouteLoader />
          <LoadingOverlay />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
