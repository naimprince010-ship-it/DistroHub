import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList } from 'recharts';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

const salesData = [
  { name: 'Jan', sales: 4000, collections: 2400 },
  { name: 'Feb', sales: 3000, collections: 1398 },
  { name: 'Mar', sales: 2000, collections: 9800 },
  { name: 'Apr', sales: 2780, collections: 3908 },
  { name: 'May', sales: 1890, collections: 4800 },
  { name: 'Jun', sales: 2390, collections: 3800 },
  { name: 'Jul', sales: 3490, collections: 4300 },
];

const topProducts = [
  { name: 'Akij Flour 1kg', sales: 1250 },
  { name: 'Power Milk 400g', sales: 980 },
  { name: 'Pampers Medium', sales: 850 },
  { name: 'Rice Premium 5kg', sales: 720 },
  { name: 'Sugar 1kg', sales: 650 },
];

interface DashboardStats {
  total_sales: number;
  total_due: number;
  total_products: number;
  total_categories: number;
  total_purchases: number;
  active_retailers: number;
  low_stock_count: number;
  expiring_soon_count: number;
  payable_to_supplier: number;
  receivable_from_customers: number;
  sales_this_month: number;
  collections_this_month: number;
}

const recentOrders: Array<{
  id: string;
  retailer: string;
  amount: number;
  status: 'delivered' | 'pending' | 'confirmed';
}> = [];

