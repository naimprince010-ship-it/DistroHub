import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  Receipt,
  FileText,
  Settings,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  MapPin,
  DollarSign,
  ChevronLeft,
  PanelLeftOpen,
  Menu,
  X,
  BarChart3,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function isNavActive(path: string, pathname: string, search: string): boolean {
  if (path.includes('?')) {
    const [p, query] = path.split('?');
    if (pathname !== p) return false;
    const want = new URLSearchParams(query);
    const have = new URLSearchParams(search);
    for (const [k, v] of want.entries()) {
      if ((have.get(k) ?? '') !== v) return false;
    }
    return true;
  }
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Settings home: /settings or ?tab=suppliers (default in Settings page) */
function isSettingsHomeActive(pathname: string, search: string): boolean {
  if (pathname !== '/settings') return false;
  const tab = new URLSearchParams(search).get('tab') || 'suppliers';
  return tab === 'suppliers';
}

function readStoredUserRole(): UserRole | 'unknown' {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'unknown';
    const j = JSON.parse(raw) as { role?: string };
    const r = (j?.role || '').toLowerCase();
    if (r === 'admin' || r === 'sr' || r === 'dsr') return r;
    if (r === 'sales_rep') return 'dsr';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Path is item.path (may include ?query). */
function navAllowedForRole(path: string, role: UserRole | 'unknown'): boolean {
  const base = path.split('?')[0] || path;
  if (role === 'unknown') return true;
  if (role === 'admin') return true;
  if (base.startsWith('/reports/stock-reconciliation')) return false;
  const matchAllowed = (allowed: string[]) => {
    if (base === '/') return allowed.includes('/');
    return allowed.some((p) => p !== '/' && (base === p || base.startsWith(`${p}/`)));
  };
  if (role === 'sr') {
    return matchAllowed(['/', '/dashboard', '/retailers', '/sales', '/payments', '/reports', '/settings']);
  }
  if (role === 'dsr') {
    return matchAllowed([
      '/',
      '/dashboard',
      '/retailers',
      '/sales',
      '/sales-returns',
      '/routes',
      '/accountability',
      '/receivables',
      '/payments',
      '/reports',
      '/settings',
    ]);
  }
  return true;
}

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const location = useLocation();
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, location.search, isMobile]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setIsMobileOpen(!isMobileOpen)}
      className={cn(
        'lg:hidden flex items-center justify-center w-10 h-10 rounded-lg',
        'text-foreground/70 hover:text-foreground hover:bg-accent',
        'transition-colors duration-200 focus-ring',
        className
      )}
      aria-expanded={isMobileOpen}
      aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
    >
      {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}

