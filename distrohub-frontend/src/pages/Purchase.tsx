import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Minus,
  Eye,
  Package,
  Calendar,
  Truck,
  Filter,
  X,
  Trash2,
  Printer,
  Warehouse,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { BarcodeScanButton } from '@/components/BarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch: string;
  expiry: string;
  qty: number;
  unit_price: number;
  sub_total: number;
  current_stock: number;
  last_purchase_price: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  supplier_invoice: string;
  supplier_name: string;
  warehouse: string;
  purchase_date: string;
  sub_total: number;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  items: PurchaseItem[];
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  contact_person?: string;
  email?: string;
  created_at: string;
}

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProductCatalogItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  lastPrice: number;
  purchase_price?: number;
  batches?: Array<{ batch_number: string; expiry_date: string }>;
}

export function Purchase() {
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Fetch purchases from API
  const fetchPurchases = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Purchase] No token found, skipping purchases fetch');
      setPurchases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Purchase] Fetching purchases from API...');
      const response = await api.get('/api/purchases');
      console.log('[Purchase] Purchases fetched successfully:', response.data?.length || 0);
      
      if (response.data) {
        // Map backend Purchase to frontend Purchase interface
        const mappedPurchases: Purchase[] = response.data.map((p: any) => ({
          id: p.id || '',
          invoice_number: p.invoice_number || '',
          supplier_invoice: '', // Backend doesn't return this, set empty
          supplier_name: p.supplier_name || '',
          warehouse: 'Main Warehouse', // Backend doesn't return this, set default
          purchase_date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          sub_total: p.total_amount || 0,
          discount_type: 'percent' as const,
          discount_value: 0,
          discount_amount: 0,
          tax_percent: 0,
          tax_amount: 0,
          total_amount: p.total_amount || 0,
          paid_amount: 0, // Backend doesn't track this yet
          due_amount: p.total_amount || 0,
          items: (p.items || []).map((item: any) => ({
            id: item.id || '',
            product_id: item.product_id || '',
            product_name: item.product_name || '',
            sku: '', // Backend doesn't return this
            batch: item.batch_number || '',
            expiry: item.expiry_date ? (typeof item.expiry_date === 'string' ? item.expiry_date.split('T')[0] : item.expiry_date) : '',
            qty: item.quantity || 0,
            unit_price: item.unit_price || 0,
            sub_total: item.total || 0,
            current_stock: 0, // Backend doesn't return this
            last_purchase_price: item.unit_price || 0,
          })),
        }));
        setPurchases(mappedPurchases);
        console.log('[Purchase] Purchases mapped and set:', mappedPurchases.length);
      }
    } catch (error: any) {
      console.error('[Purchase] Error fetching purchases:', error);
      console.error('[Purchase] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      if (error?.response?.status === 401) {
        console.warn('[Purchase] 401 Unauthorized - token may be expired');
        // Interceptor will handle redirect to login
        return;
      }
      
      // On error, use empty array
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const due = p.total_amount - p.paid_amount;
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && due === 0) ||
      (paymentFilter === 'partial' && due > 0 && p.paid_amount > 0) ||
      (paymentFilter === 'unpaid' && p.paid_amount === 0);
    
    const purchaseDate = new Date(p.purchase_date);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && daysDiff <= 1) ||
      (dateFilter === 'week' && daysDiff <= 7) ||
      (dateFilter === 'month' && daysDiff <= 30);
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  const activeFiltersCount = [paymentFilter, dateFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setPaymentFilter('all');
    setDateFilter('all');
    setSearchTerm('');
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalDue = purchases.reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

  return (
    <div className="min-h-screen">
      <Header title="Purchase / Stock-In" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{purchases.length}</p>
                <p className="text-slate-500 text-sm">Total Purchases</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">৳ {totalPurchases.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Value</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">৳ {totalDue.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Payable to Supplier</p>
              </div>
            </div>
          </div>
        </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Payment</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>

                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="input-field w-36"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
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

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    New Purchase
                  </button>
                </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading purchases...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Supplier</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Total</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Paid</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Due</th>
                      <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-medium text-primary-600">{purchase.invoice_number}</td>
                        <td className="p-2 text-slate-900">{purchase.supplier_name}</td>
                        <td className="p-2 text-slate-600">{purchase.purchase_date}</td>
                        <td className="p-2 text-right font-medium text-slate-900">
                          ৳ {purchase.total_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-green-600">
                          ৳ {purchase.paid_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-bold text-red-600">
                          ৳ {(purchase.total_amount - purchase.paid_amount).toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPurchases.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  No purchases found. Create a new purchase to add stock.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedPurchase.invoice_number}</h2>
              <p className="text-slate-500">{selectedPurchase.supplier_name}</p>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-sm text-slate-500">Purchase Date</p>
                  <p className="font-medium">{selectedPurchase.purchase_date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-medium">৳ {selectedPurchase.total_amount.toLocaleString()}</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">Items</h3>
              <table className="w-full mb-3">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Product</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Batch</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Expiry</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Qty</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Price</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-2">{item.product_name}</td>
                        <td className="p-2 font-mono text-sm">{item.batch}</td>
                        <td className="p-2">{item.expiry}</td>
                        <td className="p-2 text-right">{item.qty}</td>
                        <td className="p-2 text-right">৳ {item.unit_price}</td>
                        <td className="p-2 text-right font-medium">৳ {item.sub_total.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedPurchase(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddModal && (
        <AddPurchaseModal
          onClose={() => setShowAddModal(false)}
          onSave={async (purchase) => {
            try {
              console.log('[Purchase] Creating purchase:', purchase);
              
              // Map frontend Purchase to backend PurchaseCreate format
              // Get warehouse_id from the purchase object (stored in formData)
              const warehouseId = (purchase as any).warehouse_id || null;
              const purchasePayload = {
                supplier_name: purchase.supplier_name,
                invoice_number: purchase.invoice_number,
                warehouse_id: warehouseId,
                items: purchase.items.map(item => ({
                  product_id: item.product_id,
                  batch_number: item.batch,
                  expiry_date: item.expiry,
                  quantity: item.qty,
                  unit_price: item.unit_price,
                })),
                notes: `Warehouse: ${purchase.warehouse}, Supplier Invoice: ${purchase.supplier_invoice}`,
              };
              
              console.log('[Purchase] Sending purchase payload:', purchasePayload);
              const response = await api.post('/api/purchases', purchasePayload);
              console.log('[Purchase] Purchase created successfully:', response.data);
              
              // Refetch purchases to get the latest data
              await fetchPurchases();
              setShowAddModal(false);
            } catch (error: any) {
              console.error('[Purchase] Failed to create purchase:', error);
              alert(`Failed to create purchase: ${error.response?.data?.detail || error.message}`);
            }
          }}
        />
      )}
    </div>
  );
}

interface ValidationError {
  [key: string]: string;
}

function AddPurchaseModal({ onClose, onSave }: { onClose: () => void; onSave: (purchase: Purchase) => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_invoice: '',
    warehouse_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 0,
    tax_percent: 0,
    paid_amount: 0,
  });
  
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [errors, setErrors] = useState<ValidationError>({});
  const [productCatalog, setProductCatalog] = useState<ProductCatalogItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [batchSuggestions, setBatchSuggestions] = useState<Record<string, string[]>>({});
  const [showBatchDropdown, setShowBatchDropdown] = useState<Record<string, boolean>>({});
  const [focusedExpiryId, setFocusedExpiryId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const batchInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch warehouses from API
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await api.get('/api/warehouses');
        const activeWarehouses = (response.data || []).filter((w: Warehouse) => w.is_active);
        setWarehouses(activeWarehouses);
        if (activeWarehouses.length > 0 && !formData.warehouse_id) {
          setFormData(prev => ({ ...prev, warehouse_id: activeWarehouses[0].id }));
        }
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch suppliers from API
  useEffect(() => {
    const fetchSuppliers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Purchase] No token found, skipping suppliers fetch');
        setSuppliers([]);
        return;
      }

      try {
        setLoadingSuppliers(true);
        console.log('[Purchase] Fetching suppliers from API...');
        const response = await api.get('/api/suppliers');
        console.log('[Purchase] Suppliers fetched successfully:', response.data?.length || 0);
        
        if (response.data && Array.isArray(response.data)) {
          setSuppliers(response.data);
        } else {
          setSuppliers([]);
        }
      } catch (error: any) {
        console.error('[Purchase] Error fetching suppliers:', error);
        if (error?.response?.status === 401) {
          console.warn('[Purchase] 401 Unauthorized - token may be expired');
          return;
        }
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Set default supplier when suppliers are loaded
  useEffect(() => {
    if (suppliers.length > 0 && !formData.supplier_name) {
      setFormData(prev => ({ ...prev, supplier_name: suppliers[0].name }));
    }
  }, [suppliers]);

  // Fetch products from API
  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Purchase] No token found, skipping products fetch');
      setProductCatalog([]);
      return;
    }

    try {
      setLoadingProducts(true);
      console.log('[Purchase] Fetching products from API...');
      const response = await api.get('/api/products');
      console.log('[Purchase] Products fetched successfully:', response.data?.length || 0);
      
      if (response.data) {
        // Map backend Product to ProductCatalogItem format
        const mappedProducts: ProductCatalogItem[] = response.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          stock: p.stock_quantity || 0,
          lastPrice: p.purchase_price || 0,
        }));
        setProductCatalog(mappedProducts);
        console.log('[Purchase] Products mapped and set:', mappedProducts.length);
      }
    } catch (error: any) {
      console.error('[Purchase] Error fetching products:', error);
      console.error('[Purchase] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      if (error?.response?.status === 401) {
        console.warn('[Purchase] 401 Unauthorized - token may be expired');
        return;
      }
      
      // On error, use empty array
      setProductCatalog([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    // Fetch products when modal opens
    fetchProducts();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = productCatalog.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  const addProductToItems = async (product: ProductCatalogItem) => {
    const existingItem = items.find(item => item.product_id === product.id);
    if (existingItem) {
      // If product already exists, just increment quantity
      setItems(items.map(item => {
        if (item.product_id === product.id) {
          const newQty = item.qty + 1;
          const newSubTotal = newQty * item.unit_price;
          return { ...item, qty: newQty, sub_total: newSubTotal };
        }
        return item;
      }));
      toast({
        title: "Quantity Updated",
        description: `${product.name} quantity increased to ${existingItem.qty + 1}`,
      });
    } else {
      setAddingProductId(product.id);
      // Fetch full product details to get latest purchase_price and batches
      let fullProduct = product;
      let productBatches: Array<{ batch_number: string; expiry_date: string }> = [];
      
      try {
        // Fetch product details
        const productResponse = await api.get(`/api/products/${product.id}`);
        if (productResponse.data) {
          fullProduct = {
            ...product,
            purchase_price: productResponse.data.purchase_price || product.lastPrice,
          };
        }
        
        // Fetch product batches
        try {
          const batchesResponse = await api.get(`/api/products/${product.id}/batches`);
          if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
            productBatches = batchesResponse.data
              .map((b: any) => ({
                batch_number: b.batch_number || '',
                expiry_date: b.expiry_date || ''
              }))
              .filter((b: any) => b.batch_number); // Only batches with batch_number
            
            // Store batch suggestions for autocomplete
            const uniqueBatches = [...new Set(productBatches.map(b => b.batch_number).filter(Boolean))];
            setBatchSuggestions(prev => ({
              ...prev,
              [product.id]: uniqueBatches
            }));
          }
        } catch (batchError) {
          console.warn('[Purchase] Could not fetch batches:', batchError);
          // Continue without batches
        }
      } catch (error) {
        console.error('[Purchase] Error fetching product details:', error);
        // Continue with existing product data
      }

      // Auto-populate Unit Price from purchase_price (latest from master data)
      const unitPrice = fullProduct.purchase_price || fullProduct.lastPrice || 0;
      
      // Auto-populate Batch Number from latest batch if available
      let defaultBatch = '';
      let defaultExpiry = '';
      if (productBatches.length > 0) {
        // Get the most recent batch (first one, assuming sorted by creation date)
        const latestBatch = productBatches[0];
        defaultBatch = latestBatch.batch_number || '';
        defaultExpiry = latestBatch.expiry_date || '';
      }
      
      // If no batch expiry, set default to current date + 1 year
      if (!defaultExpiry) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        defaultExpiry = nextYear.toISOString().split('T')[0];
      }

      const newItem: PurchaseItem = {
        id: `item-${Date.now()}`,
        product_id: fullProduct.id,
        product_name: fullProduct.name,
        sku: fullProduct.sku,
        batch: defaultBatch, // Auto-populated from latest batch
        expiry: defaultExpiry, // Auto-populated (latest batch expiry or +1 year)
        qty: 1,
        unit_price: unitPrice, // Auto-populated from purchase_price (master data)
        sub_total: unitPrice, // Real-time calculation (qty * unit_price)
        current_stock: fullProduct.stock,
        last_purchase_price: unitPrice, // Store the purchase price used
      };
      setItems([...items, newItem]);
      
      toast({
        title: "Product Added",
        description: `${product.name} added to purchase list`,
      });
      
      // Auto-focus on batch field after adding product
      setTimeout(() => {
        const batchInput = batchInputRefs.current[newItem.id];
        if (batchInput) {
          batchInput.focus();
        }
      }, 100);
    }
    setSearchTerm('');
    setShowProductDropdown(false);
    setAddingProductId(null);
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = productCatalog.find(p => p.barcode === barcode);
    if (product) {
      addProductToItems(product);
    } else {
      setErrors({ ...errors, barcode: `Product with barcode ${barcode} not found` });
      setTimeout(() => {
        const newErrors = { ...errors };
        delete newErrors.barcode;
        setErrors(newErrors);
      }, 3000);
    }
  };

  const updateItem = (itemId: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unit_price') {
          // Ensure proper calculation with numeric values
          const qty = typeof updated.qty === 'number' ? updated.qty : parseFloat(String(updated.qty)) || 0;
          const unitPrice = typeof updated.unit_price === 'number' ? updated.unit_price : parseFloat(String(updated.unit_price)) || 0;
          // Line Total should be 0 if quantity is 0
          updated.sub_total = qty > 0 ? qty * unitPrice : 0;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    if (deleteConfirmId === itemId) {
      setItems(items.filter(item => item.id !== itemId));
      setDeleteConfirmId(null);
      toast({
        title: "Product Removed",
        description: "Product has been removed from the list",
      });
    } else {
      setDeleteConfirmId(itemId);
    }
  };

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Helper function to check if expiry is within 6 months
  const isExpiringSoon = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);
      return expiry <= sixMonthsFromNow && expiry >= today;
    } catch {
      return false;
    }
  };

  // Helper function to check if expiry is past
  const isExpired = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      return expiry < today;
    } catch {
      return false;
    }
  };

  // Real-time calculation: Recalculate totals whenever items or formData changes
  const subTotal = items.reduce((sum, item) => {
    // Ensure sub_total is always up-to-date
    const qty = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty)) || 0;
    const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0;
    const calculatedSubTotal = qty * unitPrice;
    return sum + calculatedSubTotal;
  }, 0);
  
  const discountAmount = formData.discount_type === 'percent' 
    ? (subTotal * formData.discount_value / 100)
    : formData.discount_value;
  const afterDiscount = subTotal - discountAmount;
  const taxAmount = afterDiscount * formData.tax_percent / 100;
  const grandTotal = afterDiscount + taxAmount;
  const dueAmount = grandTotal - formData.paid_amount;

  // Real-time update: Sync item sub_totals when qty or unit_price changes
  useEffect(() => {
    const updatedItems = items.map(item => {
      const qty = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty)) || 0;
      const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0;
      // Line Total should be 0 if quantity is 0
      const calculatedSubTotal = qty > 0 ? qty * unitPrice : 0;
      // Only update if sub_total is different to avoid infinite loops
      if (Math.abs(item.sub_total - calculatedSubTotal) > 0.01) {
        return { ...item, sub_total: calculatedSubTotal };
      }
      return item;
    });
    
    // Only update state if there are actual changes
    const hasChanges = updatedItems.some((item, index) => 
      Math.abs(item.sub_total - items[index].sub_total) > 0.01
    );
    if (hasChanges) {
      setItems(updatedItems);
    }
  }, [items.map(i => `${i.id}-${i.qty}-${i.unit_price}`).join(',')]);

  const validateForm = (): boolean => {
    const newErrors: ValidationError = {};
    
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    items.forEach((item, index) => {
      if (!item.batch || item.batch.trim() === '') {
        newErrors[`batch_${index}`] = 'Batch number is required';
      }
      if (!item.expiry) {
        newErrors[`expiry_${index}`] = 'Expiry date is required';
      } else {
        const expiryDate = new Date(item.expiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          newErrors[`expiry_${index}`] = 'Expiry date cannot be in the past';
        }
      }
      if (item.qty <= 0) {
        newErrors[`qty_${index}`] = 'Quantity must be greater than 0';
      } else if (item.current_stock && item.qty > item.current_stock) {
        newErrors[`qty_${index}`] = `Quantity cannot exceed available stock (${item.current_stock})`;
      }
      if (item.unit_price <= 0) {
        newErrors[`price_${index}`] = 'Price must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, shouldPrint = false) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before saving",
        variant: "destructive",
      });
      return;
    }
    
    const purchase: Purchase & { warehouse_id?: string } = {
      id: '',
      invoice_number: `PUR-${Date.now()}`,
      supplier_invoice: formData.supplier_invoice,
      supplier_name: formData.supplier_name,
      warehouse: warehouses.find(w => w.id === formData.warehouse_id)?.name || 'Main Warehouse',
      warehouse_id: formData.warehouse_id,
      purchase_date: formData.purchase_date,
      sub_total: subTotal,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      discount_amount: discountAmount,
      tax_percent: formData.tax_percent,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      paid_amount: formData.paid_amount,
      due_amount: dueAmount,
      items: items,
    };
    
    onSave(purchase);
    
    toast({
      title: "✅ Stock Added Successfully",
      description: `Purchase ${purchase.invoice_number} created. Total: ৳${grandTotal.toLocaleString()}`,
    });
    
    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S: Save purchase
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
      // Ctrl+B or Cmd+B: Trigger barcode scan
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const scanButton = document.querySelector('[title*="Scan"], button:has(svg)') as HTMLButtonElement;
        if (scanButton) scanButton.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showProductDropdown && filteredProducts.length > 0) {
      e.preventDefault();
      addProductToItems(filteredProducts[0]);
    }
  };

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F8FAFC] rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto animate-fade-in shadow-2xl">
        <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 border-b border-blue-400 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold text-white">New Purchase / Stock-In</h2>
          {errors.barcode && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.barcode}
            </div>
          )}
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5">
          {/* Header Fields - Section 1 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Supplier & Warehouse Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supplier<RequiredMark />
              </label>
                <select
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="input-field w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                  disabled={loadingSuppliers}
                >
                  {loadingSuppliers ? (
                    <option value="">Loading suppliers...</option>
                  ) : suppliers.length === 0 ? (
                    <option value="">No suppliers available</option>
                  ) : (
                    suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))
                  )}
                </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                Supplier Invoice <span className="text-xs text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.supplier_invoice}
                onChange={(e) => setFormData({ ...formData, supplier_invoice: e.target.value })}
                  className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g., INV-2024-001"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Warehouse className="w-3 h-3 inline mr-1" />
                Warehouse<RequiredMark />
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="input-field w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                required
              >
                {warehouses.length === 0 ? (
                  <option value="">Loading warehouses...</option>
                ) : (
                  warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Purchase Date<RequiredMark />
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            </div>
          </div>

          {/* Product Search - Section 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add Products (Search by Name, SKU, or Barcode)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={dropdownRef}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={handleKeyDown}
                  className="input-field w-full pl-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Type product name, SKU, or scan barcode..."
                />
                {showProductDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {loadingProducts ? (
                      <div className="p-4 text-center text-slate-500 text-sm">Loading products...</div>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToItems(product)}
                          disabled={addingProductId === product.id}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Stock: <span className="font-medium">{product.stock}</span></p>
                            <p className="text-xs text-slate-500">Last: ৳{product.lastPrice}</p>
                            {addingProductId === product.id && (
                              <p className="text-xs text-blue-600 mt-1">Adding...</p>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-slate-500 text-sm">No products found</div>
                    )}
                  </div>
                )}
              </div>
              <BarcodeScanButton 
                onScan={(barcode) => {
                  handleBarcodeScan(barcode);
                  // Auto-focus on first item's qty field after scan
                  setTimeout(() => {
                    const firstQtyInput = document.querySelector('input[type="number"][placeholder*="Qty"], input[type="number"]') as HTMLInputElement;
                    if (firstQtyInput) firstQtyInput.focus();
                  }, 100);
                }} 
              />
            </div>
          </div>

          {/* Items Table */}
          {errors.items && (
            <div className="text-red-600 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.items}
            </div>
          )}
          
          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto bg-white shadow-sm">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 w-12">SL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 min-w-[220px]">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 min-w-[150px]">Batch<RequiredMark /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 min-w-[140px]">Expiry<RequiredMark /></th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700 min-w-[140px]">Quantity<RequiredMark /></th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700 min-w-[120px]">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700 min-w-[120px]">Line Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      No items added. Search and add products above.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const itemBatches = batchSuggestions[item.product_id] || [];
                    const showBatchDropdownForItem = itemBatches.length > 0 && (showBatchDropdown[item.id] || false);
                    const expiryWarning = isExpiringSoon(item.expiry);
                    const expiryError = isExpired(item.expiry);
                    
                    return (
                    <tr key={item.id} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-4 text-center text-sm text-slate-600 font-semibold align-middle">{index + 1}</td>
                      <td className="px-4 py-4 align-middle">
                        <div>
                          <p className="font-bold text-base text-slate-900 leading-tight mb-1">{item.product_name}</p>
                          <p className="text-xs text-slate-500 leading-tight mb-1">{item.sku}</p>
                          {item.last_purchase_price > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                              Last: ৳{item.last_purchase_price}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="relative">
                          <input
                            ref={(el) => { batchInputRefs.current[item.id] = el; }}
                            type="text"
                            value={item.batch}
                            onChange={(e) => {
                              updateItem(item.id, 'batch', e.target.value);
                              setShowBatchDropdown(prev => ({ ...prev, [item.id]: true }));
                            }}
                            onFocus={() => {
                              if (itemBatches.length > 0) {
                                setShowBatchDropdown(prev => ({ ...prev, [item.id]: true }));
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowBatchDropdown(prev => ({ ...prev, [item.id]: false }));
                              }, 200);
                            }}
                            className={`input-field w-full text-sm px-3 py-2.5 min-w-[150px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${errors[`batch_${index}`] ? 'border-red-500' : ''}`}
                            placeholder="Enter or select batch"
                            maxLength={20}
                          />
                          {showBatchDropdownForItem && itemBatches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20">
                              {itemBatches
                                .filter(batch => batch.toLowerCase().includes(item.batch.toLowerCase()))
                                .map((batch, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      updateItem(item.id, 'batch', batch);
                                      setShowBatchDropdown(prev => ({ ...prev, [item.id]: false }));
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                  >
                                    {batch}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        {errors[`batch_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`batch_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="relative">
                          <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10 ${expiryError ? 'text-red-500' : expiryWarning ? 'text-orange-500' : 'text-slate-400'}`} />
                          <input
                            type="date"
                            value={item.expiry || ''}
                            onChange={(e) => updateItem(item.id, 'expiry', e.target.value)}
                            onFocus={() => setFocusedExpiryId(item.id)}
                            onBlur={() => setFocusedExpiryId(null)}
                            className={`input-field w-full text-sm px-3 py-2.5 pl-10 pr-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                              errors[`expiry_${index}`] ? 'border-red-500' : 
                              expiryError ? 'border-red-500 bg-red-50' : 
                              expiryWarning ? 'border-orange-500 bg-orange-50' : ''
                            }`}
                            placeholder="DD/MM/YYYY"
                          />
                        </div>
                        {item.expiry && focusedExpiryId !== item.id && (
                          <p className={`text-xs mt-1.5 ${expiryError ? 'text-red-600 font-medium' : expiryWarning ? 'text-orange-600' : 'text-slate-500'}`}>
                            {formatDate(item.expiry)}
                          </p>
                        )}
                        {errors[`expiry_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`expiry_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentQty = typeof item.qty === 'number' ? item.qty : parseInt(String(item.qty), 10) || 0;
                              const newQty = Math.max(0, currentQty - 1);
                              updateItem(item.id, 'qty', newQty === 0 ? 0 : Math.max(1, newQty));
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 hover:border-indigo-500 transition-colors text-slate-600 hover:text-indigo-600 flex-shrink-0"
                            title="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <div className="flex-1">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={item.qty === 0 ? '' : item.qty}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  updateItem(item.id, 'qty', 0);
                                } else {
                                  const numVal = parseInt(val, 10);
                                  if (!isNaN(numVal) && numVal >= 0) {
                                    const maxQty = item.current_stock || 999999;
                                    updateItem(item.id, 'qty', Math.min(numVal, maxQty));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 1) {
                                  updateItem(item.id, 'qty', 1);
                                } else {
                                  const maxQty = item.current_stock || 999999;
                                  if (val > maxQty) {
                                    updateItem(item.id, 'qty', maxQty);
                                    toast({
                                      title: "Quantity Limited",
                                      description: `Maximum available stock: ${maxQty}`,
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className={`input-field w-full text-sm px-3 py-2.5 text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${errors[`qty_${index}`] ? 'border-red-500' : ''}`}
                              placeholder="0"
                            />
                            <p className="text-xs text-slate-500 mt-1 text-center">Stock: {item.current_stock || 0}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentQty = typeof item.qty === 'number' ? item.qty : parseInt(String(item.qty), 10) || 0;
                              const maxQty = item.current_stock || 999999;
                              const newQty = Math.min(currentQty + 1, maxQty);
                              updateItem(item.id, 'qty', newQty);
                              if (newQty >= maxQty && currentQty < maxQty) {
                                toast({
                                  title: "Maximum Stock Reached",
                                  description: `Cannot exceed available stock: ${maxQty}`,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 hover:border-indigo-500 transition-colors text-slate-600 hover:text-indigo-600 flex-shrink-0"
                            title="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {errors[`qty_${index}`] && (
                          <p className="text-red-500 text-xs mt-1 text-center">{errors[`qty_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium z-10">৳</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                updateItem(item.id, 'unit_price', val === '' ? 0 : parseFloat(val) || 0);
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val < 0) {
                                updateItem(item.id, 'unit_price', 0);
                              }
                            }}
                            className={`input-field w-full text-sm px-3 py-2.5 text-right pl-8 pr-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:shadow-sm transition-all ${errors[`price_${index}`] ? 'border-red-500' : ''}`}
                            placeholder="0.00"
                            maxLength={10}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right align-middle">
                        <span className="font-bold text-base text-slate-900">৳{item.sub_total.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-4 text-center align-middle">
                        {deleteConfirmId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              title="Confirm delete"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                              title="Cancel"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                            title="Delete item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Discount & Tax */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Discount & Tax</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discount</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                      className="input-field w-28 font-medium"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (৳)</option>
                    </select>
                    <input
                      type="number"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      className="input-field flex-1"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      Discount Amount: ৳{discountAmount.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax (%)</label>
                  <input
                    type="number"
                    value={formData.tax_percent || ''}
                    onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
                    className="input-field w-full"
                    min="0"
                    max="100"
                    placeholder="0"
                  />
                  {taxAmount > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      Tax Amount: ৳{taxAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Paid Amount (৳)</label>
                  <input
                    type="number"
                    value={formData.paid_amount || ''}
                    onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                    className="input-field w-full text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="0"
                    placeholder="0"
                  />
                </div>
                {/* Quick Payment Buttons */}
                <div>
                  <label className="block text-xs text-slate-500 mb-2">Quick Amount</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: 100 })}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    >
                      ৳100
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: 500 })}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    >
                      ৳500
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: 1000 })}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    >
                      ৳1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: 5000 })}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    >
                      ৳5,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: 10000 })}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                    >
                      ৳10,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_amount: grandTotal })}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-md"
                    >
                      Full Paid
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals - Sticky Card */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 space-y-4 shadow-md sticky top-4 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 font-medium">Subtotal</span>
                    <span className="font-semibold text-right text-slate-900">৳ {subTotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span className="font-medium">Discount ({formData.discount_type === 'percent' ? `${formData.discount_value}%` : 'Fixed'})</span>
                      <span className="text-right font-semibold">- ৳ {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 font-medium">Tax ({formData.tax_percent}%)</span>
                      <span className="text-right font-semibold text-slate-900">+ ৳ {taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold border-t-2 border-blue-400 pt-3 mt-2">
                    <span className="text-slate-900">Grand Total</span>
                    <span className="text-indigo-700 text-right">৳ {grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base pt-2">
                    <span className="text-slate-700 font-semibold">Paid</span>
                    <span className="text-emerald-600 font-bold text-right">৳ {formData.paid_amount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center bg-white rounded-lg p-6 border-2 border-red-300 shadow-sm">
                  <span className="text-sm font-medium text-slate-600 mb-2 uppercase tracking-wide">Due Amount</span>
                  <span className={`text-4xl font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ৳{dueAmount.toLocaleString()}
                  </span>
                  {dueAmount === 0 && (
                    <span className="text-xs text-emerald-600 mt-2 font-medium">✓ Fully Paid</span>
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={items.length === 0 || !formData.warehouse_id}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg mt-2"
              >
                Save Purchase
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Save & Print
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
