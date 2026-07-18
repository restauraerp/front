import type { Metadata } from 'next';
import { Inter, Poppins, Hind_Siliguri } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import './globals.css';
import DemoAnalytics from '@/components/DemoAnalytics';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-poppins' });
const hindSiliguri = Hind_Siliguri({ subsets: ['bengali'], weight: ['400', '500'], variable: '--font-hind-siliguri' });

export const metadata: Metadata = {
  title: 'RestoraERP | Premium Restaurant Management',
  description: 'Manage your restaurant operations efficiently with RestoraERP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === 'true' || process.env.NEXT_PUBLIC_IS_DEMO === '"true"';
  
  return (
    <html lang="en" data-theme="restoraerp">
      {isDemo && process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
      <body className={`${inter.variable} ${poppins.variable} ${hindSiliguri.variable} font-sans antialiased`}>
        {children}
        {isDemo && <DemoAnalytics />}
      </body>
    </html>
  );
}