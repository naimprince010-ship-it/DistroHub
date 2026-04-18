import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  User,
  Filter,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  Table2,
  Download,
} from 'lucide-react';
import api, { deleteWithOfflineQueue, postWithOfflineQueue, putWithOfflineQueue } from '@/lib/api';
import {
  bulkSaveRetailers,
  deleteRecord,
  getRetailers as getOfflineRetailers,
  saveRetailer,
  type RetailerRecord,
} from '@/lib/offlineDb';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  area: string;
  market_route_id?: string | null;
  district: string;
  credit_limit: number;
  current_due: number;
}

interface MarketRoute {
  id: string;
  name: string;
  sub_area?: string | null;
  market_day?: string | null;
  notes?: string | null;
}

const RETAILERS_VIEW_KEY = 'distrohub-retailers-view';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Normalize phone for tel: links (keeps leading + and digits) */
function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '#';
  return `tel:${cleaned}`;
}

function downloadRetailersCsv(
  rows: Retailer[],
  headers: [string, keyof Retailer][]
): void {
  const headerLine = headers.map(([label]) => escapeCsvCell(label)).join(',');
  const lines = [headerLine];
  for (const r of rows) {
    const cells = headers.map(([, key]) => {
      const v = r[key];
      if (typeof v === 'number') return String(v);
      return escapeCsvCell(String(v ?? ''));
    });
    lines.push(cells.join(','));
  }
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retailers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function initialsFromShop(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return '?';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

export function Retailers() {
  const { t, language } = useLanguage();
  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') ?? '';
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [marketRoutes, setMarketRoutes] = useState<MarketRoute[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      return localStorage.getItem(RETAILERS_VIEW_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(RETAILERS_VIEW_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  const formatMoney = useCallback(
    (n: number) => `৳\u00A0${(n ?? 0).toLocaleString(locale)}`,
    [locale]
  );

  const mapApiRetailerToRecord = (r: any, synced: boolean): RetailerRecord => ({
    id: r.id,
    name: r.name || '',
    shop_name: r.shop_name || '',
    phone: r.phone || '',
    area: r.area || '',
    address: r.address || '',
    market_route_id: r.market_route_id || null,
    credit_limit: r.credit_limit || 0,
    current_due: r.total_due || 0,
    synced,
    lastModified: Date.now(),
  });

  const mapRecordToRetailer = (r: RetailerRecord): Retailer => ({
    id: r.id,
    name: r.name,
    shop_name: r.shop_name,
    phone: r.phone,
    address: r.address,
    area: r.area,
    market_route_id: r.market_route_id || null,
    district: 'N/A',
    credit_limit: r.credit_limit,
    current_due: r.current_due,
  });

  const fetchRetailers = useCallback(
    async (silent = false) => {
      const token = localStorage.getItem('token');
      if (!token) {
        setRetailers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      try {
        const response = await api.get('/api/retailers');

        if (response.data) {
          const mappedRetailers: Retailer[] = response.data.map((r: any) => ({
            id: r.id || '',
            name: r.name || '',
            shop_name: r.shop_name || '',
            phone: r.phone || '',
            address: r.address || '',
            area: r.area || '',
            market_route_id: r.market_route_id || null,
            district: r.district || 'N/A',
            credit_limit: r.credit_limit || 0,
            current_due: r.total_due || 0,
          }));
          setRetailers(mappedRetailers);
          await bulkSaveRetailers(response.data.map((r: any) => mapApiRetailerToRecord(r, true)));
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          return;
        }

        const isOfflineError =
          !navigator.onLine ||
          error?.isNetworkError ||
          error?.code === 'ERR_NETWORK' ||
          error?.message?.includes('Network');

        if (isOfflineError) {
          const offlineRetailers = await getOfflineRetailers();
          setRetailers(offlineRetailers.map(mapRecordToRetailer));
        } else {
          setRetailers([]);
          setLoadError(error?.response?.data?.detail || error?.message || t('retailers.load_error'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  const fetchMarketRoutes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMarketRoutes([]);
      return;
    }

    try {
      const response = await api.get('/api/market-routes');
      setMarketRoutes(response.data || []);
    } catch {
      setMarketRoutes([]);
    }
  }, []);

  useEffect(() => {
    fetchRetailers(false);
    fetchMarketRoutes();
  }, [fetchRetailers, fetchMarketRoutes]);

  const updateSearchQuery = useCallback(
    (q: string) => {
      const next = new URLSearchParams(searchParams);
      const trimmed = q.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const areas = useMemo(() => [...new Set(retailers.map((r) => r.area).filter(Boolean))], [retailers]);

  const filteredRetailers = useMemo(() => {
    return retailers.filter((retailer) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        retailer.name.toLowerCase().includes(q) ||
        retailer.shop_name.toLowerCase().includes(q) ||
        retailer.area.toLowerCase().includes(q) ||
        retailer.phone.includes(searchTerm);

      const matchesArea = areaFilter === 'all' || retailer.area === areaFilter;

      const cl = retailer.credit_limit;
      const due = retailer.current_due;
      const matchesDue =
        dueFilter === 'all' ||
        (dueFilter === 'no_due' && due === 0) ||
        (dueFilter === 'has_due' && due > 0) ||
        (dueFilter === 'near_limit' && cl > 0 && due >= cl * 0.8 && due <= cl) ||
        (dueFilter === 'over_limit' && cl > 0 && due > cl);

      return matchesSearch && matchesArea && matchesDue;
    });
  }, [retailers, searchTerm, areaFilter, dueFilter]);

  const handleExportCsv = useCallback(() => {
    const headers: [string, keyof Retailer][] = [
      [t('retailers.csv_col_shop'), 'shop_name'],
      [t('retailers.csv_col_owner'), 'name'],
      [t('retailers.csv_col_phone'), 'phone'],
      [t('retailers.csv_col_address'), 'address'],
      [t('retailers.csv_col_area'), 'area'],
      [t('retailers.csv_col_district'), 'district'],
      [t('retailers.csv_col_credit'), 'credit_limit'],
      [t('retailers.csv_col_due'), 'current_due'],
    ];
    downloadRetailersCsv(filteredRetailers, headers);
    toast({ title: t('retailers.export_done') });
  }, [filteredRetailers, t]);

  const activeFiltersCount =
    [areaFilter, dueFilter].filter((f) => f !== 'all').length + (searchTerm ? 1 : 0);

  const clearFilters = () => {
    setAreaFilter('all');
    setDueFilter('all');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteBusy(true);
    try {
      await deleteWithOfflineQueue('retailers', `/api/retailers/${id}`, { id }, {
        onOfflineDelete: async () => deleteRecord('retailers', id),
        onOnlineDelete: async () => deleteRecord('retailers', id),
      });
      toast({ title: t('retailers.deleted') });
      setDeleteId(null);
      await fetchRetailers(true);
    } catch (error: any) {
      toast({
        title: t('retailers.delete_failed'),
        description: error.response?.data?.detail || error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const totalDue = retailers.reduce((sum, r) => sum + r.current_due, 0);
  const totalCredit = retailers.reduce((sum, r) => sum + r.credit_limit, 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title={t('retailers.title')} />

      <div className="p-3 md:p-4 max-w-[1400px] mx-auto space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-slate-700">{t('retailers.subtitle')}</p>
          <p className="hidden text-xs leading-relaxed text-slate-500 sm:block">{t('retailers.search_hint')}</p>
        </div>

        {loadError && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchRetailers(false)}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-800 shadow-sm ring-1 ring-red-200 hover:bg-red-100"
            >
              {t('retailers.retry')}
            </button>
          </div>
        )}

        {/* Stats — lighter than retailer cards (summary strip) */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-sm">
                <User className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{retailers.length}</p>
                <p className="text-xs font-medium text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t('retailers.stat_total')}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/90 text-white shadow-sm">
                <CreditCard className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatMoney(totalCredit)}</p>
                <p className="text-xs font-medium text-slate-600">{t('retailers.stat_credit')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600/90 text-white shadow-sm">
                <CreditCard className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatMoney(totalDue)}</p>
                <p className="text-xs font-medium text-slate-600">{t('retailers.stat_due')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: mobile search + chip → actions row → filter row */}
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('retailers.filter_section')}</h2>
          </div>
          <div className={cn('p-4', !searchTerm && 'sm:p-0')}>
            <div className="relative mb-4 border-b border-slate-100 pb-4 sm:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => updateSearchQuery(e.target.value)}
                placeholder={t('retailers.search_mobile')}
                className="input-field h-10 w-full pl-10"
                autoComplete="off"
                aria-label={t('retailers.search_mobile')}
              />
            </div>
            {searchTerm ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
                <span className="text-xs font-medium text-slate-500">{t('retailers.search_chip_label')}:</span>
                <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-sm text-slate-800">
                  <span className="max-w-[min(100%,220px)] truncate font-medium">{searchTerm}</span>
                  <button
                    type="button"
                    onClick={() => updateSearchQuery('')}
                    className="rounded-full p-0.5 text-slate-600 hover:bg-primary/20 hover:text-slate-900"
                    aria-label={t('retailers.search_clear')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 sm:order-1">
              <p className="text-xs text-slate-500" aria-live="polite">
                <span className="font-medium tabular-nums text-slate-700">{filteredRetailers.length}</span>
                <span className="mx-1 text-slate-400">/</span>
                <span className="tabular-nums"> {retailers.length}</span>
              </p>
            </div>
            <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2">
              <span className="sr-only">{t('retailers.actions_section')}</span>
              <div
                className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
                role="group"
                aria-label={t('retailers.actions_section')}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    viewMode === 'cards'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                  aria-pressed={viewMode === 'cards'}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t('retailers.view_cards')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    viewMode === 'table'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                  aria-pressed={viewMode === 'table'}
                >
                  <Table2 className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t('retailers.view_table')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading || filteredRetailers.length === 0}
                className="btn-secondary inline-flex h-10 shrink-0 items-center gap-2 px-3 disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('retailers.export_csv')}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchRetailers(true)}
                disabled={refreshing || loading}
                className="btn-secondary inline-flex h-10 shrink-0 items-center gap-2 px-3 disabled:opacity-50"
                aria-busy={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                <span className="hidden sm:inline">{t('retailers.refresh')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn-primary inline-flex h-10 shrink-0 items-center gap-2 px-4 font-medium shadow-sm"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t('retailers.add')}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <div className="min-w-0 xl:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="retailer-area">
                  {t('retailers.filter_area_all')}
                </label>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <select
                    id="retailer-area"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="input-field h-10 w-full appearance-none pl-10 pr-8"
                  >
                    <option value="all">{t('retailers.filter_area_all')}</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="retailer-due">
                  {t('retailers.filter_due_all')}
                </label>
                <select
                  id="retailer-due"
                  value={dueFilter}
                  onChange={(e) => setDueFilter(e.target.value)}
                  className="input-field h-10 w-full appearance-none pr-8"
                >
                  <option value="all">{t('retailers.filter_due_all')}</option>
                  <option value="no_due">{t('retailers.filter_no_due')}</option>
                  <option value="has_due">{t('retailers.filter_has_due')}</option>
                  <option value="near_limit">{t('retailers.filter_near_limit')}</option>
                  <option value="over_limit">{t('retailers.filter_over_limit')}</option>
                </select>
              </div>
              <div className="flex items-end xl:col-span-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-500 transition-colors enabled:border-red-200 enabled:bg-red-50 enabled:text-red-700 enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto xl:min-w-[7rem]"
                >
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{t('retailers.clear_filters')}</span>
                  {activeFiltersCount > 0 ? (
                    <span className="tabular-nums">({activeFiltersCount})</span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List: cards or table */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <Skeleton className="mb-3 h-5 w-3/4" />
                <Skeleton className="mb-2 h-4 w-1/2" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{t('retailers.csv_col_shop')}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{t('retailers.csv_col_owner')}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{t('retailers.csv_col_phone')}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{t('retailers.csv_col_area')}</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">{t('retailers.credit_limit')}</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">{t('retailers.current_due')}</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">{t('retailers.table_col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRetailers.map((retailer) => {
                  const cl = retailer.credit_limit;
                  const due = retailer.current_due;
                  const overLimit = cl > 0 && due > cl;
                  const nearLimit = cl > 0 && !overLimit && due >= cl * 0.8;
                  return (
                    <tr key={retailer.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-slate-900">{retailer.shop_name}</td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-slate-600">{retailer.name}</td>
                      <td className="px-3 py-2.5">
                        <a
                          href={telHref(retailer.phone)}
                          className="text-primary-600 hover:underline"
                          onClick={(e) => {
                            if (telHref(retailer.phone) === '#') e.preventDefault();
                          }}
                        >
                          {retailer.phone}
                        </a>
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-2.5 text-slate-600">{retailer.area || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatMoney(cl)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            'tabular-nums font-medium',
                            overLimit && 'text-red-600',
                            !overLimit && nearLimit && 'text-amber-700',
                            !overLimit && !nearLimit && due > 0 && 'text-rose-600',
                            !overLimit && !nearLimit && due === 0 && 'text-emerald-600'
                          )}
                        >
                          {formatMoney(due)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingRetailer(retailer)}
                          className="mr-1 inline-flex rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary-600"
                          aria-label={t('retailers.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(retailer.id)}
                          className="inline-flex rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={t('retailers.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredRetailers.map((retailer) => {
              const cl = retailer.credit_limit;
              const due = retailer.current_due;
              const overLimit = cl > 0 && due > cl;
              const nearLimit = cl > 0 && !overLimit && due >= cl * 0.8;

              return (
                <article
                  key={retailer.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary-700 ring-1 ring-primary/20"
                        aria-hidden
                      >
                        {initialsFromShop(retailer.shop_name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold leading-snug text-slate-900">{retailer.shop_name}</h3>
                        <p className="truncate text-sm text-slate-600">{retailer.name}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingRetailer(retailer)}
                        className="rounded p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600"
                        aria-label={t('retailers.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(retailer.id)}
                        className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={t('retailers.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2.5 space-y-1.5 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <a
                        href={telHref(retailer.phone)}
                        className="break-all text-primary-600 hover:underline"
                        onClick={(e) => {
                          if (telHref(retailer.phone) === '#') e.preventDefault();
                        }}
                      >
                        {retailer.phone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="line-clamp-2">{retailer.address || '—'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {retailer.area ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{retailer.area}</span>
                      ) : null}
                      {retailer.district && retailer.district !== 'N/A' ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{retailer.district}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-auto flex justify-between border-t border-slate-100 pt-2.5">
                    <div>
                      <p className="text-xs text-slate-500">{t('retailers.credit_limit')}</p>
                      <p className="font-semibold tabular-nums text-slate-900">{formatMoney(retailer.credit_limit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{t('retailers.current_due')}</p>
                      <p
                        className={cn(
                          'font-semibold tabular-nums',
                          overLimit && 'text-red-600',
                          !overLimit && nearLimit && 'text-amber-700',
                          !overLimit && !nearLimit && due > 0 && 'text-rose-600',
                          !overLimit && !nearLimit && due === 0 && 'text-emerald-600'
                        )}
                      >
                        {formatMoney(due)}
                      </p>
                    </div>
                  </div>

                  {overLimit && (
                    <div className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-center text-xs font-medium text-red-700">
                      {t('retailers.over_limit_banner')}
                    </div>
                  )}
                  {!overLimit && nearLimit && (
                    <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-center text-xs font-medium text-amber-800">
                      {t('retailers.near_limit_banner')}
                    </div>
                  )}
                </article>
              );
            })}
            {filteredRetailers.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-4 text-center text-slate-500 transition-colors hover:border-primary/35 hover:bg-primary/[0.06] hover:text-slate-700"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-slate-200/80">
                  <Plus className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-sm font-medium">{t('retailers.add_new_card')}</span>
              </button>
            ) : null}
          </div>
        )}

        {!loading && filteredRetailers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <User className="mx-auto mb-3 h-12 w-12 text-slate-300" aria-hidden />
            <p className="font-medium text-slate-700">{t('retailers.empty')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('retailers.empty_hint')}</p>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('retailers.add')}
            </button>
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="border-slate-200 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('retailers.delete_dialog_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {t('retailers.delete_dialog_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteBusy} className="border-slate-200">
              {t('products.cancel')}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteBusy}
              className={cn(buttonVariants(), 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600')}
              onClick={() => void executeDelete()}
            >
              {deleteBusy ? t('settings.saving') : t('common.delete')}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(showAddModal || editingRetailer) && (
        <RetailerModal
          retailer={editingRetailer}
          marketRoutes={marketRoutes}
          onClose={() => {
            setShowAddModal(false);
            setEditingRetailer(null);
          }}
          onSave={async (retailer) => {
            try {
              const retailerPayload: Record<string, unknown> = {
                name: retailer.name,
                shop_name: retailer.shop_name,
                phone: retailer.phone,
                address: retailer.address,
                area: retailer.area,
                market_route_id: retailer.market_route_id || null,
                credit_limit: retailer.credit_limit,
              };

              if (retailer.district && retailer.district !== 'N/A') {
                retailerPayload.district = retailer.district;
              }

              if (editingRetailer) {
                const localRecord: RetailerRecord = {
                  id: editingRetailer.id,
                  name: retailer.name,
                  shop_name: retailer.shop_name,
                  phone: retailer.phone,
                  address: retailer.address,
                  area: retailer.area,
                  market_route_id: retailer.market_route_id || null,
                  credit_limit: retailer.credit_limit,
                  current_due: retailer.current_due || 0,
                  synced: false,
                  lastModified: Date.now(),
                };
                await putWithOfflineQueue('retailers', `/api/retailers/${editingRetailer.id}`, retailerPayload, {
                  localRecord,
                  onOfflineSave: async (record) => saveRetailer(record as RetailerRecord),
                  onOnlineSave: async (data) => saveRetailer(mapApiRetailerToRecord(data, true)),
                });
              } else {
                const tempId = `offline-retailer-${Date.now()}`;
                const localRecord: RetailerRecord = {
                  id: tempId,
                  name: retailer.name,
                  shop_name: retailer.shop_name,
                  phone: retailer.phone,
                  address: retailer.address,
                  area: retailer.area,
                  market_route_id: retailer.market_route_id || null,
                  credit_limit: retailer.credit_limit,
                  current_due: retailer.current_due || 0,
                  synced: false,
                  lastModified: Date.now(),
                };
                await postWithOfflineQueue('retailers', '/api/retailers', retailerPayload, {
                  queueData: { ...retailerPayload, _local_id: tempId },
                  localRecord,
                  onOfflineSave: async (record) => saveRetailer(record as RetailerRecord),
                  onOnlineSave: async (data) => saveRetailer(mapApiRetailerToRecord(data, true)),
                });
              }

              toast({ title: t('retailers.saved') });
              await fetchRetailers(true);
              setShowAddModal(false);
              setEditingRetailer(null);
            } catch (error: any) {
              toast({
                title: t('retailers.save_failed'),
                description: error.response?.data?.detail || error.message,
                variant: 'destructive',
              });
            }
          }}
        />
      )}
    </div>
  );
}

interface RetailerModalProps {
  retailer: Retailer | null;
  marketRoutes: MarketRoute[];
  onClose: () => void;
  onSave: (retailer: Retailer) => void | Promise<void>;
}

function RetailerModal({ retailer, marketRoutes, onClose, onSave }: RetailerModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Partial<Retailer>>(
    retailer || {
      name: '',
      shop_name: '',
      phone: '',
      address: '',
      area: '',
      market_route_id: null,
      district: '',
      credit_limit: 0,
      current_due: 0,
    }
  );

  useEffect(() => {
    setFormData(
      retailer || {
        name: '',
        shop_name: '',
        phone: '',
        address: '',
        area: '',
        market_route_id: null,
        district: '',
        credit_limit: 0,
        current_due: 0,
      }
    );
  }, [retailer]);

  const selectedRoute = useMemo(() => {
    if (formData.market_route_id) {
      return marketRoutes.find((route) => route.id === formData.market_route_id) || null;
    }
    if (formData.area) {
      return marketRoutes.find((route) => route.name === formData.area) || null;
    }
    return null;
  }, [formData.area, formData.market_route_id, marketRoutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave(formData as Retailer);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-fade-in m-2 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="retailer-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 id="retailer-modal-title" className="text-xl font-semibold text-slate-900">
            {retailer ? t('retailers.modal_edit') : t('retailers.modal_add')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('products.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.owner_name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.shop_name')}</label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.phone')}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              required
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.address')}</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.route_area')}</label>
              <input
                type="text"
                list="market-route-options"
                value={formData.area}
                onChange={(e) => {
                  const value = e.target.value;
                  const match = marketRoutes.find((route) => route.name === value);
                  setFormData({
                    ...formData,
                    area: value,
                    market_route_id: match?.id || null,
                  });
                }}
                className="input-field"
                required
              />
              <datalist id="market-route-options">
                {marketRoutes.map((route) => (
                  <option key={route.id} value={route.name} label={route.sub_area ? `${route.name} - ${route.sub_area}` : route.name} />
                ))}
              </datalist>
              {selectedRoute?.market_day && (
                <p className="mt-1 text-xs text-slate-500">
                  {t('retailers.market_day_hint')}: {selectedRoute.market_day}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.district')}</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.credit_limit_bdt')}</label>
              <input
                type="number"
                min={0}
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('retailers.current_due_bdt')}</label>
              <input
                type="number"
                min={0}
                value={formData.current_due}
                onChange={(e) => setFormData({ ...formData, current_due: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('products.cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {retailer ? t('retailers.modal_edit') : t('retailers.modal_add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
