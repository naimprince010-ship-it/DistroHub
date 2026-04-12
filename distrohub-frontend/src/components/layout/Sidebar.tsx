import { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  Receipt,
  FileText,
  Settings,
  LogOut,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  Search,
  UserPlus,
  BarChart3,
  Tags
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Sidebar context for managing state across components
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
  icon: any;
  label: string;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Retailers', path: '/retailers' },
      { icon: UserPlus, label: 'Customers', path: '/customers' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Tags, label: 'Categories', path: '/categories' },
      { icon: Warehouse, label: 'Stock Level', path: '/inventory' },
      { icon: AlertTriangle, label: 'Expiry Alerts', path: '/expiry' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: ShoppingCart, label: 'Purchase', path: '/purchase' },
      { icon: Receipt, label: 'Sales', path: '/sales' },
      { icon: RotateCcw, label: 'Returns', path: '/sales-returns' },
      { icon: MapPin, label: 'Routes', path: '/routes' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Supplier Payable', path: '/accountability' },
      { icon: TrendingUp, label: 'Receivables', path: '/receivables' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: FileText, label: 'Reports', path: '/reports' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const location = useLocation();
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

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
      onClick={() => setIsMobileOpen(!isMobileOpen)}
      className={cn(
        'lg:hidden flex items-center justify-center w-10 h-10 rounded-lg',
        'text-foreground/70 hover:text-foreground hover:bg-accent',
        'transition-colors duration-200 focus-ring',
        className
      )}
      aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
    >
      {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div className={cn(
        'flex items-center transition-all duration-300',
        isCollapsed ? 'px-3 py-6 justify-center' : 'px-6 py-8 gap-3'
      )}>
        <div className="relative flex-shrink-0">
          <div className={cn(
            'flex items-center justify-center rounded-xl',
            'bg-gradient-to-br from-cyan-400 to-emerald-400',
            'shadow-lg shadow-cyan-400/20',
            'w-10 h-10'
          )}>
            <Package className="w-5 h-5 text-white" />
          </div>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              DistroHub
            </h1>
            <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mt-1">
              Distribution System
            </p>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-6 mb-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search Features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2.5 text-xs rounded-lg transition-all duration-200',
                'bg-slate-800/40 border border-slate-700/50',
                'text-slate-200 placeholder:text-slate-500',
                'focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:bg-slate-800/80'
              )}
            />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar pb-6">
        {filteredGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-8')}>
            {!isCollapsed ? (
              <h2 className="px-2 mb-3 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                {group.label}
              </h2>
            ) : (
              <div className="h-px bg-slate-700/30 mx-2 my-6" />
            )}

            <div className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'group flex items-center rounded-xl transition-all duration-300',
                      'focus-ring relative overflow-hidden',
                      isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3',
                      isActive
                        ? 'text-white font-medium bg-[linear-gradient(90deg,rgba(0,201,255,0.1)_0%,rgba(146,254,157,0.1)_100%)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Active Indicator Glow */}
                    {isActive && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    )}
                    
                    <item.icon className={cn(
                      'flex-shrink-0 transition-all duration-300',
                      isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    )} />
                    
                    {!isCollapsed && (
                      <span className="text-sm truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Toggle & Logout */}
      <div className="p-4 mt-auto border-t border-slate-700/30 space-y-2">
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'w-full flex items-center rounded-xl transition-all duration-300',
              'text-slate-400 hover:text-white hover:bg-white/5',
              'focus-ring',
              isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn(
              'w-5 h-5 transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )} />
            {!isCollapsed && <span className="text-sm font-medium">Collapse Panel</span>}
          </button>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center rounded-xl transition-all duration-300',
            'text-slate-400 hover:text-rose-400 hover:bg-rose-400/10',
            'focus-ring',
            isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-semibold">Logout Account</span>}
        </button>
      </div>
    </div>
  );

  // Mobile sidebar with glass overlay
  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40 transition-opacity duration-500',
            isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsMobileOpen(false)}
        />
        
        <aside
          className={cn(
            'fixed left-0 top-0 h-full w-[280px] z-50 transition-transform duration-500 ease-out',
            'bg-gradient-to-b from-[#104451]/95 to-[#145C6C]/95 backdrop-blur-xl',
            'border-r border-white/5 shadow-2xl',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)',
        'bg-[linear-gradient(135deg,rgba(16,68,81,0.95)_0%,rgba(20,92,108,0.95)_100%)] backdrop-blur-md',
        'border-r border-white/5 shadow-xl',
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
