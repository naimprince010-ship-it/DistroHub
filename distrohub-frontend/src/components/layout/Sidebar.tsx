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
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Retailers', path: '/retailers' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Warehouse, label: 'Stock', path: '/inventory' },
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
      { icon: DollarSign, label: 'Accountability', path: '/accountability' },
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

  // Close mobile sidebar on route change
  const location = useLocation();
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Handle escape key to close mobile sidebar
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

// Mobile trigger button for header
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
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Inventory: true,
    Operations: true,
    Finance: true,
    System: true,
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filter menu items based on search
  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.items.length > 0);

  const toggleGroup = (key: string) => {
    if (!isCollapsed) {
      setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const sidebarContent = (
    <>
      {/* Header / Logo */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border',
        isCollapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4 gap-3'
      )}>
        <div className="relative flex-shrink-0">
          <div className={cn(
            'flex items-center justify-center rounded-xl',
            'bg-gradient-to-br from-primary to-primary/80',
            'shadow-lg shadow-primary/20',
            isCollapsed ? 'w-10 h-10' : 'w-10 h-10'
          )}>
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold text-sidebar-foreground truncate">
              DistroHub
            </h1>
            <p className="text-xs text-primary font-medium">
              Distribution Hub
            </p>
          </div>
        )}
      </div>

      {/* Search - Only visible when expanded */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
                'bg-sidebar-accent border-0',
                'text-sidebar-foreground placeholder:text-sidebar-muted',
                'focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
                'transition-all duration-200'
              )}
            />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar">
        {filteredGroups.map((group, groupIndex) => {
          const isOpen = openGroups[group.label];
          const hasActiveItem = group.items.some(item => location.pathname === item.path);

          return (
            <div key={group.label} className={cn(groupIndex > 0 && 'mt-4')}>
              {/* Group header - clickable to expand/collapse */}
              {!isCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 mb-1',
                    'text-[11px] font-semibold uppercase tracking-wider',
                    'rounded-md transition-all duration-200',
                    hasActiveItem 
                      ? 'text-primary' 
                      : 'text-sidebar-muted hover:text-sidebar-foreground'
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown 
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isOpen ? 'rotate-180' : ''
                    )} 
                  />
                </button>
              ) : (
                <div className="h-px bg-sidebar-border my-3" />
              )}

              {/* Group items */}
              <div 
                className={cn(
                  'space-y-1 overflow-hidden transition-all duration-200',
                  !isCollapsed && !isOpen && 'h-0 opacity-0'
                )}
              >
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'group flex items-center rounded-lg transition-all duration-200',
                        'focus-ring',
                        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon className={cn(
                        'flex-shrink-0 transition-transform duration-200',
                        isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                        !isActive && 'group-hover:scale-110'
                      )} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle - Desktop only */}
      {!isMobile && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'w-full flex items-center rounded-lg transition-all duration-200',
              'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent',
              'focus-ring',
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn(
              'w-[18px] h-[18px] transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )} />
            {!isCollapsed && (
              <span className="text-sm font-medium">Collapse</span>
            )}
          </button>
        </div>
      )}

      {/* Footer / Logout */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center rounded-lg transition-all duration-200',
            'text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10',
            'focus-ring',
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
          )}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </>
  );

  // Mobile sidebar with overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className={cn(
            'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300',
            isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
        
        {/* Mobile sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 h-full w-72 z-50',
            'bg-sidebar-background text-sidebar-foreground',
            'flex flex-col',
            'border-r border-sidebar-border',
            'shadow-2xl',
            'transition-transform duration-300 ease-out',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors z-10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40',
        'bg-sidebar-background text-sidebar-foreground',
        'flex flex-col',
        'border-r border-sidebar-border',
        'transition-all duration-300 ease-out',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
