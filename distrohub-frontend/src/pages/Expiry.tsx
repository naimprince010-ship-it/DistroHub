import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
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

const statusConfig = {
  expired: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Expired', icon: '🔴' },
  critical: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Critical (<30 days)', icon: '🟠' },
  warning: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Warning (<60 days)', icon: '🟡' },
  safe: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Safe', icon: '🟢' },
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
    <div className="min-h-screen">
      <Header title="Expiry Alerts" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                <p className="text-slate-500 text-sm">Expired</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{criticalCount}</p>
                <p className="text-slate-500 text-sm">Critical (&lt;30 days)</p>
                {dashboardStats && (
                  <p className="text-xs text-slate-400 mt-1">
                    Dashboard: {dashboardStats.expiring_soon_count}
                    {!countMatches && ' ⚠️ Mismatch'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
                <p className="text-slate-500 text-sm">Warning (&lt;60 days)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{items.length}</p>
                <p className="text-slate-500 text-sm">Total Batches</p>
              </div>
            </div>
          </div>
        </div>

                {/* Search & Filter */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by product name, SKU, or batch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="input-field pl-10 w-48"
                    >
                      <option value="all">All Items</option>
                      <option value="expired">Expired Only</option>
                      <option value="critical">Critical (&lt;30 days)</option>
                      <option value="warning">Warning (&lt;60 days)</option>
                      <option value="safe">Safe</option>
                    </select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear ({activeFiltersCount})
                    </button>
                  )}
                </div>

        {/* Expiry Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            Loading expiry alerts...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Batch Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Days Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredItems.map((item) => {
                    const isExpired = item.status === 'expired' || item.days_until_expiry < 0;
                    const isExpiringSoon = item.status === 'critical' || (item.days_until_expiry >= 0 && item.days_until_expiry <= 30);
                    const statusDisplay = isExpired ? 'expired' : isExpiringSoon ? 'critical' : item.status;
                    
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 ${
                          isExpired
                            ? 'bg-red-50'
                            : isExpiringSoon
                            ? 'bg-orange-50'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{item.product_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{item.sku || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{item.batch_number}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.expiry_date}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`text-sm font-semibold ${
                              item.days_until_expiry < 0
                                ? 'text-red-600'
                                : item.days_until_expiry <= 30
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {item.days_until_expiry < 0
                              ? `${Math.abs(item.days_until_expiry)} overdue`
                              : item.days_until_expiry}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{item.quantity}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{item.location || 'Main Warehouse'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[statusDisplay].color}`}>
                            {statusConfig[statusDisplay].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {searchTerm || filter !== 'all'
                  ? 'No items found for the selected filter.'
                  : 'No expiry alerts. All products are safe!'}
              </div>
            )}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-slate-500">
            {searchTerm || filter !== 'all'
              ? 'No items found for the selected filter.'
              : 'No expiry alerts. All products are safe!'}
          </div>
        )}

        {/* FIFO Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">FIFO Recommendation</h4>
              <p className="text-sm text-blue-700">
                Products with earlier expiry dates should be sold first. The system automatically suggests
                items with nearest expiry when creating sales orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
