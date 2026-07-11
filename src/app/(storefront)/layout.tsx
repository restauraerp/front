import Link from 'next/link';
import { UtensilsCrossed, Menu } from 'lucide-react';
import { CartProvider } from './CartProvider';
import { CartButton } from './CartButton';
import { StorefrontNavLinks } from './StorefrontNavLinks';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="drawer">
        <input id="mobile-menu-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">
          <nav className="navbar bg-base-100/80 backdrop-blur-md border-b border-base-200 sticky top-0 z-50 px-4 md:px-6">
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
          <footer className="footer footer-center p-8 bg-base-200 text-base-content border-t border-base-300 text-sm text-base-content/50">
            <p>© {new Date().getFullYear()} RestoraERP — Premium Restaurant Management System</p>
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
