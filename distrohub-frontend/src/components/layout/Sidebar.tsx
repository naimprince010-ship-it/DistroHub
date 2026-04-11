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
    <aside className="fixed left-0 top-0 h-screen w-72 bg-slate-950 text-white flex flex-col z-50 border-r border-slate-800 shadow-2xl overflow-hidden font-sans">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(13,148,136,0.05),transparent_50%)] pointer-events-none -z-10" />

      {/* Header / Logo */}
      <div className="px-6 py-5 border-b border-slate-800/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight">
              DistroHub
            </h1>
            <p className="text-xs text-cyan-400/80 font-medium mt-0.5">
              Distribution Hub
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar relative z-10">
        {menuGroups.map((group, groupIndex) => {
          const isOpen = openGroups[group.label];
          const hasActiveItem = group.items.some(item => location.pathname === item.path);

          return (
            <div key={group.label}>
              {groupIndex > 0 && <div className="h-px bg-slate-800/50 my-4" />}
              
              <div className={`mb-3 ${groupIndex > 0 ? 'pt-2' : ''}`}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                    hasActiveItem 
                      ? 'text-cyan-400 bg-cyan-500/10' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-600'}`} />
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                              isActive
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className={`relative flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                              isActive 
                                ? 'text-white' 
                                : 'text-slate-500 group-hover:text-cyan-400'
                            }`}>
                              <item.icon className="w-5 h-5" />
                            </div>
                            
                            <span className={`font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis ${
                              isActive ? 'font-semibold' : ''
                            }`}>
                              {item.label}
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
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/50 backdrop-blur-sm relative z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-400 hover:text-rose-400 rounded-md transition-all duration-200 group border border-transparent hover:border-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 hover:bg-rose-500/10"
        >
          <div className="relative w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 text-slate-500 group-hover:text-rose-400" />
          </div>
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
