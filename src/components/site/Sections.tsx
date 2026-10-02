import React from 'react';
import { MapPin, Phone, Mail, ShoppingBag, Star, Globe } from 'lucide-react';
import type { Section, SectionProps, SiteContext } from '@/lib/site/types';
import { storageUrl } from '@/lib/site/types';
import { themeStyle, type SiteTheme } from '@/lib/site/themes';
import ReservationForm from './ReservationForm';

/**
 * How each site-builder component draws.
 *
 * Plain presentational components - no hooks, no fetching - so the same code
 * renders the public site on the server and the live preview in the editor.
 * Every value is rendered as text; there is no path for markup, matching the
 * "no custom code" rule core-api enforces on save.
 */

const BACKGROUNDS: Record<string, string> = {
  default: 'bg-base-100 text-base-content',
  muted: 'bg-base-200 text-base-content',
  brand: 'bg-primary text-primary-content',
  dark: 'bg-neutral text-neutral-content',
};

const str = (props: SectionProps, key: string): string => (typeof props[key] === 'string' ? (props[key] as string) : '');
const on = (props: SectionProps, key: string): boolean => props[key] === true;

function Shell({ props, children, className = '' }: { props: SectionProps; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${BACKGROUNDS[str(props, 'background')] ?? BACKGROUNDS.default} ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">{children}</div>
    </section>
  );
}

function Heading({ text, center = true }: { text: string; center?: boolean }) {
  return text ? <h2 className={`text-2xl sm:text-3xl font-bold mb-8 ${center ? 'text-center' : ''}`}>{text}</h2> : null;
}

