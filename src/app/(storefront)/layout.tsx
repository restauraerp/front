import Link from 'next/link';
import { UtensilsCrossed, Menu } from 'lucide-react';
import { CartProvider } from './CartProvider';
import { CartButton } from './CartButton';
import { StorefrontNavLinks } from './StorefrontNavLinks';
import { FooterSocialLinks } from './FooterSocialLinks';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="drawer">
        <input id="mobile-menu-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">
          <nav className="navbar bg-base-100/90 backdrop-blur-md border-b border-base-200 shadow-md sticky top-0 z-50 px-4 md:px-6">
            <div className="flex-none md:hidden mr-2">
              <label htmlFor="mobile-menu-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
                <Menu size={24} />
              </label>
            </div>
            <div className="flex-1">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="text-primary-content" size={16} />
                </div>
                <span className="font-bold text-lg tracking-tight">RestoraERP</span>
              </Link>
            </div>
            <StorefrontNavLinks />
            <div className="flex-none ml-4 md:ml-6 flex gap-2">
              <CartButton />
            </div>
          </nav>
          <main className="flex-1">{children}</main>
          <footer className="bg-base-200 text-base-content border-t border-base-300">
            <div className="p-10 max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              <aside className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="text-primary-content" size={20} />
                  </div>
                  <span className="font-bold text-xl tracking-tight">RestoraERP</span>
                </div>
                <p className="max-w-xs text-base-content/70">
                  Premium Restaurant Management System.<br/>
                  Delivering exceptional dining experiences and robust operational tools for modern restaurants.
                </p>
              </aside> 
              <nav className="flex flex-col gap-3">
                <h6 className="font-bold text-base-content/50 uppercase tracking-wider text-sm mb-1">Services</h6> 
                <Link href="/menu" className="link link-hover text-base-content/70">Our Menu</Link>
                <Link href="/booking" className="link link-hover text-base-content/70">Table Reservations</Link>
                <Link href="/locations" className="link link-hover text-base-content/70">Branch Locations</Link>
                <Link href="/catering" className="link link-hover text-base-content/70">Catering</Link>
              </nav> 
              <nav className="flex flex-col gap-3">
                <h6 className="font-bold text-base-content/50 uppercase tracking-wider text-sm mb-1">Company</h6> 
                <Link href="/about" className="link link-hover text-base-content/70">About Us</Link>
                <Link href="/contact" className="link link-hover text-base-content/70">Contact</Link>
                <Link href="/careers" className="link link-hover text-base-content/70">Careers</Link>
              </nav> 
              <nav className="flex flex-col gap-3">
                <h6 className="font-bold text-base-content/50 uppercase tracking-wider text-sm mb-1">Legal & Privacy</h6> 
                <Link href="/terms" className="link link-hover text-base-content/70">Terms of Service</Link>
                <Link href="/privacy" className="link link-hover text-base-content/70">Privacy Policy</Link>
                <Link href="/cookies" className="link link-hover text-base-content/70">Cookie Settings</Link>
                <Link href="/refunds" className="link link-hover text-base-content/70">Refund Policy</Link>
              </nav>
            </div>
            
            <div className="footer footer-center p-6 border-t border-base-300/50 bg-base-200">
              <aside>
                <p className="text-sm text-base-content/60">
                  © {new Date().getFullYear()} RestoraERP. All rights reserved.
                </p>
                <FooterSocialLinks />
              </aside>
            </div>
          </footer>
        </div>
        
        {/* Sidebar for mobile */}
        <div className="drawer-side z-[100]">
          <label htmlFor="mobile-menu-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <div className="w-80 min-h-full bg-base-100 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="text-primary-content" size={16} />
                </div>
                <span className="font-bold text-lg tracking-tight">RestoraERP</span>
              </Link>
              <label htmlFor="mobile-menu-drawer" aria-label="close sidebar" className="btn btn-sm btn-circle btn-ghost">✕</label>
            </div>
            <StorefrontNavLinks className="flex flex-col gap-6" />
          </div>
        </div>
      </div>
    </CartProvider>
  );
}
