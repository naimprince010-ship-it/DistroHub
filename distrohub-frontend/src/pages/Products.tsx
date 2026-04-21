import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Upload,
  Download,
  Edit,
  Eye,
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
  History,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTableControls } from '@/hooks/useTableControls';
import { PaginationControls } from '@/components/ui/pagination-controls';
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

interface StockLedgerRow {
  id: string;
  product_id: string;
  product_name?: string;
  batch_id?: string;
  batch_number?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  voucher_type: 'purchase' | 'sale' | 'sale_return' | 'adjustment';
  voucher_id?: string;
  quantity_change: number;
  quantity_after?: number;
  unit_cost?: number;
  remarks?: string;
  created_by?: string;
  created_at: string;
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

type ProductColumnKey = 'sku' | 'category' | 'unit' | 'purchase' | 'selling' | 'stock' | 'pcsCtn' | 'batch' | 'expiry';

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
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailLedger, setDetailLedger] = useState<StockLedgerRow[]>([]);
  const [detailLedgerLoading, setDetailLedgerLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<Record<string, number>>({});
  const visibleColumns: Record<ProductColumnKey, boolean> = {
    sku: true,
    category: true,
    unit: true,
    purchase: true,
    selling: true,
    stock: true,
    pcsCtn: true,
    batch: true,
    expiry: true,
  };

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
      const [response, suggestionsRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/reorder-suggestions').catch(() => ({ data: [] })),
      ]);
      logger.log('[Products] Products fetched successfully:', response.data?.length || 0);
      if (Array.isArray(suggestionsRes.data)) {
        const nextMap: Record<string, number> = {};
        suggestionsRes.data.forEach((row: any) => {
          if (row?.product_id) nextMap[row.product_id] = Number(row.suggested_qty || 0);
        });
        setReorderSuggestions(nextMap);
      }

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

  useEffect(() => {
    const fetchDetailLedger = async () => {
      if (!detailProduct?.id) {
        setDetailLedger([]);
        return;
      }
      try {
        setDetailLedgerLoading(true);
        const response = await api.get('/api/stock-ledger', {
          params: { product_id: detailProduct.id, limit: 300 },
        });
        setDetailLedger(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('[Products] Failed to fetch stock ledger', error);
        setDetailLedger([]);
      } finally {
        setDetailLedgerLoading(false);
      }
    };
    fetchDetailLedger();
  }, [detailProduct?.id]);

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
  const productsTable = useTableControls(filteredProducts, { initialSortKey: 'name', pageSize: 10 });

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

  const ledgerLabel = (kind: StockLedgerRow['voucher_type']) => {
    if (kind === 'sale_return') return 'Sale Return';
    if (kind === 'purchase') return 'Purchase';
    if (kind === 'sale') return 'Sale';
    return 'Adjustment';
  };

  return (
    <PageShell
      title={t('common.products')}
      subtitle={t('products.subtitle')}
      actions={
        <>
          <button
            type="button"
            onClick={() => fetchProducts(true)}
            disabled={refreshing || loading}
            className="btn-secondary inline-flex h-9 items-center gap-2 px-3 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">{t('products.refresh')}</span>
          </button>
          <label className="btn-secondary inline-flex h-9 cursor-pointer items-center gap-2 px-3">
            <Upload className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('common.import')}</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExcelExport}
            disabled={loading || products.length === 0}
            className="btn-secondary inline-flex h-9 items-center gap-2 px-3 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </button>
          <button
            type="button"
            onClick={() => { fetchCategoriesAndSuppliers(); setShowAddModal(true); }}
            className="btn-primary inline-flex h-9 items-center gap-2 px-4 font-medium"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t('common.add_product')}
          </button>
        </>
      }
    >
      <div className="w-full space-y-5">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={t('products.stat_total')}    value={productStats.total}    icon={Package}      color="blue" />
          <StatCard label={t('products.stat_low')}      value={productStats.low}      icon={AlertTriangle} color="amber" />
          <StatCard label={t('products.stat_out')}      value={productStats.out}      icon={PackageMinus}  color="red" />
          <StatCard label={t('products.stat_expiring')} value={productStats.expiring} icon={CalendarDays}  color="purple" />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <div className="min-w-0 md:col-span-2 xl:col-span-4">
                <p className="mb-1 text-[11px] text-muted-foreground">
              {t('products.toolbar_count')
                    .replace('{{f}}', String(productsTable.totalRows))
                    .replace('{{t}}', String(products.length))}
                </p>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="product-search">
                  {t('products.search_chip_label')}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    id="product-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => updateSearchQuery(e.target.value)}
                    placeholder={t('products.search_mobile')}
                    className="input-field h-9 w-full pl-10"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="min-w-0 xl:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="product-category">
                  {t('products.filter_label_category')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2" aria-hidden>
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="product-category" className="h-9 w-full !pl-11 pr-8 text-sm leading-none [&>span]:line-clamp-1">
                      <SelectValue placeholder={t('common.all_categories')} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                      <SelectItem value="all">{t('common.all_categories')}</SelectItem>
                      {allCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="product-stock">
                  {t('products.filter_label_stock')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2" aria-hidden>
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger id="product-stock" className="h-9 w-full !pl-11 pr-8 text-sm leading-none [&>span]:line-clamp-1">
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
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="product-expiry">
                  {t('products.filter_label_expiry')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2" aria-hidden>
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                    <SelectTrigger id="product-expiry" className="h-9 w-full !pl-11 pr-8 text-sm leading-none [&>span]:line-clamp-1">
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
              <div className="min-w-0 xl:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-transparent select-none" aria-hidden>spacer</span>
                <button type="button" onClick={clearFilters} disabled={activeFiltersCount === 0}
                  className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 text-sm font-medium text-muted-foreground transition-colors enabled:border-[hsl(var(--dh-red))]/30 enabled:bg-[hsl(var(--dh-red))]/5 enabled:text-[hsl(var(--dh-red))] disabled:cursor-not-allowed disabled:opacity-50">
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{t('products.clear_filters')}</span>
                  {activeFiltersCount > 0 && <span className="tabular-nums">({activeFiltersCount})</span>}
                </button>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
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
                    <tr className="[&>th]:border-r [&>th]:border-border/50 [&>th:last-child]:border-r-0">
                      <th className="sticky top-0 z-30 w-12 border-b border-border bg-card px-2.5 py-3 text-center text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground">#</th>
                      <th className="sticky top-0 z-30 border-b border-border bg-card px-2.5 py-3 text-left text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        <button type="button" onClick={() => productsTable.toggleSort('name')} className="inline-flex items-center gap-1">
                          {t('common.products')}
                          <span className="text-[10px]">{productsTable.sortKey === 'name' ? (productsTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                      {visibleColumns.sku && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-left text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground md:table-cell">{t('common.sku')}</th>}
                      {visibleColumns.category && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-left text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground lg:table-cell">{t('common.category')}</th>}
                      {visibleColumns.unit && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-right text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground md:table-cell">{t('common.unit')}</th>}
                      {visibleColumns.purchase && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-right text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground lg:table-cell">{t('common.purchase')}</th>}
                      {visibleColumns.selling && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-right text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground lg:table-cell">{t('common.selling')}</th>}
                      {visibleColumns.stock && (
                        <th className="sticky top-0 z-30 border-b border-border bg-card px-2.5 py-3 text-right text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          <button type="button" onClick={() => productsTable.toggleSort('stock_quantity')} className="ml-auto inline-flex items-center gap-1">
                            {t('common.stock')}
                            <span className="text-[10px]">{productsTable.sortKey === 'stock_quantity' ? (productsTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                        </th>
                      )}
                      {visibleColumns.pcsCtn && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-right text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground md:table-cell">{t('common.pcs_ctn')}</th>}
                      {visibleColumns.batch && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-left text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground lg:table-cell">{t('common.batch')}</th>}
                      {visibleColumns.expiry && <th className="sticky top-0 z-30 hidden border-b border-border bg-card px-2.5 py-3 text-left text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground md:table-cell">{t('common.expiry')}</th>}
                      <th className="sticky top-0 z-30 border-b border-border bg-card px-2.5 py-3 text-center text-sm font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsTable.paginatedRows.map((product, index) => {
                      const stockLevel = product.stock_quantity === 0 ? 'out' : product.stock_quantity < LOW_STOCK_THRESHOLD ? 'low' : 'ok';
                      const expiryStatus = isExpiredDate(product.expiry_date) ? 'expired' : isExpiringSoonDate(product.expiry_date) ? 'soon' : 'ok';
                      const isAlert = stockLevel === 'out' || stockLevel === 'low' || expiryStatus === 'expired' || expiryStatus === 'soon';

                      return (
                        <tr
                          key={product.id}
                          className={cn(
                            'transition-colors hover:bg-muted/30',
                            isAlert && 'bg-[hsl(var(--dh-amber))]/5',
                            stockLevel === 'out' && 'bg-[hsl(var(--dh-red))]/5',
                            '[&>td]:border-b [&>td]:border-border/70 [&>td]:border-r [&>td]:border-r-border/50 [&>td:last-child]:border-r-0'
                          )}>
                          <td className="p-2.5 text-center text-xs tabular-nums text-muted-foreground">{(productsTable.page - 1) * productsTable.pageSize + index + 1}</td>
                          <td className="p-2.5">
                            <div className="flex max-w-[220px] items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                                <Package className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
                              </div>
                              <button
                                type="button"
                                onClick={() => setDetailProduct(product)}
                                className="truncate text-left font-medium text-foreground hover:text-[hsl(var(--primary))]"
                                title={product.name}
                              >
                                {product.name}
                              </button>
                            </div>
                          </td>
                          {visibleColumns.sku && <td className="hidden p-2.5 font-mono text-xs text-muted-foreground md:table-cell">{product.sku}</td>}
                          {visibleColumns.category && (
                            <td className="hidden p-2.5 lg:table-cell">
                              <Badge variant="muted" className="max-w-[140px] truncate">{product.category}</Badge>
                            </td>
                          )}
                          {visibleColumns.unit && <td className="hidden p-2.5 text-right text-sm text-muted-foreground md:table-cell">{product.unit}</td>}
                          {visibleColumns.purchase && <td className="hidden p-2.5 text-right tabular-nums text-sm text-foreground lg:table-cell">{formatMoney(product.purchase_price)}</td>}
                          {visibleColumns.selling && <td className="hidden p-2.5 text-right font-semibold tabular-nums text-sm text-foreground lg:table-cell">{formatMoney(product.selling_price)}</td>}
                          {visibleColumns.stock && (
                            <td className="p-2.5 text-right">
                              <span className={cn('tabular-nums font-medium text-sm',
                                product.stock_quantity === 0 && 'font-semibold text-[hsl(var(--dh-red))]',
                                product.stock_quantity > 0 && product.stock_quantity < LOW_STOCK_THRESHOLD && 'text-[hsl(var(--dh-amber))]',
                                product.stock_quantity >= LOW_STOCK_THRESHOLD && 'text-[hsl(var(--dh-green))]'
                              )}>
                                {product.stock_quantity}
                              </span>
                              {reorderSuggestions[product.id] ? (
                                <div className="mt-1 text-[10px] text-[hsl(var(--dh-blue))]">
                                  +{reorderSuggestions[product.id]} suggested
                                </div>
                              ) : null}
                            </td>
                          )}
                          {visibleColumns.pcsCtn && (
                            <td className="hidden p-2.5 text-right text-xs tabular-nums text-muted-foreground md:table-cell">{product.pieces_per_carton || product.pack_size || '—'}</td>
                          )}
                          {visibleColumns.batch && <td className="hidden p-2.5 font-mono text-xs text-muted-foreground lg:table-cell">{product.batch_number || '—'}</td>}
                          {visibleColumns.expiry && (
                            <td className="hidden p-2.5 md:table-cell">
                              <div className="flex items-center gap-1">
                                {isExpiredDate(product.expiry_date) ? (
                                  <span className="text-xs font-medium text-[hsl(var(--dh-red))]">{product.expiry_date || '—'}</span>
                                ) : (
                                  <>
                                    {isExpiringSoonDate(product.expiry_date) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--dh-amber))]" aria-hidden />}
                                    <span className={cn('text-xs', isExpiringSoonDate(product.expiry_date) ? 'font-medium text-[hsl(var(--dh-amber))]' : 'text-muted-foreground')}>
                                      {product.expiry_date || '—'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="p-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => setDetailProduct(product)}
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))]"
                                title="Details">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setEditingProduct(product)}
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))]"
                                title={t('products.edit')}>
                                <Edit className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setDeleteId(product.id)}
                                className="rounded p-2 text-muted-foreground transition-colors hover:bg-[hsl(var(--dh-red))]/10 hover:text-[hsl(var(--dh-red))]"
                                title={t('common.delete')}>
                                <Trash2 className="w-4 h-4" />
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
                  <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" aria-hidden />
                  <p className="font-medium text-muted-foreground">{t('products.no_products')}</p>
                </div>
              )}
            </>
          )}
          </div>
          {!loading && filteredProducts.length > 0 ? (
            <PaginationControls
              page={productsTable.page}
              totalPages={productsTable.totalPages}
              totalRows={productsTable.totalRows}
              onPageChange={productsTable.setPage}
            />
          ) : null}
          </CardContent>
        </Card>
      </div>

      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{detailProduct.name}</h2>
                <p className="text-xs text-muted-foreground">{detailProduct.sku} · {detailProduct.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-60px)] overflow-auto p-4">
              <Tabs defaultValue="overview">
                <TabsList className="mb-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="ledger" className="gap-1">
                    <History className="h-3.5 w-3.5" />
                    Stock ledger
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Stock</p><p className="text-lg font-semibold">{detailProduct.stock_quantity}</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Purchase</p><p className="text-lg font-semibold">{formatMoney(detailProduct.purchase_price)}</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Selling</p><p className="text-lg font-semibold">{formatMoney(detailProduct.selling_price)}</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Batch</p><p className="text-sm font-mono font-semibold">{detailProduct.batch_number || '—'}</p></CardContent></Card>
                  </div>
                </TabsContent>
                <TabsContent value="ledger">
                  <div className="rounded-lg border border-border">
                    <div className="max-h-[55vh] overflow-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-muted/40">
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Batch</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Warehouse</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Qty Change</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Qty After</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailLedgerLoading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading stock ledger…</td></tr>
                          ) : detailLedger.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No stock ledger entries found.</td></tr>
                          ) : detailLedger.map((row) => (
                            <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                              <td className="px-3 py-2.5 text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                              <td className="px-3 py-2.5">
                                <Badge variant="outline">{ledgerLabel(row.voucher_type)}</Badge>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.batch_number || '—'}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{row.warehouse_name || row.warehouse_id || '—'}</td>
                              <td className={cn('px-3 py-2.5 text-right font-mono font-semibold', row.quantity_change >= 0 ? 'text-[hsl(var(--dh-green))]' : 'text-[hsl(var(--dh-red))]')}>
                                {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-foreground">{row.quantity_after ?? '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.delete_dialog_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('products.delete_dialog_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteBusy}>
              {t('products.cancel')}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteBusy}
              className={cn(buttonVariants(), 'bg-[hsl(var(--dh-red))] text-white hover:bg-[hsl(var(--dh-red))]/90')}
              onClick={executeDelete}
            >
              {deleteBusy ? '…' : t('common.delete')}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(showAddModal || editingProduct) && (
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
    </PageShell>
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
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'advanced'>('basic');
  const [templateName, setTemplateName] = useState(product?.name || '');
  const [variantName, setVariantName] = useState(product?.name || '');
  const [variantSku, setVariantSku] = useState(product?.sku || '');
  const [baseUom, setBaseUom] = useState(product?.unit || 'Pack');
  const [uomFrom, setUomFrom] = useState('Carton');
  const [uomTo, setUomTo] = useState(product?.unit || 'Pack');
  const [uomFactor, setUomFactor] = useState<number>(1);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {product ? t('products.edit') : t('products.add_new')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-2 grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <p className="mb-3 text-xs text-muted-foreground">
              Quick entry flow with tabbed sections for faster product setup.
            </p>

            <TabsContent value="basic" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
          {/* Pricing with Profit Display */}
          <div className="bg-muted/40 rounded-xl p-3">
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
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
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
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Variant Setup</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Template Name</label>
                    <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Variant Name</label>
                    <input value={variantName} onChange={(e) => setVariantName(e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Variant SKU</label>
                    <input value={variantSku} onChange={(e) => setVariantSku(e.target.value)} className="input-field w-full" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <h3 className="mb-2 text-sm font-semibold text-foreground">UOM Conversion</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Base UOM</label>
                    <input value={baseUom} onChange={(e) => setBaseUom(e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                    <input value={uomFrom} onChange={(e) => setUomFrom(e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <input value={uomTo} onChange={(e) => setUomTo(e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Factor</label>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={uomFactor}
                      onChange={(e) => setUomFactor(Number(e.target.value))}
                      className="input-field w-full"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This section prepares variant/UOM metadata for ERP-style workflow.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
            <button type="submit" className="btn-primary">
              {product ? t('products.update') : t('products.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