const expiringProducts = [
  { name: 'Power Milk 400g', batch: 'BT-2024-001', expiry: '2025-01-15', qty: 50 },
  { name: 'Akij Flour 1kg', batch: 'BT-2024-002', expiry: '2025-01-20', qty: 30 },
  { name: 'Biscuit Pack', batch: 'BT-2024-003', expiry: '2025-01-25', qty: 100 },
];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Dashboard] No token found, skipping stats fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/dashboard/stats');
        setStats(response.data);
      } catch (err: any) {
        console.error('[Dashboard] Error fetching stats:', err);

        if (err.isTimeout || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setError('Backend is starting up (cold start). This may take 30-60 seconds. Please wait and refresh the page.');
        } else if (err.isNetworkError || err.code === 'ERR_NETWORK') {
          setError('Cannot connect to the server. Please check your internet connection.');
        } else {
          setError(err.response?.data?.detail || err.message || 'Failed to load dashboard stats');
        }

        if (err.response?.status === 401) {
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const formatCurrency = (amount: number | null | undefined): string => {
    return `৳\u00A0${(amount ?? 0).toLocaleString()}`;
  };

  const safeStats = stats ? {
    total_sales: stats.total_sales ?? 0,
    total_due: stats.total_due ?? 0,
    total_products: stats.total_products ?? 0,
    total_categories: stats.total_categories ?? 0,
    total_purchases: stats.total_purchases ?? 0,
    active_retailers: stats.active_retailers ?? 0,
    low_stock_count: stats.low_stock_count ?? 0,
    expiring_soon_count: stats.expiring_soon_count ?? 0,
    payable_to_supplier: stats.payable_to_supplier ?? 0,
    receivable_from_customers: stats.receivable_from_customers ?? 0,
    sales_this_month: stats.sales_this_month ?? 0,
    collections_this_month: stats.collections_this_month ?? 0,
  } : null;

  const displayStats = safeStats ? [
    {
      title: t('dashboard.total_sales'),
      value: formatCurrency(safeStats.total_sales),
      change: safeStats.sales_this_month > 0 ? `+${formatCurrency(safeStats.sales_this_month)}` : formatCurrency(0),
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgTint: 'bg-emerald-500/10',
      to: '/sales',
    },
    {
      title: t('dashboard.receivable'),
      value: formatCurrency(safeStats.receivable_from_customers),
      change: safeStats.collections_this_month > 0 ? `+${formatCurrency(safeStats.collections_this_month)}` : formatCurrency(0),
      trend: safeStats.receivable_from_customers > 0 ? 'down' as const : 'up' as const,
      icon: TrendingDown,
      color: 'from-rose-500 to-rose-600',
      bgTint: 'bg-rose-500/10',
      to: '/receivables',
    },
    {
      title: t('dashboard.total_products'),
      value: safeStats.total_products.toString(),
      change: `${t('dashboard.total_categories')}: ${safeStats.total_categories}`,
      trend: 'up' as const,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgTint: 'bg-blue-500/10',
      to: '/products',
    },
    {
      title: t('dashboard.active_retailers'),
      value: safeStats.active_retailers.toString(),
      change: `${t('common.purchase')}: ${safeStats.total_purchases}`,
      trend: 'up' as const,
      icon: Users,
      color: 'from-violet-500 to-violet-600',
      bgTint: 'bg-violet-500/10',
      to: '/retailers',
    },
    {
      title: t('dashboard.low_stock'),
      value: safeStats.low_stock_count.toString(),
      change: t('dashboard.items'),
      trend: safeStats.low_stock_count > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgTint: 'bg-amber-500/10',
      to: '/inventory?filter=low-stock',
    },
    {
      title: t('dashboard.expiring_soon'),
      value: safeStats.expiring_soon_count.toString(),
      change: t('dashboard.within_30_days'),
      trend: safeStats.expiring_soon_count > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      bgTint: 'bg-orange-500/10',
      to: '/expiry',
    },
    {
      title: t('dashboard.payable_to_suppliers'),
      value: formatCurrency(safeStats.payable_to_supplier),
      change: t('dashboard.outstanding'),
      trend: safeStats.payable_to_supplier > 0 ? 'down' as const : 'up' as const,
      icon: ShoppingCart,
      color: 'from-indigo-500 to-indigo-600',
      bgTint: 'bg-indigo-500/10',
      to: '/purchase',
    },
    {
      title: t('dashboard.total_categories'),
      value: safeStats.total_categories.toString(),
      change: `${t('common.products')}: ${safeStats.total_products}`,
      trend: 'up' as const,
      icon: FolderOpen,
      color: 'from-teal-500 to-teal-600',
      bgTint: 'bg-teal-500/10',
      to: '/products',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <Header title="Dashboard" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Grid */}
        {loading ? (
          <div className="bg-card rounded-xl p-8 text-center text-muted-foreground border border-border">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading dashboard statistics...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayStats.map((stat) => (
              <Link
                key={stat.title}
                to={stat.to}
                className={cn(
                  'group relative rounded-xl p-5 border border-border bg-card',
                  'transition-all duration-300 ease-out',
                  'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-br shadow-lg',
                    stat.color
                  )}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      stat.trend === 'up' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : 'bg-rose-500/10 text-rose-600'
                    )}
                  >
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[100px]">{stat.change}</span>
                  </span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-1 tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                
                {/* Hover decoration */}
                <div className={cn(
                  'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                  stat.bgTint
                )} />
              </Link>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Sales & Collections Chart */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.sales_collections')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm text-muted-foreground capitalize">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="sales"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="collections"
                  name="collections"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products Chart */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 30, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))" 
                  width={100}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()}`, 'Sales']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="sales"
                    position="insideRight"
                    formatter={(value: number) => value.toLocaleString()}
                    style={{ fill: 'white', fontSize: '11px', fontWeight: '600' }}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Recent Orders */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{t('dashboard.recent_orders')}</h3>
              <Link 
                to="/sales" 
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('dashboard.view_all')}
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.no_recent_orders')}</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.retailer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(order.amount)}</p>
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                          order.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : order.status === 'confirmed'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-amber-500/10 text-amber-600'
                        )}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expiring Products */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('dashboard.expiring_soon')}
              </h3>
              <Link 
                to="/expiry" 
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('dashboard.view_all')}
              </Link>
            </div>
            <div className="divide-y divide-border">
              {safeStats?.expiring_soon_count === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">No products expiring soon</p>
                </div>
              ) : (
                expiringProducts.map((product, index) => (
                  <div key={index} className="px-5 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">Batch: {product.batch}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-600">{product.expiry}</p>
                      <p className="text-sm text-muted-foreground">{product.qty} units</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
