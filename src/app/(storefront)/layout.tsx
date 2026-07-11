import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { CartProvider } from './CartProvider';
import { CartButton } from './CartButton';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div>
        <nav className="navbar bg-base-100/80 backdrop-blur-md border-b border-base-200 sticky top-0 z-50 px-6">
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="text-primary-content" size={16} />
              </div>
              <span className="font-bold text-lg tracking-tight">RestoraERP</span>
            </Link>
          </div>
          <div className="flex-none hidden md:flex gap-6">
            <Link href="/menu" className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors">Menu</Link>
            <Link href="/booking" className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors">Reservations</Link>
            <Link href="/about" className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors">About</Link>
            <Link href="/contact" className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors">Contact</Link>
          </div>
          <div className="flex-none ml-6 flex gap-2">
            <CartButton />
            <Link href="/admin" className="btn btn-ghost btn-sm">Admin</Link>
            <Link href="/booking" className="btn btn-primary btn-sm">Book a Table</Link>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="footer footer-center p-8 bg-base-200 text-base-content border-t border-base-300 text-sm text-base-content/50">
          <p>© {new Date().getFullYear()} RestoraERP — Premium Restaurant Management System</p>
        </footer>
      </div>
    </CartProvider>
  );
}
