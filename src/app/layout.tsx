import type { Metadata } from 'next';
import { Inter, Poppins, Hind_Siliguri } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import './globals.css';
import FacebookPixel from '@/components/FacebookPixel';
import DemoAnalytics from '@/components/DemoAnalytics';

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
      {/* A configured GTM id is the whole condition now. DemoAnalytics decides
          for itself whether this visit is a demo one (a cookie, not a build
          flag), so nothing here has to know.

          GTM must NOT also carry the Meta pixel. Container GTM-M8HZRXPH held a
          Custom HTML tag (tag_id 8) firing the standard base code for pixel
          25887308120967157 on All Pages - the same snippet FacebookPixel
          renders below - so every page called fbq('init') twice and Meta
          answered with "Duplicate Pixel ID", double-counting PageViews. That
          tag has been removed from the container; the pixel is owned here, in
          code, where it sits next to the Lead event that depends on it. If the
          warning ever returns, something re-added it to GTM. */}
      {process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
      <body className={`${inter.variable} ${poppins.variable} ${hindSiliguri.variable} font-sans antialiased`}>
        {children}
        <FacebookPixel />
        <DemoAnalytics />
      </body>
    </html>
  );
}