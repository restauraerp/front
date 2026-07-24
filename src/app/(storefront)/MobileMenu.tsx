'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, UtensilsCrossed, CalendarDays, ChevronRight } from 'lucide-react';
import { storefrontNavLinks, isNavLinkActive } from './StorefrontNavLinks';

// Reservations gets its own call-to-action at the bottom of the panel.
const rows = storefrontNavLinks.filter(link => link.href !== '/booking');

export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation closes the menu — including the back button and links that
  // live outside this component.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (pathname !== renderedPath) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-square btn-ghost md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={24} />
      </button>

      {/* Overlay — sits below the cart drawer (z-100/101) but above the navbar (z-50) */}
      <div
        className={`fixed inset-0 z-[90] bg-black/50 transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 left-0 z-[91] flex w-[19rem] max-w-[85vw] flex-col bg-base-100 shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
      >
        <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <UtensilsCrossed className="text-primary-content" size={16} />
            </div>
            <span className="text-lg font-bold tracking-tight">RestoraERP</span>
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {rows.map(({ href, label, icon: Icon }) => {
              const isActive = isNavLinkActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'text-base-content hover:bg-base-200'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={18} className="shrink-0" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-base-200 p-4">
          <Link href="/booking" className="btn btn-primary w-full gap-2">
            <CalendarDays size={18} />
            Reserve a Table
          </Link>
        </div>
      </div>
    </>
  );
}
