import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'lucide-react';

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
    ],
  },
  {
    label: 'Inventory',
    items: [
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Warehouse, label: 'Inventory', path: '/inventory' },
      { icon: AlertTriangle, label: 'Expiry Alerts', path: '/expiry' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: ShoppingCart, label: 'Purchase', path: '/purchase' },
      { icon: Receipt, label: 'Sales', path: '/sales' },
      { icon: RotateCcw, label: 'Sales Returns', path: '/sales-returns' },
      { icon: MapPin, label: 'Routes', path: '/routes' },
    ],
  },
  {
    label: 'Accounts',
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

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Main': true,
  });

  // Ensure active group stays expanded
  useEffect(() => {
    const activeGroup = menuGroups.find(group =>
      group.items.some(item => location.pathname === item.path)
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.label]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0f172a] text-slate-200 flex flex-col z-50 overflow-hidden border-r border-slate-800">
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Package className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none mb-1">DistroHub</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Distribution</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="space-y-6">
          {menuGroups.map((group) => {
            const isOpen = openGroups[group.label];
            const hasActiveItem = group.items.some(item => location.pathname === item.path);

            return (
              <div key={group.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 transition-colors ${hasActiveItem ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{group.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>

                {isOpen && (
                  <ul className="space-y-1 mt-1 transition-all duration-300">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative ${isActive
                              ? 'bg-primary-500/[0.08] text-primary-400 font-semibold border-l-4 border-primary-500 rounded-r-lg -ml-4 pl-7'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-lg'
                              }`}
                          >
                            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-slate-400 group-hover:text-slate-200'}`} strokeWidth={1.5} />
                            <span className="text-sm whitespace-nowrap">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