function Hero({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const image = storageUrl(str(props, 'image'));
  const left = str(props, 'align') === 'left';
  const button = str(props, 'button');
  const href = linkFor(button, ctx);

  return (
    <section
      className="relative bg-neutral text-neutral-content bg-cover bg-center"
      style={image ? { backgroundImage: `url("${image}")` } : undefined}
    >
      {image && <div className="absolute inset-0 bg-black/50" aria-hidden />}
      <div className={`relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 ${left ? 'text-left' : 'text-center'}`}>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">{str(props, 'title')}</h1>
        {str(props, 'subtitle') && (
          <p className={`mt-4 text-lg text-white/85 whitespace-pre-line ${left ? '' : 'mx-auto'} max-w-2xl`}>{str(props, 'subtitle')}</p>
        )}
        {href && str(props, 'button_label') && (
          <a href={href} className="btn btn-primary btn-lg mt-8">{str(props, 'button_label')}</a>
        )}
      </div>
    </section>
  );
}

function Text({ props }: { props: SectionProps }) {
  const center = str(props, 'align') === 'center';
  return (
    <Shell props={props}>
      <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
        {str(props, 'heading') && <h2 className="text-2xl sm:text-3xl font-bold mb-4">{str(props, 'heading')}</h2>}
        <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line opacity-90">{str(props, 'body')}</p>
      </div>
    </Shell>
  );
}

function ImageSection({ props }: { props: SectionProps }) {
  const image = storageUrl(str(props, 'image'));
  if (!image) return <EmptyHint label="Image" hint="Choose a photo in the settings." />;
  const full = str(props, 'width') === 'full';

  return (
    <figure className={full ? '' : 'max-w-5xl mx-auto px-4 sm:px-6 py-8'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={str(props, 'caption')} className={`w-full object-cover ${full ? 'max-h-[70vh]' : 'rounded-2xl'}`} />
      {str(props, 'caption') && <figcaption className="text-center text-sm opacity-70 mt-3">{str(props, 'caption')}</figcaption>}
    </figure>
  );
}

function Spacer({ props }: { props: SectionProps }) {
  const size = { small: 'h-6', medium: 'h-14', large: 'h-28' }[str(props, 'size')] ?? 'h-14';
  return <div className={size} aria-hidden />;
}

function Menu({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const menu = ctx.menu;
  if (!menu) return <EmptyHint label="Menu" hint="The menu could not be loaded." />;

  const chosen = Array.isArray(props.categories) ? (props.categories as number[]) : [];
  const categories = menu.categories.filter((c) => chosen.length === 0 || chosen.includes(c.id));
  const grid = str(props, 'layout') !== 'list';
  const money = (n: number) => `${ctx.restaurant.currency}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  return (
    <Shell props={props}>
      <div id="menu" className="scroll-mt-20" />
      <Heading text={str(props, 'heading')} />
      <div className="space-y-12">
        {categories.map((category) => {
          const items = menu.products.filter((p) => p.category_id === category.id);
          if (items.length === 0) return null;
          return (
            <div key={category.id}>
              <h3 className="text-xl font-semibold mb-4">{category.name}</h3>
              <div className={grid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'divide-y divide-current/10'}>
                {items.map((item) => {
                  const image = on(props, 'show_images') ? storageUrl(item.image_url) : null;
                  return grid ? (
                    <div key={item.id} className="rounded-2xl overflow-hidden bg-base-100 text-base-content shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {image && <img src={image} alt="" className="w-full h-44 object-cover" />}
                      <div className="p-4">
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold">{item.name}</span>
                          {on(props, 'show_prices') && <span className="font-semibold whitespace-nowrap">{money(item.price)}</span>}
                        </div>
                        {item.description && <p className="text-sm opacity-70 mt-1 line-clamp-2">{item.description}</p>}
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="flex gap-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {image && <img src={image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold">{item.name}</span>
                          {on(props, 'show_prices') && <span className="font-semibold whitespace-nowrap">{money(item.price)}</span>}
                        </div>
                        {item.description && <p className="text-sm opacity-70 line-clamp-2">{item.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function OrderButton({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  return (
    <Shell props={props} className="text-center">
      {str(props, 'heading') && <h2 className="text-2xl sm:text-3xl font-bold mb-6">{str(props, 'heading')}</h2>}
      <a href={ctx.orderUrl} className="btn btn-lg bg-base-100 text-base-content border-0 hover:bg-base-200 gap-2">
        <ShoppingBag size={18} /> {str(props, 'label') || 'Order now'}
      </a>
    </Shell>
  );
}

function Branches({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const locations = ctx.menu?.locations ?? [];
  return (
    <Shell props={props}>
      <Heading text={str(props, 'heading')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((l) => (
          <div key={l.id} className="rounded-2xl p-5 bg-base-100 text-base-content shadow-sm">
            <div className="font-semibold text-lg">{l.name}</div>
            {l.address && <div className="flex gap-2 mt-2 text-sm opacity-80"><MapPin size={16} className="shrink-0 mt-0.5" /> {l.address}</div>}
            {l.phone && <a href={`tel:${l.phone}`} className="flex gap-2 mt-1 text-sm link link-hover"><Phone size={16} className="shrink-0 mt-0.5" /> {l.phone}</a>}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Contact({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const r = ctx.restaurant;
  return (
    <Shell props={props} className="text-center">
      <Heading text={str(props, 'heading')} />
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-10 text-base">
        {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center justify-center gap-2 link link-hover"><Phone size={18} /> {r.phone}</a>}
        {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center justify-center gap-2 link link-hover"><Mail size={18} /> {r.email}</a>}
        {r.address && <span className="inline-flex items-center justify-center gap-2"><MapPin size={18} /> {r.address}</span>}
      </div>
    </Shell>
  );
}

function Featured({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const products = ctx.menu?.products ?? [];
  const chosen = Array.isArray(props.products) ? (props.products as number[]) : [];
  const count = Number(str(props, 'count')) || 3;
  // Chosen dishes in the order picked; otherwise the first dishes with photos.
  const items = (chosen.length
    ? chosen.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
    : products.filter((p) => p.image_url)
  ).slice(0, count);
  const money = (n: number) => `${ctx.restaurant.currency}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  if (items.length === 0) return <EmptyHint label="Featured dishes" hint="Add photos to your dishes in the catalog, or choose dishes in the settings." />;

  return (
    <Shell props={props}>
      <Heading text={str(props, 'heading')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {items.map((item) => {
          const image = storageUrl(item.image_url);
          return (
            <div key={item.id} className="rounded-2xl overflow-hidden bg-base-100 text-base-content shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image && <img src={image} alt="" className="w-full aspect-[4/3] object-cover" />}
              <div className="p-4">
                <div className="font-semibold text-lg">{item.name}</div>
                {item.description && <p className="text-sm opacity-70 mt-1 line-clamp-2">{item.description}</p>}
                {on(props, 'show_prices') && <div className="font-bold text-primary mt-2">{money(item.price)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Reviews({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const reviews = ctx.reviews.slice(0, Number(str(props, 'count')) || 3);
  if (reviews.length === 0) return <EmptyHint label="Reviews" hint="Choose reviews to show in Website > Reviews." />;

  return (
    <Shell props={props}>
      <Heading text={str(props, 'heading')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {reviews.map((r, i) => (
          <figure key={i} className="rounded-2xl bg-base-100 text-base-content p-5 shadow-sm">
            <div className="flex gap-0.5 text-warning" aria-label={`${r.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, n) => <Star key={n} size={16} fill={n < r.rating ? 'currentColor' : 'none'} />)}
            </div>
            {r.text && <blockquote className="mt-3 text-sm leading-relaxed opacity-90 line-clamp-6">{r.text}</blockquote>}
            {r.author && <figcaption className="mt-3 text-sm font-semibold">{r.author}</figcaption>}
          </figure>
        ))}
      </div>
    </Shell>
  );
}

function Reservations({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  return (
    <Shell props={props}>
      <Heading text={str(props, 'heading')} />
      {str(props, 'intro') && <p className="text-center opacity-80 -mt-4 mb-8 whitespace-pre-line">{str(props, 'intro')}</p>}
      <ReservationForm code={ctx.restaurant.code} locations={ctx.menu?.locations ?? []} preview={ctx.preview} />
    </Shell>
  );
}

function Social({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  if (ctx.social.length === 0) return <EmptyHint label="Social links" hint="Add your pages in Website > Social links." />;

  return (
    <Shell props={props} className="text-center">
      <Heading text={str(props, 'heading')} />
      <div className="flex flex-wrap justify-center gap-3">
        {ctx.social.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline gap-2 capitalize">
            <Globe size={16} /> {l.platform || 'Visit'}
          </a>
        ))}
      </div>
    </Shell>
  );
}

function linkFor(target: string, ctx: SiteContext, page?: string): string | null {
  switch (target) {
    case 'order': return ctx.orderUrl;
    case 'menu': return `${ctx.basePath}/#menu`;
    case 'call': return ctx.restaurant.phone ? `tel:${ctx.restaurant.phone}` : null;
    case 'page': return page ? `${ctx.basePath}/${page}` : ctx.basePath || '/';
    default: return null;
  }
}

function ImageText({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const image = storageUrl(str(props, 'image'));
  const right = str(props, 'image_side') === 'right';
  const href = linkFor(str(props, 'button'), ctx);

  return (
    <Shell props={props}>
      <div className={`grid gap-8 items-center ${image ? 'md:grid-cols-2' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className={`w-full rounded-2xl object-cover aspect-[4/3] ${right ? 'md:order-2' : ''}`} />}
        <div>
          {str(props, 'heading') && <h2 className="text-2xl sm:text-3xl font-bold mb-4">{str(props, 'heading')}</h2>}
          {str(props, 'body') && <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line opacity-90">{str(props, 'body')}</p>}
          {href && str(props, 'button_label') && <a href={href} className="btn btn-primary mt-6">{str(props, 'button_label')}</a>}
        </div>
      </div>
    </Shell>
  );
}

function Gallery({ props }: { props: SectionProps }) {
  const images = (Array.isArray(props.images) ? (props.images as string[]) : []).map(storageUrl).filter((u): u is string => !!u);
  if (images.length === 0) return <EmptyHint label="Gallery" hint="Add photos in the settings." />;
  const cols = { '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' }[str(props, 'columns')] ?? 'sm:grid-cols-3';

  return (
    <Shell props={props}>
      <Heading text={str(props, 'heading')} />
      <div className={`grid grid-cols-2 ${cols} gap-3`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {images.map((src) => <img key={src} src={src} alt="" className="w-full aspect-square object-cover rounded-xl" />)}
      </div>
    </Shell>
  );
}

function ButtonSection({ props, ctx }: { props: SectionProps; ctx: SiteContext }) {
  const href = linkFor(str(props, 'target'), ctx, str(props, 'page'));
  if (!href) return null;

  return (
    <Shell props={props} className={str(props, 'align') === 'left' ? 'text-left' : 'text-center'}>
      <a href={href} className="btn btn-primary btn-lg">{str(props, 'label') || 'Learn more'}</a>
    </Shell>
  );
}

function EmptyHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-base-content/50 border border-dashed border-base-300 my-4 rounded-xl">
      <b>{label}</b> - {hint}
    </div>
  );
}

const RENDERERS: Record<string, (p: { props: SectionProps; ctx: SiteContext }) => React.ReactElement | null> = {
  hero: Hero,
  text: Text,
  image: ImageSection,
  spacer: Spacer,
  menu: Menu,
  order_button: OrderButton,
  branches: Branches,
  contact: Contact,
  featured: Featured,
  reviews: Reviews,
  reservations: Reservations,
  social: Social,
  image_text: ImageText,
  gallery: Gallery,
  button: ButtonSection,
};

/** One section, or nothing for a type this build does not know. */
export function SiteSection({ section, ctx }: { section: Section; ctx: SiteContext }) {
  const Render = RENDERERS[section.type];
  return Render ? <Render props={section.props} ctx={ctx} /> : null;
}

/** The site's header and footer around a page's sections. */
export function SiteFrame({ ctx, pages, theme, children }: {
  ctx: SiteContext;
  pages: { slug: string; title: string }[];
  theme?: SiteTheme | null;
  children: React.ReactNode;
}) {
  const logo = storageUrl(ctx.restaurant.logo_url);
  const href = (slug: string) => (slug ? `${ctx.basePath}/${slug}` : ctx.basePath || '/');

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content" style={themeStyle(theme)}>
      <header className="sticky top-0 z-30 bg-base-100/95 backdrop-blur border-b border-base-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <a href={href('')} className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" className="w-9 h-9 rounded-lg object-cover" />}
            <span className="font-bold text-lg truncate">{ctx.restaurant.name}</span>
          </a>
          <nav className="hidden sm:flex items-center gap-5 ml-auto text-sm">
            {pages.length > 1 && pages.map((p) => <a key={p.slug} href={href(p.slug)} className="link link-hover">{p.title}</a>)}
          </nav>
          <a href={ctx.orderUrl} className="btn btn-primary btn-sm ml-auto sm:ml-0">Order online</a>
        </div>
        {pages.length > 1 && (
          <nav className="sm:hidden flex gap-4 overflow-x-auto px-4 pb-2 text-sm">
            {pages.map((p) => <a key={p.slug} href={href(p.slug)} className="link link-hover whitespace-nowrap">{p.title}</a>)}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-neutral text-neutral-content">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-2 justify-between text-sm">
          <span>© {new Date().getFullYear()} {ctx.restaurant.name}</span>
          <span className="opacity-60">Powered by RestoraERP</span>
        </div>
      </footer>
    </div>
  );
}
