import type { Metadata } from 'next';
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RentalTrust',
  description: 'Rental application management — no email chasing.',
};

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html
    lang="en"
    className={`${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
  >
    <body className="min-h-screen flex flex-col bg-bg-1">
      <main className="flex-1">{children}</main>
      <Footer />
    </body>
  </html>
);

export default RootLayout;
