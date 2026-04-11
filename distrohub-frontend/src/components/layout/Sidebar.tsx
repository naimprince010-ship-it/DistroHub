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
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-gradient-to-b from-[#0F1419] via-[#0A0F1C] to-[#050810] text-white flex flex-col z-50 border-r border-emerald-500/10 shadow-2xl overflow-hidden font-sans">
      {/* Decorative Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-40 bg-emerald-500/5 blur-[80px] -z-10 pointer-events-none" />
      <div className="absolute bottom-32 right-0 w-96 h-96 bg-teal-500/3 blur-[100px] -z-10 pointer-events-none rounded-full" />

      {/* Header / Logo */}
      <div className="p-6 border-b border-emerald-500/20 relative z-10 backdrop-blur-md bg-gradient-to-br from-[#0A0F1C]/95 to-[#050810]/95">
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500 group-hover:blur-md" />
            <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/30 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300">
              <Package className="w-6 h-6 text-white drop-shadow-lg" />
            </div>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-200 via-white to-emerald-100 bg-clip-text text-transparent drop-shadow-lg line-clamp-1">
              DistroHub
            </h1>
            <p className="text-[9px] text-emerald-300/80 uppercase tracking-[0.15em] font-bold mt-1">
              {t('common.distribution_management')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto custom-scrollbar relative z-10 space-y-1">
        {menuGroups.map((group, groupIndex) => {
          const isOpen = openGroups[group.label];
          const hasActiveItem = group.items.some(item => location.pathname === item.path);

          return (
            <div key={group.label}>
              {groupIndex > 0 && <div className="h-px bg-gradient-to-r from-slate-800 via-emerald-500/20 to-slate-800 my-3" />}
              
              <div className="space-y-2 py-2">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${hasActiveItem 
                    ? 'text-emerald-300 bg-emerald-500/10' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  <span className="opacity-90">{t(group.label)}</span>
                  <ChevronDown className={`w-4 h-4 transition-all duration-300 ease-out flex-shrink-0 ${isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </button>

                <div 
                  className={`grid transition-all duration-300 ease-in-out origin-top ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <ul className="space-y-1 overflow-hidden">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isActive
                              ? 'bg-gradient-to-r from-emerald-600/80 to-teal-600/60 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.35)] scale-[1.02] translate-x-1'
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 hover:translate-x-0.5 border border-transparent hover:border-emerald-500/20'
                              }`}
                          >
                            {/* Active Left Accent */}
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/90 via-emerald-300/70 to-transparent rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                            )}
                            
                            <div className={`relative flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isActive 
                              ? 'text-white scale-110 drop-shadow-lg' 
                              : 'text-slate-500 group-hover:text-emerald-400 group-hover:scale-110'
                            }`}>
                              <item.icon className="w-5 h-5 drop-shadow-sm" />
                            </div>
                            
                            <span className={`font-semibold text-[13px] tracking-wide whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'drop-shadow-md font-bold' : 'group-hover:drop-shadow-sm'}`}>
                              {t(item.label)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-emerald-500/15 bg-gradient-to-t from-[#050810]/90 to-[#0A0F1C]/80 backdrop-blur-md relative z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-rose-300 rounded-lg transition-all duration-300 group border border-transparent hover:border-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 hover:bg-gradient-to-r hover:from-rose-500/15 hover:to-transparent"
        >
          <div className="relative w-9 h-9 rounded-lg bg-slate-800/50 flex items-center justify-center group-hover:bg-rose-500/20 group-hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all duration-300 border border-slate-700/50 group-hover:border-rose-500/40 flex-shrink-0">
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-slate-500 group-hover:text-rose-400" />
          </div>
          <span className="font-semibold text-sm tracking-wide">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
