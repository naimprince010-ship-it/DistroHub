import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Package,
  Calendar,
  Filter,
  Search,
  X,
} from 'lucide-react';
import api from '@/lib/api';

interface ExpiryItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
  status: 'expired' | 'critical' | 'warning' | 'safe';
  location?: string;
}

interface DashboardStats {
  expiring_soon_count: number;
}

type ExpiryBadgeVariant = 'danger' | 'warning' | 'success' | 'info';
const statusConfig: Record<string, { variant: ExpiryBadgeVariant; label: string }> = {
  expired:  { variant: 'danger',  label: 'Expired' },
  critical: { variant: 'danger',  label: 'Critical (<30 days)' },
  warning:  { variant: 'warning', label: 'Warning (<60 days)' },
  safe:     { variant: 'success', label: 'Safe' },
};

export function Expiry() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Fetch expiry alerts from API
  const fetchExpiryAlerts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Expiry] No token found, skipping expiry alerts fetch');
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Expiry] Fetching expiry alerts from API...');

      const [alertsRes, dashboardRes] = await Promise.all([
        api.get('/api/expiry-alerts'),
        api.get('/api/dashboard/stats'),
      ]);

      if (alertsRes.data) {
        // Map backend ExpiryAlert to frontend ExpiryItem
        const mappedItems: ExpiryItem[] = alertsRes.data.map((alert: any) => {
          // Map backend status enum to frontend status
          let status: 'expired' | 'critical' | 'warning' | 'safe' = 'safe';
          if (alert.status === 'expired' || alert.status === 'EXPIRED') {
            status = 'expired';
          } else if (alert.status === 'critical' || alert.status === 'CRITICAL') {
            status = 'critical';
          } else if (alert.status === 'warning' || alert.status === 'WARNING') {
            status = 'warning';
          } else {
            status = 'safe';
          }

          // Format expiry date
          const expiryDate = alert.expiry_date
            ? new Date(alert.expiry_date).toISOString().split('T')[0]
            : '';

          return {
            id: alert.id || '',
            product_id: alert.product_id || '',
            product_name: alert.product_name || '',
            sku: alert.sku || '',
            batch_number: alert.batch_number || '',
            expiry_date: expiryDate,
            quantity: alert.quantity || 0,
            days_until_expiry: alert.days_until_expiry || 0,
            status: status,
            location: 'Main Warehouse', // Default location since batches don't have location field
          };
        });

        setItems(mappedItems);
        console.log('[Expiry] Expiry alerts fetched and mapped:', mappedItems.length);
      }

      if (dashboardRes.data) {
        setDashboardStats({
          expiring_soon_count: dashboardRes.data.expiring_soon_count || 0,
        });
        console.log('[Expiry] Dashboard stats fetched, expiring_soon_count:', dashboardRes.data.expiring_soon_count);
      }
    } catch (error: any) {
      console.error('[Expiry] Error fetching expiry alerts:', error);
      if (error?.response?.status === 401) {
        console.warn('[Expiry] 401 Unauthorized - token may be expired');
        return;
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryAlerts();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status logic: expired (past date), expiring_soon (<=30 days)
    const matchesFilter = filter === 'all' || 
      (filter === 'expired' && item.status === 'expired') ||
      (filter === 'critical' && (item.status === 'critical' || item.status === 'expired')) ||
      (filter === 'warning' && item.status === 'warning') ||
      (filter === 'safe' && item.status === 'safe');
    
    return matchesSearch && matchesFilter;
  });

  const activeFiltersCount = (filter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const clearFilters = () => {
    setFilter('all');
    setSearchTerm('');
  };

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const criticalCount = items.filter((i) => i.status === 'critical').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  
  // Verify critical count matches dashboard
  const dashboardCriticalCount = dashboardStats?.expiring_soon_count || 0;
  const countMatches = criticalCount === dashboardCriticalCount;

  return (
    <PageShell title="Expiry Alerts">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Expired"          value={expiredCount}  icon={AlertTriangle} color="red" />
        <StatCard label="Critical (<30d)"  value={criticalCount} icon={Calendar}      color="amber"
          hint={dashboardStats && !countMatches ? `Dashboard: ${dashboardStats.expiring_soon_count} ⚠` : undefined} />
        <StatCard label="Warning (<60d)"   value={warningCount}  icon={Package}       color="purple" />
        <StatCard label="Total Batches"    value={items.length}  icon={Package}       color="blue" />
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Expiry Tracking</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" placeholder="Search product, SKU, batch…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-8 h-9 w-52 text-sm" />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field pl-8 h-9 w-40 text-sm">
                  <option value="all">All Items</option>
                  <option value="expired">Expired Only</option>
                  <option value="critical">Critical (&lt;30 days)</option>
                  <option value="warning">Warning (&lt;60 days)</option>
                  <option value="safe">Safe</option>
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 h-9 px-3 text-sm rounded-lg border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading expiry alerts…</div>
          ) : (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {['Product Name','SKU','Batch','Expiry Date','Days Remaining','Qty','Location','Status'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map((item) => {
                    const isExpired = item.status === 'expired' || item.days_until_expiry < 0;
                    const isExpiringSoon = item.status === 'critical' || (item.days_until_expiry >= 0 && item.days_until_expiry <= 30);
                    const statusDisplay = isExpired ? 'expired' : isExpiringSoon ? 'critical' : item.status;
                    return (
                      <tr key={item.id} className={`transition-colors duration-150 ease-out hover:bg-muted/45 ${isExpired ? 'bg-[hsl(var(--dh-red))]/5' : isExpiringSoon ? 'bg-[hsl(var(--dh-amber))]/5' : ''}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">{item.product_name}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.sku || 'N/A'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.batch_number}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-medium text-xs ${isExpired ? 'text-[hsl(var(--dh-red))]' : 'text-foreground'}`}>{item.expiry_date}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`font-semibold font-mono text-xs ${item.days_until_expiry < 0 ? 'text-[hsl(var(--dh-red))]' : item.days_until_expiry <= 30 ? 'text-[hsl(var(--dh-amber))]' : 'text-[hsl(var(--dh-green))]'}`}>
                            {item.days_until_expiry < 0 ? `${Math.abs(item.days_until_expiry)}d overdue` : item.days_until_expiry}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-foreground">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{item.location || 'Main Warehouse'}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusConfig[statusDisplay].variant}>{statusConfig[statusDisplay].label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredItems.length === 0 && (
            <div className="dh-empty-state py-10">
              <p className="dh-empty-state-title">
                {searchTerm || filter !== 'all' ? 'No items found' : 'No expiry alerts'}
              </p>
              <p className="dh-empty-state-desc">
                {searchTerm || filter !== 'all' ? 'Try a different filter or search term.' : 'All products are currently safe.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIFO Notice */}
      <div className="bg-[hsl(var(--dh-blue))]/5 border border-[hsl(var(--dh-blue))]/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--dh-blue))] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-foreground text-sm">FIFO Recommendation</h4>
            <p className="text-sm text-muted-foreground">Products with earlier expiry dates should be sold first. The system automatically suggests items with nearest expiry when creating sales orders.</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
