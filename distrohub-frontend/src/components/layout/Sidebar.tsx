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
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-[#0A0F1C] text-white flex flex-col z-50 border-r border-slate-800/50 shadow-2xl overflow-hidden font-sans">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-emerald-500/10 blur-[50px] -z-10 pointer-events-none" />

      {/* Header / Logo */}
      <div className="p-6 border-b border-slate-800/60 relative z-10 backdrop-blur-sm bg-[#0A0F1C]/80">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition duration-1000" />
            <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-white/10">
              <Package className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
              DistroHub
            </h1>
            <p className="text-[10px] text-emerald-400/90 uppercase tracking-[0.2em] font-bold mt-0.5">
              {t('common.distribution_management')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar relative z-10">
        <div className="space-y-6">
          {menuGroups.map((group) => {
            const isOpen = openGroups[group.label];
            const hasActiveItem = group.items.some(item => location.pathname === item.path);

            return (
              <div key={group.label} className="space-y-2">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-[0.15em] transition-colors focus:outline-none ${hasActiveItem ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <span className="opacity-90">{t(group.label)}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-600'}`} />
                </button>

                <div 
                  className={`grid transition-all duration-300 ease-in-out origin-top ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
                  }`}
                >
                  <ul className="space-y-1.5 overflow-hidden">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden focus:outline-none ${isActive
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)] scale-[1.02] translate-x-1'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1 border border-transparent hover:border-slate-700/50'
                              }`}
                          >
                            {/* Active Side Glow */}
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/90 to-white/40 rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                            )}
                            
                            <div className={`relative flex items-center justify-center transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-emerald-400 group-hover:scale-110'}`}>
                                <item.icon className="w-5 h-5 drop-shadow-sm" />
                            </div>
                            
                            <span className={`font-semibold text-[14px] tracking-wide ${isActive ? 'drop-shadow-md' : 'group-hover:drop-shadow-sm'}`}>{t(item.label)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800/60 bg-[#0A0F1C]/90 backdrop-blur-sm relative z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-4 py-3 w-full text-slate-400 hover:bg-gradient-to-r hover:from-rose-500/10 hover:to-transparent hover:text-rose-400 rounded-xl transition-all duration-300 group border border-transparent hover:border-rose-500/20 focus:outline-none"
        >
          <div className="relative w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center group-hover:bg-rose-500/20 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all duration-300 border border-slate-700/50 group-hover:border-rose-500/30">
            <LogOut className="w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-300 text-slate-500 group-hover:text-rose-400" />
          </div>
          <span className="font-semibold text-sm tracking-wide">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
