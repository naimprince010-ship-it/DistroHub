import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import {
  Plus,
  Edit,
  Trash2,
  CreditCard,
  User,
  Filter,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
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
import { useTableControls } from '@/hooks/useTableControls';
import { PaginationControls } from '@/components/ui/pagination-controls';

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

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
        if (error?.response?.status === 401) return;
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
    if (!token) { setMarketRoutes([]); return; }
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

  const retailersTable = useTableControls(filteredRetailers, {
    initialSortKey: 'shop_name',
    pageSize: 10,
  });

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
    <PageShell
      title={t('retailers.title')}
      subtitle={t('retailers.subtitle')}
      actions={
        <>
          <button type="button" onClick={handleExportCsv} disabled={loading || filteredRetailers.length === 0} className="btn-secondary inline-flex h-9 shrink-0 items-center gap-2 px-3 disabled:opacity-50">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('retailers.export_csv')}</span>
          </button>
          <button type="button" onClick={() => fetchRetailers(true)} disabled={refreshing || loading} className="btn-secondary inline-flex h-9 shrink-0 items-center gap-2 px-3 disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('retailers.refresh')}</span>
          </button>
          <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary inline-flex h-9 shrink-0 items-center gap-2 px-4 font-medium">
            <Plus className="h-4 w-4" />
            {t('retailers.add')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {loadError && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 px-4 py-3 text-sm text-[hsl(var(--dh-red))]"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchRetailers(false)}
              className="rounded-lg border border-[hsl(var(--dh-red))]/30 bg-card px-3 py-1.5 text-sm font-medium hover:bg-[hsl(var(--dh-red))]/10 transition-colors"
            >
              {t('retailers.retry')}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label={t('retailers.stat_total')} value={String(retailers.length)} color="blue" icon={User} />
          <StatCard label={t('retailers.stat_credit')} value={formatMoney(totalCredit)} color="green" icon={CreditCard} />
          <StatCard label={t('retailers.stat_due')} value={formatMoney(totalDue)} color="red" icon={CreditCard} />
        </div>

        {/* Toolbar */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/20 px-4 py-2.5">
            <div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{filteredRetailers.length}</span>
                <span className="mx-1 text-muted-foreground/50">/</span>
                <span>{retailers.length}</span>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <div className="min-w-0 md:col-span-2 xl:col-span-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="retailer-search">
                  {t('retailers.search_chip_label')}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="retailer-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => updateSearchQuery(e.target.value)}
                    placeholder={t('retailers.search_mobile')}
                    className="input-field h-10 w-full pl-10"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="min-w-0 xl:col-span-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="retailer-area">{t('retailers.filter_area_all')}</label>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select id="retailer-area" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="input-field h-10 w-full appearance-none pl-10 pr-8">
                    <option value="all">{t('retailers.filter_area_all')}</option>
                    {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="retailer-due">{t('retailers.filter_due_all')}</label>
                <select id="retailer-due" value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className="input-field h-10 w-full appearance-none pr-8">
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
                  className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 text-sm font-medium text-muted-foreground transition-colors enabled:border-[hsl(var(--dh-red))]/30 enabled:bg-[hsl(var(--dh-red))]/5 enabled:text-[hsl(var(--dh-red))] enabled:hover:bg-[hsl(var(--dh-red))]/10 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto xl:min-w-[7rem]"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t('retailers.clear_filters')}</span>
                  {activeFiltersCount > 0 ? <span>({activeFiltersCount})</span> : null}
                </button>
              </div>
            </div>
          </div>
          {/* List: table */}
          {loading ? (
          <div className="grid grid-cols-1 gap-3 border-t border-border p-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <Skeleton className="mb-3 h-5 w-3/4" />
                <Skeleton className="mb-2 h-4 w-1/2" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          ) : (
          <div className="dh-table-shell rounded-none border-x-0 border-b-0 border-t border-border shadow-none">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <button type="button" onClick={() => retailersTable.toggleSort('shop_name')} className="inline-flex items-center gap-1">
                      {t('retailers.csv_col_shop')}
                      <span className="text-[10px]">{retailersTable.sortKey === 'shop_name' ? (retailersTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">{t('retailers.csv_col_owner')}</th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">{t('retailers.csv_col_phone')}</th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">{t('retailers.csv_col_area')}</th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">{t('retailers.credit_limit')}</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <button type="button" onClick={() => retailersTable.toggleSort('current_due')} className="ml-auto inline-flex items-center gap-1">
                      {t('retailers.current_due')}
                      <span className="text-[10px]">{retailersTable.sortKey === 'current_due' ? (retailersTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('retailers.table_col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {retailersTable.paginatedRows.map((retailer) => {
                  const cl = retailer.credit_limit;
                  const due = retailer.current_due;
                  const overLimit = cl > 0 && due > cl;
                  const nearLimit = cl > 0 && !overLimit && due >= cl * 0.8;
                  return (
                    <tr key={retailer.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-foreground">{retailer.shop_name}</td>
                      <td className="hidden max-w-[120px] truncate px-3 py-2.5 text-muted-foreground md:table-cell">{retailer.name}</td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <a href={telHref(retailer.phone)} className="text-[hsl(var(--primary))] hover:underline" onClick={(e) => { if (telHref(retailer.phone) === '#') e.preventDefault(); }}>
                          {retailer.phone}
                        </a>
                      </td>
                      <td className="hidden max-w-[100px] truncate px-3 py-2.5 text-muted-foreground lg:table-cell">{retailer.area || '—'}</td>
                      <td className="hidden px-3 py-2.5 text-right font-mono text-muted-foreground md:table-cell">{formatMoney(cl)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn(
                          'font-mono font-medium',
                          overLimit && 'text-[hsl(var(--dh-red))]',
                          !overLimit && nearLimit && 'text-[hsl(var(--dh-amber))]',
                          !overLimit && !nearLimit && due > 0 && 'text-[hsl(var(--dh-red))]',
                          !overLimit && !nearLimit && due === 0 && 'text-[hsl(var(--dh-green))]'
                        )}>
                          {formatMoney(due)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button type="button" onClick={() => setEditingRetailer(retailer)} className="mr-1 inline-flex rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteId(retailer.id)} className="inline-flex rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--dh-red))]/10 hover:text-[hsl(var(--dh-red))] transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <PaginationControls
              page={retailersTable.page}
              totalPages={retailersTable.totalPages}
              totalRows={retailersTable.totalRows}
              onPageChange={retailersTable.setPage}
            />
          </div>
          )}
        </div>

        {!loading && filteredRetailers.length === 0 && (
          <div className="dh-empty-state rounded-xl border border-dashed border-border/70 bg-card">
            <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="dh-empty-state-title">{t('retailers.empty')}</p>
            <p className="dh-empty-state-desc">{t('retailers.empty_hint')}</p>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('retailers.add')}
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open && !deleteBusy) setDeleteId(null); }}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('retailers.delete_dialog_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">{t('retailers.delete_dialog_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteBusy} className="border-border">{t('products.cancel')}</AlertDialogCancel>
            <button type="button" disabled={deleteBusy} className={cn(buttonVariants(), 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600')} onClick={() => void executeDelete()}>
              {deleteBusy ? t('settings.saving') : t('common.delete')}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(showAddModal || editingRetailer) && (
        <RetailerModal
          retailer={editingRetailer}
          marketRoutes={marketRoutes}
          onClose={() => { setShowAddModal(false); setEditingRetailer(null); }}
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
    </PageShell>
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
    retailer || { name: '', shop_name: '', phone: '', address: '', area: '', market_route_id: null, district: '', credit_limit: 0, current_due: 0 }
  );

  useEffect(() => {
    setFormData(retailer || { name: '', shop_name: '', phone: '', address: '', area: '', market_route_id: null, district: '', credit_limit: 0, current_due: 0 });
  }, [retailer]);

  const selectedRoute = useMemo(() => {
    if (formData.market_route_id) return marketRoutes.find((route) => route.id === formData.market_route_id) || null;
    if (formData.area) return marketRoutes.find((route) => route.name === formData.area) || null;
    return null;
  }, [formData.area, formData.market_route_id, marketRoutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave(formData as Retailer);
  };

  return (
    <div className="dh-modal-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dh-modal-panel max-h-[90vh] w-full max-w-lg overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="retailer-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="retailer-modal-title" className="text-base font-semibold text-foreground">
            {retailer ? t('retailers.modal_edit') : t('retailers.modal_add')}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.owner_name')}</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required autoComplete="name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.shop_name')}</label>
              <input type="text" value={formData.shop_name} onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.phone')}</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" required autoComplete="tel" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.address')}</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" required />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.route_area')}</label>
              <input
                type="text"
                list="market-route-options"
                value={formData.area}
                onChange={(e) => {
                  const value = e.target.value;
                  const match = marketRoutes.find((route) => route.name === value);
                  setFormData({ ...formData, area: value, market_route_id: match?.id || null });
                }}
                className="input-field"
                required
              />
              <datalist id="market-route-options">
                {marketRoutes.map((route) => <option key={route.id} value={route.name} label={route.sub_area ? `${route.name} - ${route.sub_area}` : route.name} />)}
              </datalist>
              {selectedRoute?.market_day && (
                <p className="mt-1 text-xs text-muted-foreground">{t('retailers.market_day_hint')}: {selectedRoute.market_day}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.district')}</label>
              <input type="text" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.credit_limit_bdt')}</label>
              <input type="number" min={0} value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })} className="input-field" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('retailers.current_due_bdt')}</label>
              <input type="number" min={0} value={formData.current_due} onChange={(e) => setFormData({ ...formData, current_due: Number(e.target.value) })} className="input-field" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">{t('products.cancel')}</button>
            <button type="submit" className="btn-primary">{retailer ? t('retailers.modal_edit') : t('retailers.modal_add')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
