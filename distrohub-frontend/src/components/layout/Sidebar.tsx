import { useState, useEffect } from 'react';
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
      { icon: Receipt, label: 'Sales Orders', path: '/sales' },
      { icon: RotateCcw, label: 'Sales Returns', path: '/sales-returns' },
      { icon: MapPin, label: 'Routes / Batches', path: '/routes' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { icon: DollarSign, label: 'SR Accountability', path: '/accountability' },
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Main: true,
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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
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
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Distribution Management</p>
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
                  <span>{group.label}</span>
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
                            <span className="font-medium text-sm">{item.label}</span>
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
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