const shellClass = 'bg-[hsl(var(--sidebar-background))]';

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const { t } = useLanguage();

  const userRole = useMemo(
    () => readStoredUserRole(),
    [location.pathname, location.search]
  );

  const menuGroups: MenuGroup[] = useMemo(
    () => {
      const all: MenuGroup[] = [
      {
        label: t('sidebar.main'),
        items: [
          { icon: LayoutDashboard, label: t('common.dashboard'), path: '/' },
          { icon: Users, label: t('common.retailers'), path: '/retailers' },
        ],
      },
      {
        label: t('sidebar.inventory'),
        items: [
          { icon: Package, label: t('common.products'), path: '/products' },
          { icon: Tags, label: t('common.categories'), path: '/categories' },
          { icon: Warehouse, label: t('common.inventory'), path: '/inventory' },
          { icon: AlertTriangle, label: t('common.expiry_alerts'), path: '/expiry' },
        ],
      },
      {
        label: t('sidebar.operations'),
        items: [
          { icon: ShoppingCart, label: t('common.purchase'), path: '/purchase' },
          { icon: Receipt, label: t('common.sales'), path: '/sales' },
          { icon: RotateCcw, label: t('common.sales_returns'), path: '/sales-returns' },
          { icon: MapPin, label: t('common.routes'), path: '/routes' },
        ],
      },
      {
        label: t('sidebar.finance'),
        items: [
          { icon: DollarSign, label: t('common.accountability'), path: '/accountability' },
          { icon: TrendingUp, label: t('common.receivables'), path: '/receivables' },
          { icon: BarChart3, label: t('common.payments'), path: '/payments' },
        ],
      },
      {
        label: t('sidebar.system'),
        items: [
          { icon: FileText, label: t('common.reports'), path: '/reports' },
          { icon: Settings, label: t('common.settings'), path: '/settings?tab=suppliers' },
        ],
      },
    ];
      if (userRole === 'admin' || userRole === 'unknown') return all;
      return all
        .map((g) => ({ ...g, items: g.items.filter((it) => navAllowedForRole(it.path, userRole)) }))
        .filter((g) => g.items.length > 0);
    },
    [t, userRole]
  );

  const NavRow = ({ item }: { item: MenuItem }) => {
    const active =
      item.path === '/settings?tab=suppliers'
        ? isSettingsHomeActive(location.pathname, location.search)
        : isNavActive(item.path, location.pathname, location.search);
    const body = (
      <Link
        to={item.path}
        className={cn(
          'group flex items-center rounded-xl transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar-background))]',
          'relative overflow-hidden',
          isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5',
          active
            ? 'bg-[hsl(var(--sidebar-ring))]/10 text-[hsl(var(--sidebar-ring))] shadow-[0_10px_22px_-16px_hsl(var(--sidebar-ring)/0.8)]'
            : 'text-[hsl(var(--sidebar-muted))] hover:-translate-y-px hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] hover:shadow-[0_8px_18px_-16px_rgba(15,23,42,0.7)]'
        )}
        aria-current={active ? 'page' : undefined}
        title={isCollapsed ? item.label : undefined}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[hsl(var(--sidebar-ring))] shadow-[0_0_12px_hsl(var(--sidebar-ring)/0.45)]"
            aria-hidden
          />
        )}
        <item.icon
          className={cn(
            'flex-shrink-0 w-[1.125rem] h-[1.125rem] transition-colors',
            active ? 'text-[hsl(var(--sidebar-ring))]' : 'text-[hsl(var(--sidebar-muted))] group-hover:text-[hsl(var(--sidebar-foreground))]'
          )}
          aria-hidden
        />
              {!isCollapsed && <span className="truncate text-sm font-medium tracking-[-0.01em]">{item.label}</span>}
      </Link>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{body}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return body;
  };

  const sidebarContent = (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full min-h-0">
        <div
          className={cn(
            'flex items-center shrink-0 transition-all duration-300 border-b border-[hsl(var(--sidebar-border))]',
            isCollapsed ? 'px-2 py-3 justify-center' : 'px-5 py-6 gap-3'
          )}
        >
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                'flex items-center justify-center rounded-xl',
                'bg-[hsl(var(--sidebar-ring))]',
                'w-9 h-9'
              )}
            >
              <span className="text-sm font-bold text-white tracking-tighter leading-none">DH</span>
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <h1 className="text-[15px] font-semibold text-[hsl(var(--sidebar-foreground))] tracking-tight leading-tight">
                DistroHub
              </h1>
              <span className="mt-1 inline-block text-[9px] font-mono font-semibold tracking-wide px-1.5 py-0.5 rounded bg-[hsl(var(--sidebar-ring))]/10 text-[hsl(var(--sidebar-ring))]">
                FMCG · SaaS
              </span>
            </div>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar',
            isCollapsed ? 'px-2 py-2' : 'px-3 py-4'
          )}
        >
          {menuGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && (isCollapsed ? 'mt-2' : 'mt-6'))}>
              {!isCollapsed ? (
                <h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--sidebar-muted))]">
                  {group.label}
                </h2>
              ) : groupIndex > 0 ? (
                <div className="h-px bg-[hsl(var(--sidebar-border))] mx-1 my-1.5" role="separator" aria-hidden />
              ) : null}
              <ul className={cn(isCollapsed ? 'space-y-0.5' : 'space-y-1')}>
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavRow item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-[hsl(var(--sidebar-border))] space-y-1 shrink-0">
          {!isMobile && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'w-full flex items-center rounded-xl transition-all duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-ring))]',
                isCollapsed
                  ? 'min-h-10 flex-col justify-center gap-0.5 px-2 py-2 text-[hsl(var(--sidebar-foreground))] bg-[hsl(var(--sidebar-accent))] ring-1 ring-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-accent))]/85'
                  : 'gap-3 px-3 py-2.5 text-[hsl(var(--sidebar-muted))] hover:-translate-y-px hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
              )}
              aria-pressed={isCollapsed}
              title={isCollapsed ? t('sidebar.expand_panel') : t('sidebar.collapse_panel')}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="h-4 w-4 text-[hsl(var(--sidebar-foreground))]" aria-hidden />
                  <span className="text-[10px] font-semibold leading-none text-[hsl(var(--sidebar-foreground))]">Open</span>
                </>
              ) : (
                <ChevronLeft className="h-5 w-5 text-current" aria-hidden />
              )}
              {!isCollapsed && <span className="text-sm font-medium">{t('sidebar.collapse_panel')}</span>}
            </button>
          )}

        </div>
      </div>
    </TooltipProvider>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 transition-opacity duration-300',
            isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden={!isMobileOpen}
        />
        <aside
          className={cn(
            shellClass,
            'fixed left-0 top-0 h-full w-[min(288px,88vw)] z-50 transition-transform duration-300 ease-out',
            'border-r border-[hsl(var(--sidebar-border))] shadow-xl shadow-black/15',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-hidden={!isMobileOpen}
          id="mobile-sidebar"
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        shellClass,
        'fixed left-0 top-0 h-screen z-40 transition-[width] duration-300 ease-out',
        'border-r border-[hsl(var(--sidebar-border))] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_18px_36px_-30px_rgba(15,23,42,0.5)]',
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
