'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Utensils, CalendarDays, Info, Phone } from 'lucide-react';

export function StorefrontNavLinks() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/menu', label: 'Menu', icon: Utensils },
    { href: '/booking', label: 'Reservations', icon: CalendarDays },
    { href: '/about', label: 'About', icon: Info },
    { href: '/contact', label: 'Contact', icon: Phone },
  ];

  return (
    <div className="flex-none hidden md:flex gap-6">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
        const Icon = link.icon;
        
        return (
          <Link 
            key={link.href}
            href={link.href} 
            className={`flex items-center gap-1.5 text-sm font-semibold hover:scale-105 transition-all ${
              isActive 
                ? 'text-primary' 
                : 'text-base-content/70 hover:text-primary/80'
            }`}
          >
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
