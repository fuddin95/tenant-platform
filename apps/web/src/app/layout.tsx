import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'RentalTrust',
  description: 'Rental application management — no email chasing.',
};

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
