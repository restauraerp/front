'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Utensils, CalendarDays, Store, Phone } from 'lucide-react';

export function StorefrontNavLinks({ className = "flex-none hidden md:flex gap-6" }: { className?: string }) {
  const pathname = usePathname();
  
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/menu', label: 'Menu', icon: Utensils },
    { href: '/booking', label: 'Reservations', icon: CalendarDays },
    { href: '/about', label: 'About', icon: Store },
    { href: '/contact', label: 'Contact', icon: Phone },
  ];

  return (
    <div className={className}>
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
        const Icon = link.icon;
        
        return (
          <Link 
            key={link.href}
            href={link.href}
            onClick={() => {
              const cb = document.getElementById('mobile-menu-drawer') as HTMLInputElement;
              if (cb) cb.checked = false;
            }}
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
