import { useState, useRef, useEffect, useMemo } from 'react';
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
  Wand2,
  ImagePlus,
  TrendingUp,
} from 'lucide-react';
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

export function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.warn('[Products] No token found, skipping products fetch');
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchCategoriesAndSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  // Memoize expensive category calculation
  const allCategories = useMemo(() => {
    return [...new Set([...categories, ...products.map(p => p.category)])];
  }, [categories, products]);

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // Memoize expensive filtering calculation
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'low' && product.stock_quantity < 50) ||
        (stockFilter === 'out' && product.stock_quantity === 0) ||
        (stockFilter === 'in_stock' && product.stock_quantity >= 50);
      
      const matchesExpiry = expiryFilter === 'all' ||
        (expiryFilter === 'expired' && isExpired(product.expiry_date)) ||
        (expiryFilter === 'expiring' && isExpiringSoon(product.expiry_date) && !isExpired(product.expiry_date)) ||
        (expiryFilter === 'safe' && !isExpiringSoon(product.expiry_date));
      
      return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, expiryFilter]);

  const activeFiltersCount = [categoryFilter, stockFilter, expiryFilter].filter(f => f !== 'all').length;

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Products.tsx:261',message:'Excel import function called',data:{hasFile:!!e.target.files?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Products.tsx:266',message:'Excel import started',data:{hasWorkbook:typeof Workbook !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const workbook = new Workbook();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Products.tsx:268',message:'Workbook created',data:{workbookType:typeof workbook},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Products.tsx:271',message:'Workbook loaded',data:{worksheetsCount:workbook.worksheets?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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
        alert(`Successfully imported ${jsonData.length} products!`);
      } else {
        alert('No products found in the Excel file.');
      }
    } catch (error) {
      console.error('[Products] Error importing Excel:', error);
      alert('Error importing Excel file. Please check the file format.');
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
    } catch (error) {
      console.error('[Products] Error exporting Excel:', error);
      alert('Error exporting Excel file.');
    }
  };

    const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this product?')) {
        return;
      }

      try {
        logger.log('[Products] Deleting product:', id);
        await deleteWithOfflineQueue('products', `/api/products/${id}`, { id }, {
          onOfflineDelete: async () => deleteRecord('products', id),
          onOnlineDelete: async () => deleteRecord('products', id),
        });
        logger.log('[Products] Product deleted successfully');
        
        // Refetch products from API
        await fetchProducts();
      } catch (error: any) {
        console.error('[Products] Failed to delete product:', error);
        console.error('[Products] Error details:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          code: error?.code
        });
        
        let errorMessage = 'Failed to delete product';
        if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Cannot connect')) {
          errorMessage = 'Backend server is not responding. Please check:\n1. Backend is deployed on Render\n2. Backend service is running\n3. Try refreshing the page';
        } else {
          errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete product';
        }
        
        alert(`Failed to delete product: ${errorMessage}`);
      }
    };

    const clearFilters = () => {
      setCategoryFilter('all');
      setStockFilter('all');
      setExpiryFilter('all');
      setSearchTerm('');
    };

  return (
    <div className="min-h-screen">
      <Header title="Products" />

      <div className="p-3">
                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Categories</option>
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="input-field w-36"
                    >
                      <option value="all">All Stock / সব</option>
                      <option value="in_stock">In Stock / আছে</option>
                      <option value="low">Low Stock / কম</option>
                      <option value="out">Out of Stock / নেই</option>
                    </select>

                    <select
                      value={expiryFilter}
                      onChange={(e) => setExpiryFilter(e.target.value)}
                      className="input-field w-40"
                    >
                      <option value="all">All Expiry / সব</option>
                      <option value="expired">Expired / মেয়াদ শেষ</option>
                      <option value="expiring">Expiring Soon / শীঘ্রই শেষ</option>
                      <option value="safe">Safe / নিরাপদ</option>
                    </select>

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

                  <div className="flex items-center gap-2">
                    <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Import Excel</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="hidden"
                      />
                    </label>

                    <button onClick={handleExcelExport} className="btn-secondary flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={() => {
                        // Refetch categories when opening modal to get latest
                        fetchCategoriesAndSuppliers();
                        setShowAddModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Add Product</span>
                      </div>
                      <span className="text-xs font-normal opacity-90">পণ্য যোগ করুন</span>
                    </button>
                  </div>
                </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading products...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-center p-2 font-semibold text-slate-700 w-12">
                        #
                        <div className="text-xs font-normal text-slate-500">ক্রম</div>
                      </th>
                      <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                      <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Category</th>
                      <th className="text-left p-2 font-semibold text-slate-700">
                        Unit
                        <div className="text-xs font-normal text-slate-500">ইউনিট</div>
                      </th>
                      <th className="text-right p-2 font-semibold text-slate-700">
                        Purchase
                        <div className="text-xs font-normal text-slate-500">ক্রয়</div>
                      </th>
                      <th className="text-right p-2 font-semibold text-slate-700">
                        Selling
                        <div className="text-xs font-normal text-slate-500">বিক্রয়</div>
                      </th>
                      <th className="text-right p-2 font-semibold text-slate-700">
                        Stock
                        <div className="text-xs font-normal text-slate-500">মজুদ</div>
                      </th>
                      <th className="text-center p-2 font-semibold text-slate-700">
                        Pcs/Ctn
                        <div className="text-xs font-normal text-slate-500">পিস/কার্টন</div>
                      </th>
                      <th className="text-left p-2 font-semibold text-slate-700">Batch</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Expiry</th>
                      <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product, index) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-center text-slate-600 font-medium">
                          {index + 1}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-primary-600" />
                            </div>
                            <span className="font-medium text-slate-900">{product.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-slate-600 font-mono text-sm">{product.sku}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">
                          {product.unit}
                        </td>
                        <td className="p-2 text-right text-slate-600">৳ {product.purchase_price}</td>
                        <td className="p-2 text-right font-bold text-slate-900">৳ {product.selling_price}</td>
                        <td className="p-2 text-right">
                          <span
                            className={`${
                              product.stock_quantity === 0 
                                ? 'font-bold text-red-600' 
                                : product.stock_quantity < 50 
                                  ? 'font-medium text-orange-600' 
                                  : 'font-medium text-green-600'
                            }`}
                          >
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="p-2 text-center text-slate-600 text-sm">
                          {product.pieces_per_carton || product.pack_size || '-'}
                        </td>
                        <td className="p-2 text-slate-600 font-mono text-sm">{product.batch_number}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(product.expiry_date) && (
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                            )}
                            <span
                              className={
                                isExpiringSoon(product.expiry_date) ? 'text-orange-600 font-medium' : 'text-slate-600'
                              }
                            >
                              {product.expiry_date}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length === 0 && !loading && (
                <div className="p-4 text-center text-slate-500">
                  No products found. Try adjusting your search or add a new product.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal would go here */}
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
      pack_size: 12,
      pieces_per_carton: 12,
      purchase_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      reorder_level: 10,
      batch_number: '',
      expiry_date: '',
      supplier: '',
      vat_inclusive: false,
      vat_rate: 0,
      image_url: '',
    }
  );
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

  const generateSKU = () => {
    if (!formData.name || !formData.category) return;
    const nameCode = formData.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const catCode = formData.category.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const sku = `${nameCode}-${catCode}-${randomNum}`;
    setFormData({ ...formData, sku });
  };

  const handleBarcodeScan = (barcode: string) => {
    setFormData({ ...formData, barcode });
  };

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

  const batchHasValue = !!(formData.batch_number && formData.batch_number.trim() !== '');
  const expiryRequired = batchHasValue;

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
      setErrors({ ...errors, expiry_date: 'Expiry date is required when batch number is provided' });
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
        pack_size: 12,
        pieces_per_carton: 12,
        purchase_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        reorder_level: 10,
        batch_number: '',
        expiry_date: '',
        supplier: formData.supplier,
        vat_inclusive: formData.vat_inclusive,
        vat_rate: formData.vat_rate,
        image_url: '',
      });
      setImagePreview('');
      setErrors({});
    }
  };

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
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
                    <span className="text-xs text-slate-500">Add Image</span>
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
            
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Name<RequiredMark />
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
                  SKU<RequiredMark />
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input-field flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateSKU}
                    className="btn-secondary px-3 flex items-center gap-1"
                    title="Auto-generate SKU"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Scan or enter barcode"
                />
                <BarcodeScanButton onScan={handleBarcodeScan} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category<RequiredMark />
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Pack Size */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
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
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pack Size</label>
              <input
                type="number"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: Number(e.target.value) })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pieces/Carton</label>
              <input
                type="number"
                value={formData.pieces_per_carton}
                onChange={(e) => setFormData({ ...formData, pieces_per_carton: Number(e.target.value) })}
                className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                min="1"
                placeholder="e.g., 12"
              />
            </div>
          </div>

          {/* Pricing with Profit Display */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Purchase Price (৳)<RequiredMark />
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
                  required
                />
                {errors.purchase_price && <p className="text-red-500 text-xs mt-1">{errors.purchase_price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Selling Price (৳)<RequiredMark />
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
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Profit Margin</label>
                <div className={`input-field w-full flex items-center gap-2 ${profitAmount >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <TrendingUp className={`w-4 h-4 ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`font-medium ${profitAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ৳{profitAmount} ({profitPercent}%)
                  </span>
                </div>
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
                <span className="text-sm text-slate-700">VAT Inclusive</span>
              </label>
              {formData.vat_inclusive && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700">VAT Rate:</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Quantity<RequiredMark />
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
                required
              />
              {errors.stock_quantity && <p className="text-red-500 text-xs mt-1">{errors.stock_quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reorder Level (Low Stock Alert)
              </label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                className="input-field w-full"
                min="0"
                placeholder="Alert when stock falls below"
              />
            </div>
          </div>

          {/* Batch & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., BT-2024-001"
              />
              {!batchHasValue && (
                <p className="text-xs text-slate-500 mt-1">
                  Leave empty to auto-generate on save (when expiry is set).
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry Date{expiryRequired && <RequiredMark />}
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
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
            <select
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="input-field w-full"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((sup: string) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
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
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
