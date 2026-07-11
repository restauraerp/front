'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Boxes,
  ClipboardList,
  Monitor,
  Truck,
  HeartHandshake,
  MapPin,
  BookOpen,
  Settings,
  UserCircle,
  Menu,
  ChevronRight,
  UtensilsCrossed,
  Globe,
  ScrollText,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'POS System', icon: ShoppingCart },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/catalog', label: 'Catalog', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/kiosk', label: 'Kitchen Kiosk', icon: Monitor },
  { href: '/admin/hr', label: 'HRM', icon: Users },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/admin/crm', label: 'CRM', icon: HeartHandshake },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/accounting', label: 'Accounting', icon: BookOpen },
  { href: '/admin/website', label: 'Website', icon: Globe },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-base-200 min-h-screen w-full overflow-hidden">
      {/* Brand */}
      <div className={`relative flex items-center py-4 border-b border-base-300 h-[73px] transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <UtensilsCrossed className="text-primary shrink-0" size={24} />
          <span className="font-bold text-lg tracking-tight">RestoraERP</span>
        </div>
        <button 
          className={`hidden lg:flex btn btn-ghost btn-sm btn-square text-base-content transition-all duration-300 ${isCollapsed ? 'absolute' : ''}`} 
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden">
        <ul className="menu menu-sm px-2 gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center transition-all duration-300 ease-in-out ${
                    isCollapsed 
                      ? 'justify-center w-11 h-11 mx-auto rounded-full px-0' 
                      : 'px-3 py-2.5 rounded-lg w-full'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content hover:bg-base-300'
                  }`}
                  title={isCollapsed ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
                    <span className="text-sm font-medium whitespace-nowrap flex-1">{label}</span>
                    {isActive && <ChevronRight size={16} className="shrink-0" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile link */}
      <div className="border-t border-base-300 p-3">
        <Link
          href="/admin/profile"
          className={`flex items-center transition-all duration-300 ease-in-out ${
            isCollapsed 
              ? 'justify-center w-11 h-11 mx-auto rounded-full px-0' 
              : 'px-3 py-2.5 rounded-lg w-full'
          } text-sm font-medium hover:bg-base-300`}
          title={isCollapsed ? "My Profile" : undefined}
        >
          <UserCircle size={18} className="shrink-0" />
          <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
            <span className="whitespace-nowrap">My Profile</span>
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .drawer.lg\\:drawer-open {
            grid-template-columns: ${isCollapsed ? '5rem' : '16rem'} 1fr !important;
            transition: grid-template-columns 0.3s ease-in-out;
          }
        }
      `}</style>
      <div className="drawer lg:drawer-open min-h-screen">
        <input
          id="admin-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={drawerOpen}
          onChange={(e) => setDrawerOpen(e.target.checked)}
        />

        {/* Page content */}
        <div className="drawer-content flex flex-col min-w-0">
          {/* Mobile topbar */}
          <div className="navbar bg-base-100 border-b border-base-200 lg:hidden px-4">
            <label htmlFor="admin-drawer" className="btn btn-ghost btn-sm btn-square">
              <Menu size={20} />
            </label>
            <div className="flex items-center gap-2 ml-2">
              <UtensilsCrossed className="text-primary" size={18} />
              <span className="font-bold text-base">RestoraERP</span>
            </div>
          </div>

          {/* Main */}
          <main className="flex-1 p-6 bg-base-100 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Sidebar */}
        <div className="drawer-side z-40">
          <label htmlFor="admin-drawer" className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <Sidebar />
        </div>
      </div>
    </>
  );
}