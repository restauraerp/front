'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ConversionBanner from '@/components/layout/ConversionBanner';
import dynamic from 'next/dynamic';

/**
 * Client-only, deliberately. The tour reads where somebody had got to straight
 * from localStorage during its first render rather than in a mount effect - which
 * is only safe because there is no server render to disagree with.
 */
const Walkthrough = dynamic(() => import('@/components/walkthrough/Walkthrough'), { ssr: false });
import type { TourKind } from '@/lib/walkthrough/tours';
import SubscriptionBanner, { SubscriptionStatus } from '@/components/layout/SubscriptionBanner';
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
  Home,
  ArrowLeft,
  BarChart3,
  X,
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
  { href: '/admin/reporting', label: 'Reporting', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

// One entry per navItem, no exceptions. A route missing from here used to fall
// through hasAccess() as "allowed", which is how Reporting stayed on the
// sidebar for a pos_manager who has no view_reporting - the gate silently
// failing open is the same bug class as showing a module the plan never
// included.
const routePermissions: Record<string, string> = {
  '/admin': 'view_dashboard',
  '/admin/pos': 'view_pos',
  '/admin/orders': 'view_orders',
  '/admin/catalog': 'view_catalog',
  '/admin/inventory': 'view_inventory',
  '/admin/kiosk': 'view_kitchen_kiosk',
  '/admin/hr': 'view_hr',
  '/admin/delivery': 'view_delivery',
  '/admin/crm': 'view_crm',
  '/admin/locations': 'view_locations',
  '/admin/accounting': 'view_accounting',
  '/admin/website': 'view_website',
  '/admin/reporting': 'view_reporting',
  '/admin/settings': 'view_settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  // Whether /auth/me has answered. The tour waits on this - see where it is mounted.
  const [identityLoaded, setIdentityLoaded] = useState(false);

  // Close the drawer whenever navigation happens, so links that don't manage
  // the drawer themselves (profile, breadcrumbs, back button) can't leave it
  // hanging over the new page.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (pathname !== renderedPath) {
    setRenderedPath(pathname);
    setDrawerOpen(false);
  }

  // The collapsed (icons-only) rail is a desktop affordance; the mobile drawer
  // always shows the full labelled sidebar.
  const collapsed = isCollapsed && !drawerOpen;

  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const renderBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return null; // hide on dashboard home

    const moduleHref = `/${segments[0]}/${segments[1]}`;
    const moduleLabel = navItems.find(i => i.href === moduleHref)?.label || (segments[1].charAt(0).toUpperCase() + segments[1].slice(1));
    const isSubPage = segments.length > 2;

    return (
      <div className="mb-6 space-y-1">
        <div className="text-sm breadcrumbs p-0 text-base-content/60">
          <ul>
            <li><Link href="/admin"><Home size={14} className="mr-1"/> Dashboard</Link></li>
            {segments.length > 1 && (
              <li>
                {isSubPage ? <Link href={moduleHref}>{moduleLabel}</Link> : <span className="text-base-content font-medium">{moduleLabel}</span>}
              </li>
            )}
            {segments.slice(2).map((seg, idx) => {
              const url = `/${segments.slice(0, idx + 3).join('/')}`;
              const isLast = idx === segments.length - 3;
              const title = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
              return (
                <li key={url}>
                  {isLast ? <span className="text-base-content font-medium">{title}</span> : <Link href={url}>{title}</Link>}
                </li>
              );
            })}
          </ul>
        </div>
        
        {isSubPage && (
          <div>
            <button 
              onClick={() => router.push(moduleHref)}
              className="btn btn-sm btn-ghost gap-2 pl-0 hover:bg-transparent hover:text-primary transition-colors -ml-2 text-base-content/70"
            >
              <ArrowLeft size={16} /> Back to {moduleLabel}
            </button>
          </div>
        )}
      </div>
    );
  };

  React.useEffect(() => {
    import('@/lib/api').then(({ fetchApi }) => {
      fetchApi('/auth/me').then(res => {
        const perms = res?.all_permissions || [];
        setUserPermissions(perms);
        const roles = res?.roles?.map((r: any) => r.name) || [];
        if (roles.includes('super_admin')) setIsSuperAdmin(true);
        // Billing state, so an expired subscription is announced on load
        // instead of discovered when a save fails.
        setSubscription(res?.subscription ?? null);

        // Signed into a real restaurant: shed any leftover demo marks, so the
        // buy-now banner stays away and no demo Lead is reported for someone
        // who is already a customer.
        if (res?.subscription?.is_demo === false) {
          import('@/lib/demo').then(({ clearDemoSession }) => clearDemoSession());
        }

        // An owner who came in through a one-time link has no password of
        // their own yet. Nothing else in here matters until they pick one.
        if (res?.must_set_password && window.location.pathname !== '/admin/set-password') {
          router.replace('/admin/set-password');
        }
      }).catch(console.error).finally(() => setIdentityLoaded(true));
    });
  }, [router]);

  /**
   * Which tour to run, decided here because this is the part that knows who is
   * signed in.
   *
   * A trial gets its own tour, and gets it *after* the demo one rather than
   * instead of it. They are separate lists with separate progress, so somebody
   * who walked the demo is still shown around their own restaurant - which is a
   * different restaurant, empty, and the one they have to actually set up.
   *
   * Left undefined for anybody else, and the tour then recognises a demo visit
   * on its own.
   */
  const tourKind: TourKind | undefined =
    subscription?.is_demo === false && subscription.tenant_status === 'trialing' ? 'trial' : undefined;

  // isSuperAdmin is the platform role (tenant_id NULL), held by RestoraERP
  // staff rather than by any restaurant - a restaurant owner is
  // restaurant_admin and is capped by their tier like everyone else.
  const hasAccess = (href: string) => {
    if (isSuperAdmin) return true;
    const reqPerm = routePermissions[href];
    // Unmapped means unknown, and an unknown route is not an entitlement to
    // show one. Every navItem is mapped above, so this denies nothing today.
    if (!reqPerm) return false;
    return userPermissions.includes(reqPerm);
  };

  const sidebar = (
    <aside className="flex flex-col h-full bg-base-200 min-h-screen w-72 max-w-[85vw] lg:w-full lg:max-w-none overflow-hidden">
      {/* Brand */}
      <div className={`relative flex items-center py-4 border-b border-base-300 h-[73px] transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <UtensilsCrossed className="text-primary shrink-0" size={24} />
          <span className="font-bold text-lg tracking-tight">RestoraERP</span>
        </div>
        <button
          className={`hidden lg:flex btn btn-ghost btn-sm btn-square text-base-content transition-all duration-300 ${collapsed ? 'absolute' : ''}`}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={20} />
        </button>
        <button
          className="lg:hidden btn btn-ghost btn-sm btn-square text-base-content"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden">
        <ul className="menu menu-sm px-2 gap-1">
          {navItems.filter(item => hasAccess(item.href)).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  // The guided tour anchors on this rather than on a class or a
                  // position, so restyling the sidebar cannot silently break a
                  // tour. Derived from the href so a new nav item is taggable
                  // without anybody remembering to.
                  data-tour={`nav-${href.replace('/admin', '').replace(/^\//, '') || 'dashboard'}`}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center transition-all duration-300 ease-in-out ${
                    collapsed
                      ? 'justify-center w-11 h-11 mx-auto rounded-full px-0'
                      : 'px-3 py-2.5 rounded-lg w-full'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content hover:bg-base-300'
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
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
          onClick={() => setDrawerOpen(false)}
          className={`flex items-center transition-all duration-300 ease-in-out ${
            collapsed
              ? 'justify-center w-11 h-11 mx-auto rounded-full px-0'
              : 'px-3 py-2.5 rounded-lg w-full'
          } text-sm font-medium hover:bg-base-300`}
          title={collapsed ? "My Profile" : undefined}
        >
          <UserCircle size={18} className="shrink-0" />
          <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
            <span className="whitespace-nowrap">My Profile</span>
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    // The rail width travels as a custom property, not as a <style> element
    // rendered from here. The rule that consumes it is in globals.css; see the
    // note there for why a client-rendered stylesheet had to go.
    <div
      className="drawer lg:drawer-open min-h-screen"
      style={{ '--admin-rail': isCollapsed ? '5rem' : '16rem' } as React.CSSProperties}
    >
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

        {/* Standing prompt to buy. Outside <main> on purpose: <main> is the
            scroll container, so sitting above it keeps the banner in view
            without ever overlaying a control. */}
        <ConversionBanner status={subscription} />

        {/* The guided tour. Mounted here rather than per page because it walks
            between pages: it has to survive the navigation its own steps cause.
            It renders nothing at all unless this is a demo visit or a trial tour
            has been asked for, and nothing again once it is dismissed.

            Held until /auth/me answers: somebody who came straight from the demo
            still carries the demo cookie for a moment, and starting them on the
            demo tour inside their own restaurant is worse than starting a beat
            late. */}
        {identityLoaded && <Walkthrough kind={tourKind} />}

        {/* Main */}
        <main className="flex-1 p-6 bg-base-100 overflow-y-auto">
          {renderBreadcrumbs()}
          <SubscriptionBanner status={subscription} />
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="admin-drawer" className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
        {sidebar}
      </div>
    </div>
  );
}