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
    label: 'sidebar.main',
    items: [
      { icon: LayoutDashboard, label: 'common.dashboard', path: '/' },
      { icon: Users, label: 'common.retailers', path: '/retailers' },
    ],
  },
  {
    label: 'sidebar.inventory',
    items: [
      { icon: Package, label: 'common.products', path: '/products' },
      { icon: Warehouse, label: 'common.inventory', path: '/inventory' },
      { icon: AlertTriangle, label: 'common.expiry_alerts', path: '/expiry' },
    ],
  },
  {
    label: 'sidebar.operations',
    items: [
      { icon: ShoppingCart, label: 'common.purchase', path: '/purchase' },
      { icon: Receipt, label: 'common.sales', path: '/sales' },
      { icon: RotateCcw, label: 'common.sales_returns', path: '/sales-returns' },
      { icon: MapPin, label: 'common.routes', path: '/routes' },
    ],
  },
  {
    label: 'sidebar.accounts',
    items: [
      { icon: DollarSign, label: 'common.accountability', path: '/accountability' },
      { icon: TrendingUp, label: 'common.receivables', path: '/receivables' },
    ],
  },
  {
    label: 'sidebar.system',
    items: [
      { icon: FileText, label: 'common.reports', path: '/reports' },
      { icon: Settings, label: 'common.settings', path: '/settings' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'sidebar.main': true,
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">DistroHub</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{t('common.distribution_management')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {menuGroups.map((group) => {
            const isOpen = openGroups[group.label];
            const hasActiveItem = group.items.some(item => location.pathname === item.path);

            return (
              <div key={group.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${hasActiveItem ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <span>{t(group.label)}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <ul className="space-y-1 mt-1 transition-all duration-300">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
                              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                            <span className="font-medium text-sm">{t(item.label)}</span>
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
      </nav>

      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
