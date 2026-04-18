import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Filter,
  X,
  ImagePlus,
  PackageMinus,
  Search,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Activity,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
// @ts-ignore - exceljs types may not be available in build
import { Workbook } from 'exceljs';
import { BarcodeScanButton } from '@/components/BarcodeScanner';
import api, { deleteWithOfflineQueue, postWithOfflineQueue, putWithOfflineQueue } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  bulkSaveProducts,
  deleteRecord,
  getProducts as getOfflineProducts,
  saveProduct,
  type ProductRecord,
} from '@/lib/offlineDb';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  pack_size: number;
  pieces_per_carton: number;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  batch_number: string;
  expiry_date: string;
  supplier: string;
  vat_inclusive: boolean;
  vat_rate: number;
  image_url: string;
}


interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
}

interface Unit {
  id: string;
  name: string;
  abbreviation?: string;
  description?: string;
}

const LOW_STOCK_THRESHOLD = 50;

function isExpiringSoonDate(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
}

function isExpiredDate(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
}

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') ?? '';
  const { t, language } = useLanguage();
  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';
  const formatMoney = useCallback(
    (n: number) => `৳\u00A0${(n ?? 0).toLocaleString(locale)}`,
    [locale]
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  const mapApiProductToRecord = (p: any, synced: boolean): ProductRecord => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    unit_price: p.selling_price ?? 0,
    stock_quantity: p.stock_quantity ?? 0,
    expiry_date: p.expiry_date ?? '',
    synced,
    lastModified: Date.now(),
  });

  const mapRecordToProduct = (p: ProductRecord): Product => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: '',
    category: p.category,
    unit: 'Pack',
    pack_size: 1,
    pieces_per_carton: 1,
    purchase_price: 0,
    selling_price: p.unit_price,
    stock_quantity: p.stock_quantity,
    reorder_level: 0,
    batch_number: '',
    expiry_date: p.expiry_date,
    supplier: '',
    vat_inclusive: false,
    vat_rate: 0,
    image_url: '',
  });

  // Fetch categories, suppliers, and units from API
  const fetchCategoriesAndSuppliers = async () => {
    // Check if token exists before making request
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Products] No token found, skipping API fetch');
      setCategories([]);
      setSuppliers([]);
      setUnits([]);
      return;
    }

    try {
      logger.log('[Products] Fetching categories, suppliers, and units...');
      const [categoriesRes, suppliersRes, unitsRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/suppliers'),
        api.get('/api/units')
      ]);

      // Always use API data, even if empty (removes reliance on defaults)
      if (categoriesRes.data) {
        const categoryNames = categoriesRes.data.map((c: Category) => c.name);
        setCategories(categoryNames);
        logger.log('[Products] Categories loaded:', categoryNames.length, categoryNames);
      }

      if (suppliersRes.data) {
        const supplierNames = suppliersRes.data.map((s: Supplier) => s.name);
        setSuppliers(supplierNames);
        logger.log('[Products] Suppliers loaded:', supplierNames.length, supplierNames);
      }

      if (unitsRes.data) {
        const unitNames = unitsRes.data.map((u: Unit) => u.name);
        setUnits(unitNames);
        logger.log('[Products] Units loaded:', unitNames.length, unitNames);
      }
    } catch (error: any) {
      console.error('[Products] Error fetching categories/suppliers:', error);
      console.error('[Products] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        hasToken: !!localStorage.getItem('token')
      });

      // On 401, let interceptor handle redirect
      if (error?.response?.status === 401) {
        console.warn('[Products] 401 Unauthorized - token may be expired');
        // Interceptor will redirect to login
        return;
      }

      // On other errors, use empty arrays (no defaults) to force API retry
      setCategories([]);
      setSuppliers([]);
      setUnits([]);
    }
  };

  // Fetch products from API
  const fetchProducts = async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.warn('[Products] No token found, skipping products fetch');
      setProducts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      logger.log('[Products] Fetching products from API...');
      const response = await api.get('/api/products');
      logger.log('[Products] Products fetched successfully:', response.data?.length || 0);

      if (response.data) {
        // Map backend Product to frontend Product interface
        interface ApiProduct {
          id: string;
          name: string;
          sku: string;
          barcode?: string | null;
          category: string;
          unit: string;
          pack_size?: number | null;
          pieces_per_carton?: number | null;
          purchase_price: number;
          selling_price: number;
          stock_quantity?: number | null;
          reorder_level?: number | null;
          batch_number?: string | null;
          expiry_date?: string | null;
          supplier?: string | null;
          vat_inclusive?: boolean | null;
          vat_rate?: number | null;
          image_url?: string | null;
        }
        const mappedProducts = response.data.map((p: ApiProduct) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          category: p.category,
          unit: p.unit,
          pack_size: p.pack_size || 1,
          pieces_per_carton: p.pieces_per_carton || p.pack_size || 1,
          purchase_price: p.purchase_price,
          selling_price: p.selling_price,
          stock_quantity: p.stock_quantity || 0,
          reorder_level: p.reorder_level || 0,
          batch_number: p.batch_number || '',
          expiry_date: p.expiry_date || '',
          supplier: p.supplier || '',
          vat_inclusive: p.vat_inclusive || false,
          vat_rate: p.vat_rate || 0,
          image_url: p.image_url || '',
        }));
        setProducts(mappedProducts);
        await bulkSaveProducts(response.data.map((p: ApiProduct) => mapApiProductToRecord(p, true)));
        logger.log('[Products] Products mapped and set:', mappedProducts.length);
      }
    } catch (error: any) {
      console.error('[Products] Error fetching products:', error);
      console.error('[Products] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      if (error?.response?.status === 401) {
        logger.warn('[Products] 401 Unauthorized - token may be expired');
        return;
      }

      const isOfflineError =
        !navigator.onLine || error?.isNetworkError || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network');
      if (isOfflineError) {
        const offlineProducts = await getOfflineProducts();
        setProducts(offlineProducts.map(mapRecordToProduct));
      } else {
        // On other errors, use empty array
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  // Fetch on mount
  useEffect(() => {
    fetchCategoriesAndSuppliers();
    fetchProducts();
  }, []);

  // Memoize expensive category calculation
  const allCategories = useMemo(() => {
    return [...new Set([...categories, ...products.map(p => p.category)])];
  }, [categories, products]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !allCategories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, allCategories]);

  // Memoize expensive filtering calculation
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && product.stock_quantity < LOW_STOCK_THRESHOLD && product.stock_quantity > 0) ||
        (stockFilter === 'out' && product.stock_quantity === 0) ||
        (stockFilter === 'in_stock' && product.stock_quantity >= LOW_STOCK_THRESHOLD);

      const matchesExpiry = expiryFilter === 'all' ||
        (expiryFilter === 'expired' && isExpiredDate(product.expiry_date)) ||
        (expiryFilter === 'expiring' && isExpiringSoonDate(product.expiry_date) && !isExpiredDate(product.expiry_date)) ||
        (expiryFilter === 'safe' && !isExpiringSoonDate(product.expiry_date));

      return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, expiryFilter]);

  const activeFiltersCount =
    [categoryFilter, stockFilter, expiryFilter].filter((f) => f !== 'all').length + (searchTerm ? 1 : 0);

  const productStats = useMemo(() => {
    let low = 0;
    let out = 0;
    let expiring = 0;
    for (const p of products) {
      if (p.stock_quantity === 0) out++;
      else if (p.stock_quantity < LOW_STOCK_THRESHOLD) low++;
      if (p.expiry_date && isExpiringSoonDate(p.expiry_date) && !isExpiredDate(p.expiry_date)) expiring++;
    }
    return { total: products.length, low, out, expiring };
  }, [products]);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      const jsonData: Product[] = [];

      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // Skip header row

        const values = row.values as (string | number | boolean)[];
        if (values.length > 1) {
          jsonData.push({
            id: `imported-${Date.now()}-${rowNumber}`,
            name: String(values[1] || ''),
            sku: String(values[2] || ''),
            barcode: String(values[3] || ''),
            category: String(values[4] || ''),
            unit: String(values[5] || ''),
            pack_size: typeof values[6] === 'number' ? values[6] : (typeof values[6] === 'string' ? parseFloat(values[6]) || 1 : 1),
            pieces_per_carton: typeof values[7] === 'number' ? values[7] : (typeof values[7] === 'string' ? parseFloat(values[7]) || 12 : 12),
            purchase_price: typeof values[8] === 'number' ? values[8] : (typeof values[8] === 'string' ? parseFloat(values[8]) || 0 : 0),
            selling_price: typeof values[9] === 'number' ? values[9] : (typeof values[9] === 'string' ? parseFloat(values[9]) || 0 : 0),
            stock_quantity: typeof values[10] === 'number' ? values[10] : (typeof values[10] === 'string' ? parseFloat(values[10]) || 0 : 0),
            reorder_level: typeof values[11] === 'number' ? values[11] : (typeof values[11] === 'string' ? parseFloat(values[11]) || 10 : 10),
            supplier: String(values[12] || ''),
            vat_inclusive: typeof values[13] === 'boolean' ? values[13] : (typeof values[13] === 'string' ? values[13] === 'true' : false),
            vat_rate: typeof values[14] === 'number' ? values[14] : (typeof values[14] === 'string' ? parseFloat(values[14]) || 0 : 0),
            image_url: String(values[15] || ''),
            batch_number: '',
            expiry_date: '',
          });
        }
      });

      if (jsonData.length > 0) {
        setProducts([...products, ...jsonData]);
        toast({
          title: t('products.import_done'),
          description: `${jsonData.length}`,
        });
      } else {
        toast({ title: t('products.no_products'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('[Products] Error importing Excel:', error);
      toast({ title: t('settings.save_failed'), description: String(error), variant: 'destructive' });
    }
  };

  const handleExcelExport = async () => {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Products');

      // Add headers
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Barcode', key: 'barcode', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Pack Size', key: 'pack_size', width: 12 },
        { header: 'Pieces/Carton', key: 'pieces_per_carton', width: 15 },
        { header: 'Purchase Price', key: 'purchase_price', width: 15 },
        { header: 'Selling Price', key: 'selling_price', width: 15 },
        { header: 'Stock', key: 'stock_quantity', width: 10 },
        { header: 'Reorder Level', key: 'reorder_level', width: 15 },
        { header: 'Supplier', key: 'supplier', width: 20 },
        { header: 'VAT Inclusive', key: 'vat_inclusive', width: 15 },
        { header: 'VAT Rate', key: 'vat_rate', width: 12 },
        { header: 'Image URL', key: 'image_url', width: 30 },
      ];

      // Add rows
      products.forEach((product) => {
        worksheet.addRow({
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          unit: product.unit,
          pack_size: product.pack_size,
          pieces_per_carton: product.pieces_per_carton,
          purchase_price: product.purchase_price,
          selling_price: product.selling_price,
          stock_quantity: product.stock_quantity,
          reorder_level: product.reorder_level,
          supplier: product.supplier,
          vat_inclusive: product.vat_inclusive,
          vat_rate: product.vat_rate,
          image_url: product.image_url,
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'products.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: t('products.export_done') });
    } catch (error) {
      console.error('[Products] Error exporting Excel:', error);
      toast({ title: t('settings.save_failed'), description: String(error), variant: 'destructive' });
    }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteBusy(true);
    try {
      logger.log('[Products] Deleting product:', id);
      await deleteWithOfflineQueue('products', `/api/products/${id}`, { id }, {
        onOfflineDelete: async () => deleteRecord('products', id),
        onOnlineDelete: async () => deleteRecord('products', id),
      });
      logger.log('[Products] Product deleted successfully');
      await fetchProducts(true);
      toast({ title: t('products.delete_success') });
      setDeleteId(null);
    } catch (error: any) {
      console.error('[Products] Failed to delete product:', error);
      let errorMessage = 'Failed to delete product';
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Cannot connect')) {
        errorMessage = 'Backend server is not responding. Please try again.';
      } else {
        errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete product';
      }
      toast({ title: t('settings.save_failed'), description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteBusy(false);
    }
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setStockFilter('all');
    setExpiryFilter('all');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      <Header title={t('common.products')} />

      <div className="mx-auto max-w-[1680px] space-y-6 p-4 md:p-6">
        <div className="space-y-1.5">
          <p className="text-sm leading-relaxed text-slate-700">{t('products.subtitle')}</p>
          <p className="hidden text-xs leading-relaxed text-slate-500 sm:block">{t('products.search_hint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600/90 text-white shadow-sm">
                <Package className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{productStats.total}</p>
                <p className="text-xs font-medium text-slate-600">{t('products.stat_total')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600/90 text-white shadow-sm">
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{productStats.low}</p>
                <p className="text-xs font-medium text-slate-600">{t('products.stat_low')}</p>
              </div>
            </div>
          </div>
          <div
            className={cn(
              'rounded-xl border bg-slate-50/90 p-3 ring-1 transition-shadow',
              productStats.total > 0 && productStats.out === productStats.total
                ? 'border-red-300/90 ring-2 ring-red-200/80 shadow-sm'
                : 'border-slate-200/80 ring-slate-200/60'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/90 text-white shadow-sm">
                <PackageMinus className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{productStats.out}</p>
                <p className="text-xs font-medium text-slate-600">{t('products.stat_out')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 ring-1 ring-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600/90 text-white shadow-sm">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{productStats.expiring}</p>
                <p className="text-xs font-medium text-slate-600">{t('products.stat_expiring')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('products.filter_section')}</h2>
          </div>
          <div className={cn('p-4', !searchTerm && 'sm:p-0')}>
            <div className="relative mb-4 border-b border-slate-100 pb-4 sm:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => updateSearchQuery(e.target.value)}
                placeholder={t('products.search_mobile')}
                className="input-field h-10 w-full pl-10"
                autoComplete="off"
                aria-label={t('products.search_mobile')}
              />
            </div>
            {searchTerm ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
                <span className="text-xs font-medium text-slate-500">{t('products.search_chip_label')}:</span>
                <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-sm text-slate-800">
                  <span className="max-w-[min(100%,220px)] truncate font-medium">{searchTerm}</span>
                  <button
                    type="button"
                    onClick={() => updateSearchQuery('')}
                    className="rounded-full p-0.5 text-slate-600 hover:bg-primary/20 hover:text-slate-900"
                    aria-label={t('products.search_clear')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 sm:order-1">
              <p className="text-sm text-slate-600" aria-live="polite">
                {t('products.toolbar_count')
                  .replace('{{f}}', String(filteredProducts.length))
                  .replace('{{t}}', String(products.length))}
              </p>
            </div>
            <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2">
              <span className="sr-only">{t('products.actions_section')}</span>
              <button
                type="button"
                onClick={() => fetchProducts(true)}
                disabled={refreshing || loading}
                className="btn-secondary inline-flex h-10 shrink-0 items-center gap-2 px-3 disabled:opacity-50"
                aria-busy={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                <span className="hidden sm:inline">{t('products.refresh')}</span>
              </button>
              <label className="btn-secondary inline-flex h-10 cursor-pointer shrink-0 items-center gap-2 px-3">
                <Upload className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('common.import')}</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleExcelExport}
                disabled={loading || products.length === 0}
                className="btn-secondary inline-flex h-10 shrink-0 items-center gap-2 px-3 disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('common.export')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  fetchCategoriesAndSuppliers();
                  setShowAddModal(true);
                }}
                className="btn-primary inline-flex h-10 shrink-0 items-center gap-2 px-4 font-medium shadow-sm"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t('common.add_product')}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <div className="min-w-0 xl:col-span-4">
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                  htmlFor="product-category"
                >
                  {t('products.filter_label_category')}
                </label>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger
                      id="product-category"
                      className="h-10 w-full border-slate-200 bg-white pl-10 pr-8 text-left text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-ring [&>span]:line-clamp-1"
                    >
                      <SelectValue placeholder={t('common.all_categories')} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                      <SelectItem value="all">{t('common.all_categories')}</SelectItem>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-4">
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                  htmlFor="product-stock"
                >
                  {t('products.filter_label_stock')}
                </label>
                <div className="relative">
                  <Activity className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger
                      id="product-stock"
                      className="h-10 w-full border-slate-200 bg-white pl-10 pr-8 text-left text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-ring [&>span]:line-clamp-1"
                    >
                      <SelectValue placeholder={t('common.all_stock')} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">{t('common.all_stock')}</SelectItem>
                      <SelectItem value="in_stock">{t('products.in_stock')}</SelectItem>
                      <SelectItem value="low">{t('products.low_stock')}</SelectItem>
                      <SelectItem value="out">{t('products.out_of_stock')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-2">
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                  htmlFor="product-expiry"
                >
                  {t('products.filter_label_expiry')}
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                    <SelectTrigger
                      id="product-expiry"
                      className="h-10 w-full border-slate-200 bg-white pl-10 pr-8 text-left text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-ring [&>span]:line-clamp-1"
                    >
                      <SelectValue placeholder={t('common.all_expiry')} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">{t('common.all_expiry')}</SelectItem>
                      <SelectItem value="expired">{t('products.expired')}</SelectItem>
                      <SelectItem value="expiring">{t('products.expiring_soon')}</SelectItem>
                      <SelectItem value="safe">{t('products.safe')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex min-w-0 flex-col xl:col-span-2">
                <span
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-transparent select-none"
                  aria-hidden
                >
                  {t('products.filter_label_category')}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-500 transition-colors enabled:border-red-200 enabled:bg-red-50 enabled:text-red-700 enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto xl:min-w-[7rem]"
                >
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{t('products.clear_filters')}</span>
                  {activeFiltersCount > 0 ? (
                    <span className="tabular-nums">({activeFiltersCount})</span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* overflow-hidden breaks position:sticky on thead — keep scroll + rounding on inner wrapper */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">{t('products.title')}</h2>
            <span className="max-w-[min(100%,18rem)] truncate text-xs text-slate-500 sm:max-w-none">
              {t('products.toolbar_count')
                .replace('{{f}}', String(filteredProducts.length))
                .replace('{{t}}', String(products.length))}
            </span>
          </div>
          {/* Single scrollport: vertical + horizontal — nested overflow-x was breaking sticky header */}
          <div className="relative isolate max-h-[min(70vh,calc(100vh-14rem))] overflow-auto overscroll-contain">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
                <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-30 w-12 border-b border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                        #
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.products')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.sku')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.category')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.unit')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.purchase')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.selling')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.stock')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.pcs_ctn')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.batch')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.expiry')}
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {filteredProducts.map((product, index) => {
                      const stockLevel =
                        product.stock_quantity === 0
                          ? 'out'
                          : product.stock_quantity < LOW_STOCK_THRESHOLD
                            ? 'low'
                            : 'ok';
                      const expiryStatus = isExpiredDate(product.expiry_date)
                        ? 'expired'
                        : isExpiringSoonDate(product.expiry_date)
                          ? 'soon'
                          : 'ok';
                      const isAlert = stockLevel === 'out' || stockLevel === 'low' || expiryStatus === 'expired' || expiryStatus === 'soon';

                      return (
                        <tr
                          key={product.id}
                          className={cn(
                            'transition-colors hover:bg-slate-50/90',
                            isAlert && 'bg-amber-50/40',
                            stockLevel === 'out' && 'bg-red-50/30'
                          )}
                        >
                          <td className="p-2.5 text-center text-xs font-medium tabular-nums text-slate-500">{index + 1}</td>
                          <td className="p-2.5">
                            <div className="flex max-w-[220px] items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                                <Package className="h-4 w-4 text-primary-700" aria-hidden />
                              </div>
                              <span className="truncate font-medium text-slate-900" title={product.name}>
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 font-mono text-xs text-slate-600">{product.sku}</td>
                          <td className="p-2.5">
                            <span className="inline-block max-w-[140px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              {product.category}
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-slate-600">{product.unit}</td>
                          <td className="p-2.5 text-right tabular-nums text-slate-700">{formatMoney(product.purchase_price)}</td>
                          <td className="p-2.5 text-right font-semibold tabular-nums text-slate-900">{formatMoney(product.selling_price)}</td>
                          <td className="p-2.5 text-right">
                            <span
                              className={cn(
                                'inline-flex min-w-[2rem] justify-end tabular-nums font-medium',
                                product.stock_quantity === 0 && 'font-semibold text-red-600',
                                product.stock_quantity > 0 &&
                                  product.stock_quantity < LOW_STOCK_THRESHOLD &&
                                  'text-amber-700',
                                product.stock_quantity >= LOW_STOCK_THRESHOLD && 'text-emerald-700'
                              )}
                            >
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-xs tabular-nums text-slate-600">
                            {product.pieces_per_carton || product.pack_size || '—'}
                          </td>
                          <td className="p-2.5 font-mono text-xs text-slate-600">{product.batch_number || '—'}</td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              {isExpiredDate(product.expiry_date) ? (
                                <span className="text-xs font-medium text-red-600">{product.expiry_date || '—'}</span>
                              ) : (
                                <>
                                  {isExpiringSoonDate(product.expiry_date) ? (
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                                  ) : null}
                                  <span
                                    className={cn(
                                      'text-xs',
                                      isExpiringSoonDate(product.expiry_date)
                                        ? 'font-medium text-amber-800'
                                        : 'text-slate-600'
                                    )}
                                  >
                                    {product.expiry_date || '—'}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary-700"
                                title={t('products.edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteId(product.id)}
                                className="rounded p-2 text-red-600 transition-colors hover:bg-red-50"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

              {filteredProducts.length === 0 && !loading && (
                <div className="px-4 py-12 text-center">
                  <Package className="mx-auto mb-3 h-12 w-12 text-slate-300" aria-hidden />
                  <p className="font-medium text-slate-700">{t('products.no_products')}</p>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="border-slate-200 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.delete_dialog_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {t('products.delete_dialog_desc')}
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
              onClick={executeDelete}
            >
              {deleteBusy ? '…' : t('common.delete')}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Modal would go here */}
      {
        (showAddModal || editingProduct) && (
          <ProductModal
            product={editingProduct}
            categories={categories}
            suppliers={suppliers}
            units={units}
            onRefreshCategories={fetchCategoriesAndSuppliers}
            onClose={() => {
              setShowAddModal(false);
              setEditingProduct(null);
            }}
            onSave={async (product, addAnother) => {
              try {
                logger.log('[Products] Saving product:', {
                  isEdit: !!editingProduct,
                  productId: editingProduct?.id,
                  productName: product.name
                });

                // Map frontend Product to backend ProductCreate format
                const payload = {
                  name: product.name,
                  sku: product.sku,
                  barcode: product.barcode || '',
                  category: product.category,
                  unit: product.unit,
                  pack_size: product.pack_size || 1,
                  pieces_per_carton: product.pieces_per_carton || product.pack_size || 1,
                  purchase_price: product.purchase_price,
                  selling_price: product.selling_price,
                  stock_quantity: product.stock_quantity || 0,
                  reorder_level: product.reorder_level || 0,
                  batch_number: product.batch_number || '',
                  expiry_date: product.expiry_date || undefined,
                  supplier: product.supplier || '',
                  vat_inclusive: product.vat_inclusive || false,
                  vat_rate: product.vat_rate || 0,
                  image_url: product.image_url || '',
                };

                logger.log('[Products] API payload:', payload);

                if (editingProduct) {
                  const localRecord: ProductRecord = {
                    id: editingProduct.id,
                    name: product.name,
                    sku: product.sku,
                    category: product.category,
                    unit_price: product.selling_price,
                    stock_quantity: product.stock_quantity || 0,
                    expiry_date: product.expiry_date || '',
                    synced: false,
                    lastModified: Date.now(),
                  };
                  logger.log('[Products] Updating product via PUT:', `/api/products/${editingProduct.id}`);
                  await putWithOfflineQueue('products', `/api/products/${editingProduct.id}`, payload, {
                    localRecord,
                    onOfflineSave: async (record) => saveProduct(record as ProductRecord),
                    onOnlineSave: async (data) => {
                      const mapped = mapApiProductToRecord(data, true);
                      await saveProduct(mapped);
                    },
                  });
                  logger.log('[Products] Product updated successfully');
                } else {
                  const tempId = `offline-product-${Date.now()}`;
                  const localRecord: ProductRecord = {
                    id: tempId,
                    name: product.name,
                    sku: product.sku,
                    category: product.category,
                    unit_price: product.selling_price,
                    stock_quantity: product.stock_quantity || 0,
                    expiry_date: product.expiry_date || '',
                    synced: false,
                    lastModified: Date.now(),
                  };
                  logger.log('[Products] Creating product via POST:', '/api/products');
                  await postWithOfflineQueue('products', '/api/products', payload, {
                    queueData: { ...payload, _local_id: tempId },
                    localRecord,
                    onOfflineSave: async (record) => saveProduct(record as ProductRecord),
                    onOnlineSave: async (data) => {
                      const mapped = mapApiProductToRecord(data, true);
                      await saveProduct(mapped);
                    },
                  });
                  logger.log('[Products] Product created successfully');
                }

                // Refetch products from API to get latest data
                logger.log('[Products] Refetching products list...');
                await fetchProducts();

                if (!addAnother) {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }
                logger.log('[Products] Product operation completed successfully');
              } catch (error: any) {
                console.error('[Products] Failed to save product:', error);
                console.error('[Products] Error details:', {
                  message: error?.message,
                  response: error?.response?.data,
                  status: error?.response?.status,
                  url: error?.config?.url,
                });

                let errorMessage = 'Failed to save product';
                if (error?.response) {
                  const status = error.response.status;
                  const detail = error.response.data?.detail || error.response.data?.message || error.response.data;

                  if (status === 400) {
                    errorMessage = `Validation error: ${detail || 'Invalid input data'}`;
                  } else if (status === 401) {
                    errorMessage = 'Authentication failed. Please login again.';
                  } else if (status === 409) {
                    errorMessage = `Conflict: ${detail || 'Product with this SKU already exists'}`;
                  } else if (status === 500) {
                    errorMessage = `Server error: ${detail || 'An unexpected error occurred'}`;
                  } else {
                    errorMessage = `Error ${status}: ${detail || error.message || 'Unknown error'}`;
                  }
                } else if (error?.message) {
                  errorMessage = error.message;
                }

                alert(`Failed to save product: ${errorMessage}`);
              }
            }}
          />
        )}
    </div>
  );
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product, addAnother?: boolean) => void;
  categories: string[];
  suppliers: string[];
  units: string[];
  onRefreshCategories?: () => void;
}

interface ValidationErrors {
  [key: string]: string;
}

function ProductModal({ product, onClose, onSave, categories, suppliers, units, onRefreshCategories }: ProductModalProps) {
  const { t } = useLanguage();
  // Refetch categories when modal opens to ensure latest data
  useEffect(() => {
    if (onRefreshCategories) {
      onRefreshCategories();
    }
  }, []); // Run once when modal opens
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      sku: '',
      barcode: '',
      category: '',
      unit: 'Pack',
      pack_size: 1,
      pieces_per_carton: 24,
      purchase_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      reorder_level: 10,
      expiry_date: '',
      supplier: '',
      vat_inclusive: false,
      vat_rate: 0,
      image_url: '',
      batch_number: '',
    }
  );
  const [skuAutoGenerated, setSkuAutoGenerated] = useState(!product?.sku);
  const [batchAutoGenerated, setBatchAutoGenerated] = useState(!product?.batch_number);
  const [cartonCount, setCartonCount] = useState(0);
  const [autoCalcStock, setAutoCalcStock] = useState(!product);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unitOptions = useMemo(() => {
    const fallbackUnits = ['Pack', 'Bag', 'Box', 'Piece', 'Carton'];
    const baseUnits = units.length > 0 ? units : fallbackUnits;
    const currentUnit = formData.unit;
    if (currentUnit && !baseUnits.includes(currentUnit)) {
      return [currentUnit, ...baseUnits];
    }
    return baseUnits;
  }, [units, formData.unit]);

  const generateBatchNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `B${year}${month}-${rand}`;
  };

  const buildSku = () => {
    if (!formData.name || !formData.category) return '';
    const nameCode = formData.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const catCode = formData.category.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `${nameCode}-${catCode}-${randomNum}`;
  };

  const buildFallbackSku = () => {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `PRD-GEN-${randomNum}`;
  };

  const handleBarcodeScan = (barcode: string) => {
    setFormData({ ...formData, barcode });
  };

  useEffect(() => {
    const shouldAutoGenerate = !formData.sku || skuAutoGenerated;
    if (!shouldAutoGenerate) return;
    const nextSku = buildSku();
    if (!nextSku) return;
    setFormData((prev) => (prev.sku === nextSku ? prev : { ...prev, sku: nextSku }));
    setSkuAutoGenerated(true);
  }, [formData.name, formData.category]);

  const validateField = (name: string, value: string | number) => {
    const newErrors = { ...errors };

    if (name === 'name' && !value) {
      newErrors.name = 'Product name is required';
    } else if (name === 'name') {
      delete newErrors.name;
    }

    if (name === 'purchase_price' && (typeof value === 'number' && value < 0)) {
      newErrors.purchase_price = 'Price cannot be negative';
    } else if (name === 'purchase_price') {
      delete newErrors.purchase_price;
    }

    if (name === 'selling_price' && (typeof value === 'number' && value < 0)) {
      newErrors.selling_price = 'Price cannot be negative';
    } else if (name === 'selling_price') {
      delete newErrors.selling_price;
    }

    if (name === 'stock_quantity' && (typeof value === 'number' && value < 0)) {
      newErrors.stock_quantity = 'Stock cannot be negative';
    } else if (name === 'stock_quantity') {
      delete newErrors.stock_quantity;
    }

    setErrors(newErrors);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData({ ...formData, image_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const profitAmount = (formData.selling_price || 0) - (formData.purchase_price || 0);
  const profitPercent = formData.purchase_price && formData.purchase_price > 0
    ? ((profitAmount / formData.purchase_price) * 100).toFixed(1)
    : '0';

  const updateStockFromCartons = (nextCartonCount: number, nextPiecesPerCarton: number) => {
    const cartons = Number(nextCartonCount) || 0;
    const pieces = Number(nextPiecesPerCarton) || 0;
    if (cartons <= 0 || pieces <= 0) {
      return;
    }
    const nextStock = Math.max(0, cartons * pieces);
    setFormData((prev) => (prev.stock_quantity === nextStock ? prev : { ...prev, stock_quantity: nextStock }));
  };

  useEffect(() => {
    if (!autoCalcStock) return;
    updateStockFromCartons(cartonCount, formData.pieces_per_carton || 0);
  }, [autoCalcStock, cartonCount, formData.pieces_per_carton]);

  useEffect(() => {
    if (product) return;
    if (!formData.sku) {
      const nextSku = buildSku();
      const skuToUse = nextSku || buildFallbackSku();
      setFormData((prev) => ({ ...prev, sku: skuToUse }));
      setSkuAutoGenerated(true);
    }
    if (!formData.batch_number) {
      const nextBatch = generateBatchNumber();
      setFormData((prev) => ({ ...prev, batch_number: nextBatch }));
      setBatchAutoGenerated(true);
    }
  }, []);

  const batchHasValue = !!(formData.batch_number && formData.batch_number.trim() !== '');
  const expiryRequired = batchHasValue && !batchAutoGenerated;

  const handleSubmit = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();

    let nextFormData = formData;
    if (!batchHasValue && formData.expiry_date) {
      const generatedBatch = generateBatchNumber();
      nextFormData = { ...formData, batch_number: generatedBatch };
      setFormData(nextFormData);
    }

    const hasBatch = !!(nextFormData.batch_number && nextFormData.batch_number.trim() !== '');
    if (hasBatch && !nextFormData.expiry_date) {
      setErrors({ ...errors, expiry_date: t('products.expiry_required') || 'Expiry date is required' });
      return;
    }

    onSave(nextFormData as Product, addAnother);

    if (addAnother) {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        category: formData.category,
        unit: formData.unit,
        pack_size: 1,
        pieces_per_carton: 24,
        purchase_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        reorder_level: 10,
        batch_number: generateBatchNumber(),
        expiry_date: '',
        supplier: formData.supplier,
        vat_inclusive: formData.vat_inclusive,
        vat_rate: formData.vat_rate,
        image_url: '',
      });
      setCartonCount(0);
      setAutoCalcStock(true);
      setSkuAutoGenerated(true);
      setBatchAutoGenerated(true);
      setImagePreview('');
      setErrors({});
    }
  };

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {product ? t('products.edit') : t('products.add_new')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 space-y-4">
          {/* Product Image */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div
                className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImagePlus className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="text-xs text-slate-500">{t('products.add_image')}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('products.name')}<RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    validateField('name', e.target.value);
                  }}
                  className={`input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                  required
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('common.sku')}<RequiredMark />
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => {
                      setFormData({ ...formData, sku: e.target.value });
                      setSkuAutoGenerated(false);
                    }}
                    className="input-field flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.barcode')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={t('products.scan_barcode')}
                />
                <BarcodeScanButton onScan={handleBarcodeScan} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('common.category')}<RequiredMark />
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              >
                <option value="">{t('products.select_category')}</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Pack Size */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.unit')}</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">{t('products.unit_hint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.pack_size')}</label>
              <input
                type="number"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: Number(e.target.value) })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                min="1"
              />
              <p className="text-xs text-slate-500 mt-1">{t('products.pack_size_hint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.pcs_ctn')}</label>
              <input
                type="number"
                value={formData.pieces_per_carton}
                onChange={(e) => setFormData({ ...formData, pieces_per_carton: Number(e.target.value) })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                min="1"
                placeholder="যেমন: ২৪"
              />
              <p className="text-xs text-slate-500 mt-1">{t('products.carton_hint')}</p>
            </div>
          </div>

          {/* Pricing with Profit Display */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('products.purchase_price')} (৳)<RequiredMark />
                </label>
                <input
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => {
                    setFormData({ ...formData, purchase_price: Number(e.target.value) });
                    validateField('purchase_price', Number(e.target.value));
                  }}
                  className={`input-field w-full ${errors.purchase_price ? 'border-red-500' : ''}`}
                  min="0"
                  step="0.01"
                  placeholder="কার্টন দাম ÷ পিস"
                  required
                />
                {errors.purchase_price && <p className="text-red-500 text-xs mt-1">{errors.purchase_price}</p>}
                {!errors.purchase_price && <p className="text-xs text-slate-500 mt-1">{t('products.purchase_hint')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('products.selling_price')} (৳)<RequiredMark />
                </label>
                <input
                  type="number"
                  value={formData.selling_price}
                  onChange={(e) => {
                    setFormData({ ...formData, selling_price: Number(e.target.value) });
                    validateField('selling_price', Number(e.target.value));
                  }}
                  className={`input-field w-full ${errors.selling_price ? 'border-red-500' : ''}`}
                  min="0"
                  step="0.01"
                  required
                />
                {errors.selling_price && <p className="text-red-500 text-xs mt-1">{errors.selling_price}</p>}
                {!errors.selling_price && <p className="text-xs text-slate-500 mt-1">{t('products.selling_hint')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.profit_margin')}</label>
                <div className={`input-field w-full flex items-center gap-2 ${profitAmount >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <TrendingUp className={`w-4 h-4 ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`font-medium ${profitAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ৳{profitAmount} ({profitPercent}%)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t('products.profit_hint')}</p>
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.vat_inclusive}
                  onChange={(e) => setFormData({ ...formData, vat_inclusive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">{t('products.vat_inclusive')}</span>
              </label>
              {formData.vat_inclusive && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700">{t('products.vat_rate')}:</label>
                  <input
                    type="number"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
                    className="input-field w-20"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Stock & Reorder Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.carton_count')}</label>
              <input
                type="number"
                value={cartonCount}
                onChange={(e) => {
                  const nextCartons = Number(e.target.value);
                  setCartonCount(Number.isNaN(nextCartons) ? 0 : nextCartons);
                }}
                className="input-field w-full"
                min="0"
                placeholder="যেমন: ১০"
              />
              <p className="text-xs text-slate-500 mt-1">{t('products.carton_count_hint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('products.stock_quantity')}<RequiredMark />
              </label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => {
                  setFormData({ ...formData, stock_quantity: Number(e.target.value) });
                  validateField('stock_quantity', Number(e.target.value));
                }}
                className={`input-field w-full ${errors.stock_quantity ? 'border-red-500' : ''}`}
                min="0"
                placeholder="১০ কার্টন = ২৪০"
                readOnly={autoCalcStock && cartonCount > 0}
                required
              />
              {errors.stock_quantity && <p className="text-red-500 text-xs mt-1">{errors.stock_quantity}</p>}
              {!errors.stock_quantity && <p className="text-xs text-slate-500 mt-1">{t('products.stock_hint')}</p>}
              <label className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={autoCalcStock}
                  onChange={(e) => setAutoCalcStock(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                {t('products.auto_calc')}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('products.reorder_level')}
              </label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                className="input-field w-full"
                min="0"
                placeholder="কম হলে সতর্কতা"
              />
              <p className="text-xs text-slate-500 mt-1">{t('products.reorder_hint')}</p>
            </div>
          </div>

          {/* Batch & Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.batch_number')}</label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => {
                  setFormData({ ...formData, batch_number: e.target.value });
                  setBatchAutoGenerated(false);
                }}
                className="input-field w-full"
                placeholder="যেমন: BT-2024-001"
              />
              <p className="text-xs text-slate-500 mt-1">{t('products.batch_hint')}</p>
              {!batchHasValue && (
                <p className="text-xs text-slate-500 mt-1">
                  {t('products.batch_auto_hint')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('products.expiry_date')}{expiryRequired && <RequiredMark />}
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => {
                  setFormData({ ...formData, expiry_date: e.target.value });
                  if (e.target.value) {
                    const newErrors = { ...errors };
                    delete newErrors.expiry_date;
                    setErrors(newErrors);
                  }
                }}
                className={`input-field w-full ${errors.expiry_date ? 'border-red-500' : ''}`}
                required={expiryRequired}
              />
              {errors.expiry_date && <p className="text-red-500 text-xs mt-1">{errors.expiry_date}</p>}
              {!errors.expiry_date && <p className="text-xs text-slate-500 mt-1">{t('products.expiry_hint')}</p>}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('products.supplier')}</label>
            <select
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="input-field w-full"
            >
              <option value="">{t('products.select_supplier')}</option>
              {suppliers.map((sup: string) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('products.cancel')}
            </button>
            {!product && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add & Add Another
              </button>
            )}
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md">
              {product ? t('products.update') : t('products.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
