'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Utensils, CalendarDays, Store, Phone } from 'lucide-react';

export const storefrontNavLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/menu', label: 'Menu', icon: Utensils },
  { href: '/booking', label: 'Reservations', icon: CalendarDays },
  { href: '/about', label: 'About', icon: Store },
  { href: '/contact', label: 'Contact', icon: Phone },
];

export function isNavLinkActive(pathname: string | null, href: string) {
  return pathname === href || (href !== '/' && !!pathname?.startsWith(href));
}

export function StorefrontNavLinks({ className = "flex-none hidden md:flex gap-6" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={className}>
      {storefrontNavLinks.map((link) => {
        const isActive = isNavLinkActive(pathname, link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === '/booking'
                ? `btn btn-primary btn-sm gap-1.5`
                : `flex items-center gap-1.5 text-sm font-semibold hover:scale-105 transition-all ${
                    isActive
                      ? 'text-primary'
                      : 'text-base-content/70 hover:text-primary/80'
                  }`
            }
          >
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
