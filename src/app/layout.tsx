import type { Metadata } from 'next';
import { Inter, Poppins, Hind_Siliguri } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-poppins' });
const hindSiliguri = Hind_Siliguri({ subsets: ['bengali'], weight: ['400', '500'], variable: '--font-hind-siliguri' });

export const metadata: Metadata = {
  title: 'RestoraERP | Premium Restaurant Management',
  description: 'Manage your restaurant operations efficiently with RestoraERP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="restoraerp">
      <body className={`${inter.variable} ${poppins.variable} ${hindSiliguri.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}