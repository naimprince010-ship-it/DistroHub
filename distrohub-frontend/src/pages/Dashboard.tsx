import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import { cn, fillTemplate } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList } from 'recharts';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const cardSurface = 'border-border bg-card text-card-foreground shadow-sm';

type KpiHintTone = 'muted' | 'positive' | 'caution';

function DashboardQuickActions() {
  const { t } = useLanguage();
  const actions = [
    { to: '/sales', label: t('common.sales'), icon: ShoppingCart },
    { to: '/products', label: t('common.products'), icon: Package },
    { to: '/payments', label: t('common.payments'), icon: Wallet },
    { to: '/inventory', label: t('common.inventory'), icon: Warehouse },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('dashboard.quick_actions')}>
      {actions.map(({ to, label, icon: Icon }) => (
        <Button
          key={to}
          variant="outline"
          size="sm"
          asChild
          className={cn(
            'border-border bg-card text-foreground shadow-none',
            'hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Link to={to}>
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

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

interface SaleItemRow {
  product_name?: string;
  total?: number;
}

interface SaleRow {
  id: string;
  invoice_number?: string;
  retailer_name?: string;
  total_amount?: number;
  status?: string;
  created_at: string | Date;
  items?: SaleItemRow[];
}

interface PaymentRow {
  amount?: number;
  created_at: string | Date;
}

interface ExpiryAlertRow {
  product_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
}

type RecentOrderStatus = 'delivered' | 'pending' | 'confirmed' | 'cancelled';

function parseTs(v: string | Date): Date {
  if (v instanceof Date) return v;
  return new Date(v);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastNMonthBuckets(n: number, locale: string): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: d.toLocaleString(locale, { month: 'short', year: 'numeric' }),
    });
  }
  return out;
}

function buildMonthlySeries(sales: SaleRow[], payments: PaymentRow[], locale: string) {
  const months = getLastNMonthBuckets(6, locale);
  const salesTot = new Map<string, number>();
  const payTot = new Map<string, number>();
  months.forEach((m) => {
    salesTot.set(m.key, 0);
    payTot.set(m.key, 0);
  });

  for (const s of sales) {
    try {
      const d = parseTs(s.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = monthKey(d);
      if (!salesTot.has(key)) continue;
      salesTot.set(key, (salesTot.get(key) || 0) + Number(s.total_amount ?? 0));
    } catch {
      /* skip */
    }
  }
  for (const p of payments) {
    try {
      const d = parseTs(p.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = monthKey(d);
      if (!payTot.has(key)) continue;
      payTot.set(key, (payTot.get(key) || 0) + Number(p.amount ?? 0));
    } catch {
      /* skip */
    }
  }

  return months.map((m) => ({
    name: m.label,
    sales: salesTot.get(m.key) || 0,
    collections: payTot.get(m.key) || 0,
  }));
}

function aggregateTopProducts(sales: SaleRow[], unknownLabel: string): { name: string; sales: number }[] {
  const m = new Map<string, number>();
  for (const s of sales) {
    for (const it of s.items || []) {
      const name = (it.product_name || '').trim() || unknownLabel;
      m.set(name, (m.get(name) || 0) + (Number(it.total) || 0));
    }
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, salesVal]) => ({ name, sales: salesVal }));
}

function mapOrderStatus(s: string | undefined): RecentOrderStatus {
  const v = (s || '').toLowerCase();
  if (v === 'delivered' || v === 'pending' || v === 'confirmed' || v === 'cancelled') {
    return v;
  }
  return 'pending';
}

function formatExpiryLabel(expiry: string | Date): string {
  if (expiry instanceof Date) {
    return Number.isNaN(expiry.getTime()) ? '' : expiry.toLocaleDateString();
  }
  const d = new Date(expiry);
  return Number.isNaN(d.getTime()) ? String(expiry) : d.toLocaleDateString();
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Skeleton className="h-[340px] rounded-xl border border-border" />
        <Skeleton className="h-[340px] rounded-xl border border-border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Skeleton className="h-[260px] rounded-xl border border-border" />
        <Skeleton className="h-[260px] rounded-xl border border-border" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesMonthly, setSalesMonthly] = useState<{ name: string; sales: number; collections: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<
    { id: string; retailer: string; amount: number; status: RecentOrderStatus }[]
  >([]);
  const [expiringRows, setExpiringRows] = useState<
    { name: string; batch: string; expiry: string; qty: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { t, language } = useLanguage();

  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem('token')?.trim();
    if (!token) {
      console.warn('[Dashboard] No token found, skipping stats fetch');
      setLoading(false);
      return;
    }

    const loc = language === 'bn' ? 'bn-BD' : 'en-GB';

    try {
      setLoading(true);
      setError(null);

      const [statsRes, salesRes, paymentsRes, expiryRes] = await Promise.all([
        api.get<DashboardStats>('/api/dashboard/stats'),
        api.get<SaleRow[]>('/api/sales'),
        api.get<PaymentRow[]>('/api/payments'),
        api.get<ExpiryAlertRow[]>('/api/expiry-alerts'),
      ]);

      setStats(statsRes.data);

      const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
      const alerts = Array.isArray(expiryRes.data) ? expiryRes.data : [];

      setSalesMonthly(buildMonthlySeries(sales, payments, loc));
      setTopProducts(aggregateTopProducts(sales, t('dashboard.unknown_product')));

      const recent = [...sales]
        .sort((a, b) => parseTs(b.created_at).getTime() - parseTs(a.created_at).getTime())
        .slice(0, 5)
        .map((s) => ({
          id: s.invoice_number || s.id,
          retailer: s.retailer_name || '—',
          amount: Number(s.total_amount ?? 0),
          status: mapOrderStatus(s.status),
        }));
      setRecentOrders(recent);

      const expiring = alerts
        .filter((a) => a.quantity > 0 && a.days_until_expiry >= 0 && a.days_until_expiry <= 30)
        .slice(0, 5)
        .map((a) => ({
          name: a.product_name,
          batch: a.batch_number,
          expiry: formatExpiryLabel(a.expiry_date),
          qty: a.quantity,
        }));
      setExpiringRows(expiring);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const e = err as {
        isTimeout?: boolean;
        code?: string;
        message?: string;
        isNetworkError?: boolean;
        response?: { status?: number; data?: { detail?: string } };
      };
      console.error('[Dashboard] Error fetching dashboard data:', err);

      if (e.isTimeout || e.code === 'ECONNABORTED' || e.message?.includes?.('timeout')) {
        setError(t('dashboard.error_cold_start'));
      } else if (e.isNetworkError || e.code === 'ERR_NETWORK') {
        setError(t('dashboard.error_network'));
      } else {
        const d = e.response?.data?.detail;
        setError(typeof d === 'string' ? d : t('dashboard.error_generic'));
      }

      if (e.response?.status === 401) {
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatCurrency = (amount: number | null | undefined): string => {
    return `৳\u00A0${(amount ?? 0).toLocaleString(locale)}`;
  };

  const orderStatusLabel = (status: RecentOrderStatus): string => {
    switch (status) {
      case 'delivered':
        return t('dashboard.order_delivered');
      case 'confirmed':
        return t('dashboard.order_confirmed');
      case 'cancelled':
        return t('dashboard.order_cancelled');
      default:
        return t('dashboard.order_pending');
    }
  };

  const safeStats = stats
    ? {
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
      }
    : null;

  const displayStats = safeStats
    ? [
        {
          title: t('dashboard.total_sales'),
          value: formatCurrency(safeStats.total_sales),
          hint: fillTemplate(t('dashboard.kpi_sales_month'), { amount: formatCurrency(safeStats.sales_this_month) }),
          hintTone: (safeStats.sales_this_month > 0 ? 'positive' : 'muted') as KpiHintTone,
          icon: TrendingUp,
          color: 'from-emerald-500 to-emerald-600',
          bgTint: 'bg-emerald-500/10',
          to: '/sales',
        },
        {
          title: t('dashboard.receivable'),
          value: formatCurrency(safeStats.receivable_from_customers),
          hint:
            safeStats.receivable_from_customers > 0
              ? t('dashboard.kpi_receivable_attention')
              : safeStats.collections_this_month > 0
                ? fillTemplate(t('dashboard.kpi_collections_month'), {
                    amount: formatCurrency(safeStats.collections_this_month),
                  })
                : t('dashboard.kpi_receivable_ok'),
          hintTone: (safeStats.receivable_from_customers > 0
            ? 'caution'
            : safeStats.collections_this_month > 0
              ? 'positive'
              : 'muted') as KpiHintTone,
          icon: TrendingDown,
          color: 'from-rose-500 to-rose-600',
          bgTint: 'bg-rose-500/10',
          to: '/receivables',
        },
        {
          title: t('dashboard.total_products'),
          value: safeStats.total_products.toString(),
          hint: fillTemplate(t('dashboard.kpi_categories_inline'), { n: String(safeStats.total_categories) }),
          hintTone: 'muted' as const,
          icon: Package,
          color: 'from-blue-500 to-blue-600',
          bgTint: 'bg-blue-500/10',
          to: '/products',
        },
        {
          title: t('dashboard.active_retailers'),
          value: safeStats.active_retailers.toString(),
          hint: fillTemplate(t('dashboard.kpi_purchases_inline'), { n: String(safeStats.total_purchases) }),
          hintTone: 'muted' as const,
          icon: Users,
          color: 'from-violet-500 to-violet-600',
          bgTint: 'bg-violet-500/10',
          to: '/retailers',
        },
        {
          title: t('dashboard.low_stock'),
          value: safeStats.low_stock_count.toString(),
          hint:
            safeStats.low_stock_count > 0
              ? fillTemplate(t('dashboard.kpi_low_stock_attention'), { n: String(safeStats.low_stock_count) })
              : t('dashboard.kpi_low_stock_ok'),
          hintTone: (safeStats.low_stock_count > 0 ? 'caution' : 'muted') as KpiHintTone,
          icon: AlertTriangle,
          color: 'from-amber-500 to-amber-600',
          bgTint: 'bg-amber-500/10',
          to: '/inventory?filter=low-stock',
        },
        {
          title: t('dashboard.expiring_soon'),
          value: safeStats.expiring_soon_count.toString(),
          hint:
            safeStats.expiring_soon_count > 0
              ? fillTemplate(t('dashboard.kpi_expiry_attention'), { n: String(safeStats.expiring_soon_count) })
              : t('dashboard.kpi_expiry_ok'),
          hintTone: (safeStats.expiring_soon_count > 0 ? 'caution' : 'muted') as KpiHintTone,
          icon: AlertTriangle,
          color: 'from-orange-500 to-orange-600',
          bgTint: 'bg-orange-500/10',
          to: '/expiry',
        },
        {
          title: t('dashboard.payable_to_suppliers'),
          value: formatCurrency(safeStats.payable_to_supplier),
          hint:
            safeStats.payable_to_supplier > 0 ? t('dashboard.kpi_payable_attention') : t('dashboard.kpi_payable_ok'),
          hintTone: (safeStats.payable_to_supplier > 0 ? 'caution' : 'muted') as KpiHintTone,
          icon: ShoppingCart,
          color: 'from-indigo-500 to-indigo-600',
          bgTint: 'bg-indigo-500/10',
          to: '/purchase',
        },
        {
          title: t('dashboard.total_categories'),
          value: safeStats.total_categories.toString(),
          hint: fillTemplate(t('dashboard.kpi_products_inline'), { n: String(safeStats.total_products) }),
          hintTone: 'muted' as const,
          icon: FolderOpen,
          color: 'from-teal-500 to-teal-600',
          bgTint: 'bg-teal-500/10',
          to: '/products',
        },
      ]
    : [];

  const chartHasActivity = useMemo(
    () => salesMonthly.some((row) => row.sales > 0 || row.collections > 0),
    [salesMonthly]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title={t('dashboard.title')} />

      <div className="px-4 lg:px-6 pt-3 pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60">
        <p className="text-sm text-muted-foreground max-w-2xl">{t('dashboard.subtitle')}</p>
        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && !loading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('dashboard.last_updated')}:{' '}
              {lastUpdated.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium',
              'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-60'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            {t('dashboard.refresh')}
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-8">
        {loading ? (
          <div aria-busy="true" aria-label={t('dashboard.loading')}>
            <p className="sr-only">{t('dashboard.loading')}</p>
            <DashboardSkeleton />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t('dashboard.retry')}
            </button>
          </div>
        ) : (
          <>
            <section className="space-y-3" aria-labelledby="dashboard-kpis-heading">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 id="dashboard-kpis-heading" className="text-sm font-semibold text-foreground">
                  {t('dashboard.section_kpis')}
                </h2>
                <DashboardQuickActions />
              </div>
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
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br shadow-lg',
                        stat.color
                      )}
                    >
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center justify-end max-w-[min(100%,13rem)] px-2 py-1 rounded-full text-xs font-medium leading-snug',
                        stat.hintTone === 'positive' &&
                          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                        stat.hintTone === 'caution' &&
                          'bg-amber-500/10 text-amber-900 dark:text-amber-300',
                        stat.hintTone === 'muted' && 'bg-muted/90 text-muted-foreground'
                      )}
                    >
                      <span className="truncate text-right">{stat.hint}</span>
                    </span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-1 tracking-tight">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>

                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                      stat.bgTint
                    )}
                  />
                </Link>
              ))}
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="dashboard-charts-heading">
              <h2 id="dashboard-charts-heading" className="text-sm font-semibold text-foreground">
                {t('dashboard.section_charts')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <Card className={cn(cardSurface, 'overflow-hidden')}>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.sales_collections')}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                {!chartHasActivity ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                    {t('dashboard.no_chart_data')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesMonthly} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
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
                        tickFormatter={(value: number) =>
                          value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-sm text-muted-foreground">{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name={t('dashboard.chart_legend_sales')}
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-1))', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="collections"
                        name={t('dashboard.chart_legend_collections')}
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                </CardContent>
              </Card>

              <Card className={cn(cardSurface, 'overflow-hidden')}>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.top_selling_products')}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                {topProducts.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                    {t('dashboard.no_top_products')}
                  </div>
                ) : (
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
                        formatter={(value: number) => [formatCurrency(value), t('dashboard.total_sales')]}
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
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fill: 'white', fontSize: '11px', fontWeight: '600' }}
                          offset={8}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                </CardContent>
              </Card>
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="dashboard-activity-heading">
              <h2 id="dashboard-activity-heading" className="text-sm font-semibold text-foreground">
                {t('dashboard.section_activity')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <Card className={cn(cardSurface, 'overflow-hidden p-0')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 py-4 border-b border-border">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.recent_orders')}</CardTitle>
                  <Link
                    to="/sales"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    {t('dashboard.view_all')}
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
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
                      <div
                        key={order.id}
                        className="px-5 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                      >
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
                                  : order.status === 'cancelled'
                                    ? 'bg-slate-500/10 text-slate-600'
                                    : 'bg-amber-500/10 text-amber-600'
                            )}
                          >
                            {orderStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                </CardContent>
              </Card>

              <Card className={cn(cardSurface, 'overflow-hidden p-0')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 py-4 border-b border-border">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" aria-hidden />
                    {t('dashboard.expiring_soon')}
                  </CardTitle>
                  <Link to="/expiry" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0">
                    {t('dashboard.view_all')}
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {expiringRows.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.no_expiring_list')}</p>
                    </div>
                  ) : (
                    expiringRows.map((product, index) => (
                      <div
                        key={`${product.batch}-${index}`}
                        className="px-5 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('common.batch')}: {product.batch}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-600">{product.expiry}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.qty} {t('dashboard.items')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                </CardContent>
              </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
