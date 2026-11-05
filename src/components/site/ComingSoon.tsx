import { Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import type { SiteContext } from '@/lib/site/types';
import { storageUrl } from '@/lib/site/types';
import { themeStyle, type SiteFonts, type SiteTheme } from '@/lib/site/themes';
import { googleFontsUrl } from '@/lib/site/fonts';

/**
 * What a restaurant's website shows before it is first published: its name
 * and logo, how to reach it, and online ordering - which works without a
 * website. Nothing from the editor's drafts.
 */
export default function ComingSoon({ ctx, theme, fonts }: { ctx: SiteContext; theme: SiteTheme; fonts: SiteFonts | null }) {
  const r = ctx.restaurant;
  const logo = storageUrl(r.logo_url);
  const fontsUrl = fonts ? googleFontsUrl([fonts.heading, fonts.body]) : null;

  return (
    <div data-site-theme className="min-h-screen flex flex-col items-center justify-center bg-base-200 text-base-content px-4 py-16" style={themeStyle(theme, fonts)}>
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} precedence="default" />}
      <main className="w-full max-w-lg text-center bg-base-100 rounded-3xl shadow-sm p-8 sm:p-12 space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto" />}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">{r.name}</h1>
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">Coming soon</p>
        </div>
        <p className="text-base-content/70">Our new website is on its way. In the meantime, you can order online or get in touch.</p>
        <a href={ctx.orderUrl} className="btn btn-primary btn-wide gap-2"><ShoppingBag size={18} /> Order online</a>
        {(r.phone || r.email || r.address) && (
          <div className="flex flex-col items-center gap-2 text-sm pt-2 border-t border-base-200">
            {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-2 link link-hover pt-4"><Phone size={16} /> {r.phone}</a>}
            {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-2 link link-hover"><Mail size={16} /> {r.email}</a>}
            {r.address && <span className="inline-flex items-center gap-2 text-base-content/70"><MapPin size={16} /> {r.address}</span>}
          </div>
        )}
        {ctx.social.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {ctx.social.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="link link-hover capitalize">{l.platform || 'Social'}</a>
            ))}
          </div>
        )}
      </main>
      <p className="text-xs text-base-content/40 mt-6">Powered by RestoraERP</p>
    </div>
  );
}
