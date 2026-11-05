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
  ShoppingBag,
  Package,
  Users,
  Boxes,
  ClipboardList,
  ChefHat,
  Truck,
  Handshake,
  HeartHandshake,
  MapPin,
  Calculator,
  Wallet,
  Settings,
  Building2,
  UserCircle,
  Menu,
  ChevronDown,
  UtensilsCrossed,
  Globe,
  Home,
  ArrowLeft,
  BarChart3,
  Languages,
  X,
  Plug,
  CalendarDays,
  CalendarCheck,
  PartyPopper,
  BedDouble,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

/**
 * The sidebar, grouped by the job somebody is doing rather than listed by
 * module. Nineteen flat links read as a wall; seven headings with the day's
 * work at the top and the set-up-once pages at the bottom read as a map.
 *
 * Every item keeps its own permission (routePermissions below), so a group is
 * simply whatever of it the person may see - and a group they may see nothing
 * of is not drawn at all.
 */
const navGroups: NavGroup[] = [
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingBag,
    items: [
      { href: '/admin/pos', label: 'Point of Sale', icon: ShoppingCart },
      { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
      { href: '/admin/kiosk', label: 'Kitchen Display', icon: ChefHat },
      { href: '/admin/delivery', label: 'Delivery', icon: Truck },
      // Delivery apps and other channels that send orders in, and what is owed
      // to and from them.
      { href: '/admin/partners', label: 'Sales Partners', icon: Handshake },
    ],
  },
  {
    id: 'guests',
    label: 'Guests & Bookings',
    icon: CalendarDays,
    items: [
      { href: '/admin/bookings', label: 'Table Bookings', icon: CalendarCheck },
      { href: '/admin/venues', label: 'Venues & Events', icon: PartyPopper },
      // The hotel add-on module; only restaurants that run a hotel have it.
      { href: '/admin/hotel', label: 'Hotel Rooms', icon: BedDouble },
      { href: '/admin/crm', label: 'Customers', icon: HeartHandshake },
    ],
  },
  {
    id: 'menu',
    label: 'Menu & Stock',
    icon: Package,
    items: [
      { href: '/admin/catalog', label: 'Menu Catalog', icon: UtensilsCrossed },
      { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    items: [
      { href: '/admin/accounting', label: 'Accounting', icon: Calculator },
      { href: '/admin/reporting', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'online',
    label: 'Online',
    icon: Globe,
    items: [
      { href: '/admin/website', label: 'Website', icon: Globe },
      // The restaurant's Telegram bot for rider notifications. manage_integrations
      // belongs to the Delivery module, so this only appears with it.
      { href: '/admin/integrations', label: 'Integrations', icon: Plug },
    ],
  },
  {
    id: 'setup',
    label: 'Team & Setup',
    icon: Building2,
    items: [
      { href: '/admin/hr', label: 'Staff & HR', icon: Users },
      { href: '/admin/locations', label: 'Locations', icon: MapPin },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const dashboardItem: NavItem = { href: '/admin', label: 'Dashboard', icon: LayoutDashboard };
const navItems: NavItem[] = [dashboardItem, ...navGroups.flatMap((g) => g.items)];

/**
 * Which groups somebody has opened or shut, remembered per browser. A group
 * nobody has touched follows the page: open when it holds the current page,
 * shut otherwise.
 *
 * Read through useSyncExternalStore rather than an effect, so the server render
 * (nothing remembered) and the first client render agree, and the remembered
 * state arrives without a setState-in-effect. Storage can throw in a private
 * window or with site data blocked; then it simply is not remembered.
 */
const GROUPS_KEY = 'admin-nav-groups';
const groupListeners = new Set<() => void>();
let groupSnapshot: string | null = null;

const readGroups = (): string => {
  if (groupSnapshot === null) {
    try { groupSnapshot = window.localStorage.getItem(GROUPS_KEY) ?? '{}'; } catch { groupSnapshot = '{}'; }
  }
  return groupSnapshot;
};

const writeGroups = (next: Record<string, boolean>) => {
  groupSnapshot = JSON.stringify(next);
  try { window.localStorage.setItem(GROUPS_KEY, groupSnapshot); } catch { /* not remembered */ }
  groupListeners.forEach((l) => l());
};

const subscribeGroups = (listener: () => void) => {
  groupListeners.add(listener);
  return () => { groupListeners.delete(listener); };
};

const parseGroups = (raw: string): Record<string, boolean> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

// One entry per navItem, no exceptions. A route missing from here used to fall
// through hasAccess() as "allowed", which is how Reporting stayed on the
// sidebar for a pos_manager who has no view_reporting - the gate silently
// failing open is the same bug class as showing a module the plan never
// included.
const routePermissions: Record<string, string> = {
  '/admin': 'view_dashboard',
  '/admin/pos': 'view_pos',
  '/admin/orders': 'view_orders',
  // Part of CRM: absent from packages without it, like the endpoint.
  '/admin/bookings': 'manage_reservations',
  '/admin/venues': 'manage_venue_bookings',
  '/admin/hotel': 'manage_hotel',
  '/admin/catalog': 'view_catalog',
  '/admin/inventory': 'view_inventory',
  '/admin/kiosk': 'view_kitchen_kiosk',
  '/admin/hr': 'view_hr',
  '/admin/delivery': 'view_delivery',
  '/admin/integrations': 'manage_integrations',
  '/admin/crm': 'view_crm',
  '/admin/partners': 'view_partners',
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
   * A paying restaurant gets no tour at all, and that is decided here rather
   * than left to the tour's own demo detection. The detection reads a cookie,
   * the cookie is cleared a moment later by the effect above, and those two
   * race - so somebody who demoed and then subscribed in the same browser could
   * be walked through the demo tour inside the restaurant they pay for. Saying
   * "no tour" outright cannot race with anything.
   *
   * Only when we have no billing state at all does the tour fall back to
   * recognising a demo visit itself, because a demo visitor is exactly who has
   * no billing state.
   */
  const tour: { show: boolean; kind?: TourKind } = React.useMemo(() => {
    if (subscription?.is_demo === true) return { show: true, kind: 'demo' };

    // Marked as a demo for testing or a sales presentation: no tour popping up
    // in the middle of a pitch.
    if (subscription?.demo_restaurant === true) return { show: false };

    if (subscription?.is_demo === false) {
      return subscription.tenant_status === 'trialing' ? { show: true, kind: 'trial' } : { show: false };
    }

    return { show: true };
  }, [subscription]);

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

  const openGroups = parseGroups(React.useSyncExternalStore(subscribeGroups, readGroups, () => '{}'));

  const isActiveHref = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(href));

  const navLink = ({ href, label, icon: Icon }: NavItem) => {
    const isActive = isActiveHref(href);
    return (
      <Link
        href={href}
        // The guided tour anchors on this rather than on a class or a
        // position, so restyling the sidebar cannot silently break a
        // tour. Derived from the href so a new nav item is taggable
        // without anybody remembering to.
        data-tour={`nav-${href.replace('/admin', '').replace(/^\//, '') || 'dashboard'}`}
        onClick={() => setDrawerOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center transition-all duration-300 ease-in-out ${
          collapsed
            ? 'justify-center w-11 h-11 mx-auto rounded-full px-0'
            : 'px-3 py-2 rounded-lg w-full'
        } ${
          isActive
            ? 'bg-primary text-primary-content shadow-sm'
            : 'text-base-content hover:bg-base-300'
        }`}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className="shrink-0" />
        <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>{label}</span>
      </Link>
    );
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
      <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden" aria-label="Main">
        <ul className="px-2 space-y-0.5">
          {hasAccess(dashboardItem.href) && <li>{navLink(dashboardItem)}</li>}

          {navGroups.map((group) => {
            const items = group.items.filter((item) => hasAccess(item.href));
            if (items.length === 0) return null;

            // On the icon rail there is nowhere to put a heading, so a group
            // is its items under a hairline - nothing is ever tucked away
            // behind an icon nobody can read.
            if (collapsed) {
              return (
                <li key={group.id} className="pt-1.5 mt-1.5 border-t border-base-300">
                  <ul className="space-y-0.5">{items.map((item) => <li key={item.href}>{navLink(item)}</li>)}</ul>
                </li>
              );
            }

            // A heading over one link is noise; show the link.
            if (items.length === 1) return <li key={group.id}>{navLink(items[0])}</li>;

            const holdsActive = items.some((item) => isActiveHref(item.href));
            const open = openGroups[group.id] ?? holdsActive;
            const GroupIcon = group.icon;

            return (
              <li key={group.id} className="pt-1">
                <button
                  type="button"
                  onClick={() => writeGroups({ ...openGroups, [group.id]: !open })}
                  aria-expanded={open}
                  aria-controls={`nav-group-${group.id}`}
                  // Pressed by the guided tour when a step points at a link
                  // inside this group while it is shut.
                  data-tour-reveal={`nav-group-${group.id}`}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-base-content/60 hover:bg-base-300 hover:text-base-content transition-colors"
                >
                  <GroupIcon size={16} className="shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap">{group.label}</span>
                  {!open && holdsActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="Current page is in here" />}
                  <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                </button>
                <ul
                  id={`nav-group-${group.id}`}
                  data-tour-region={`nav-group-${group.id}`}
                  className={`mt-0.5 ml-[1.15rem] pl-2 border-l border-base-300 space-y-0.5 ${open ? '' : 'hidden'}`}
                >
                  {items.map((item) => <li key={item.href}>{navLink(item)}</li>)}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile link */}
      <div className="border-t border-base-300 p-3">
        <Link
          href="/admin/profile"
          data-tour="nav-profile"
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

        {/* The one door to the walkthrough's words, and only on a developer's
            machine. NODE_ENV is inlined at build time, so this link is not
            merely hidden in production - it is not in the bundle, which matches
            the route behind it answering 404 there. A plain anchor because the
            studio is outside this layout and wants a clean load. */}
        {process.env.NODE_ENV !== 'production' && (
          <a
            href="/walkthrough-studio"
            onClick={() => setDrawerOpen(false)}
            className={`mt-1 flex items-center text-base-content/60 transition-all duration-300 ease-in-out ${
              collapsed
                ? 'justify-center w-11 h-11 mx-auto rounded-full px-0'
                : 'px-3 py-2.5 rounded-lg w-full'
            } text-sm font-medium hover:bg-base-300`}
            title={collapsed ? 'Walkthrough copy' : undefined}
          >
            <Languages size={18} className="shrink-0" />
            <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
              <span className="whitespace-nowrap">Walkthrough copy</span>
            </div>
          </a>
        )}
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
          {/* Named for the tour: a step pointing at something in the menu can
              open the menu itself on a phone, instead of naming a rail that is
              not on the screen. Only ever pressed by the tour when it is
              actually visible, which is what keeps this to narrow widths. */}
          <label
            htmlFor="admin-drawer"
            data-tour-reveal="admin-menu"
            className="btn btn-ghost btn-sm btn-square"
          >
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
        {identityLoaded && tour.show && <Walkthrough kind={tour.kind} contact={subscription?.contact} />}

        {/* Main */}
        <main className="flex-1 p-6 bg-base-100 overflow-y-auto">
          {renderBreadcrumbs()}
          <SubscriptionBanner status={subscription} />
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40" data-tour-region="admin-menu">
        <label htmlFor="admin-drawer" className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
        {sidebar}
      </div>
    </div>
  );
}