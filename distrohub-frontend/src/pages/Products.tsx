import { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Upload,
  Download,
  Search,
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
import * as XLSX from 'xlsx';
import { BarcodeScanButton } from '@/components/BarcodeScanner';

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

const categories = ['Flour', 'Dairy', 'Baby Care', 'Rice', 'Beverages', 'Snacks', 'Oil', 'Spices'];
const suppliers = ['Akij Food & Beverage', 'Pran Foods', 'Square Food', 'ACI Foods', 'Nestle Bangladesh'];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Akij Flour 1kg',
    sku: 'AKJ-FLR-001',
    barcode: '8901234567890',
    category: 'Flour',
    unit: 'Pack',
    pack_size: 12,
    pieces_per_carton: 12,
    purchase_price: 55,
    selling_price: 62,
    stock_quantity: 500,
    reorder_level: 100,
    batch_number: 'BT-2024-001',
    expiry_date: '2025-06-15',
    supplier: 'Akij Food & Beverage',
    vat_inclusive: true,
    vat_rate: 5,
    image_url: '',
  },
  {
    id: '2',
    name: 'Power Milk 400g',
    sku: 'PWR-MLK-001',
    barcode: '8901234567891',
    category: 'Dairy',
    unit: 'Pack',
    pack_size: 24,
    pieces_per_carton: 24,
    purchase_price: 320,
    selling_price: 350,
    stock_quantity: 200,
    reorder_level: 50,
    batch_number: 'BT-2024-002',
    expiry_date: '2025-01-20',
    supplier: 'Pran Foods',
    vat_inclusive: true,
    vat_rate: 5,
    image_url: '',
  },
  {
    id: '3',
    name: 'Pampers Medium',
    sku: 'PMP-MED-001',
    barcode: '8901234567892',
    category: 'Baby Care',
    unit: 'Pack',
    pack_size: 6,
    pieces_per_carton: 6,
    purchase_price: 850,
    selling_price: 920,
    stock_quantity: 150,
    reorder_level: 30,
    batch_number: 'BT-2024-003',
    expiry_date: '2026-12-31',
    supplier: 'Square Food',
    vat_inclusive: false,
    vat_rate: 0,
    image_url: '',
  },
  {
    id: '4',
    name: 'Premium Rice 5kg',
    sku: 'RIC-PRM-001',
    barcode: '8901234567893',
    category: 'Rice',
    unit: 'Bag',
    pack_size: 10,
    pieces_per_carton: 10,
    purchase_price: 420,
    selling_price: 480,
    stock_quantity: 300,
    reorder_level: 50,
    batch_number: 'BT-2024-004',
    expiry_date: '2025-12-31',
    supplier: 'Akij Food & Beverage',
    vat_inclusive: true,
    vat_rate: 5,
    image_url: '',
  },
];

export function Products() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const allCategories = [...new Set([...categories, ...products.map(p => p.category)])];

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const filteredProducts = products.filter((product) => {
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

  const activeFiltersCount = [categoryFilter, stockFilter, expiryFilter].filter(f => f !== 'all').length;

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Product[];
      
      const newProducts = jsonData.map((item, index) => ({
        ...item,
        id: `imported-${Date.now()}-${index}`,
      }));
      
      setProducts([...products, ...newProducts]);
      alert(`Successfully imported ${newProducts.length} products!`);
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products.xlsx');
  };

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this product?')) {
        setProducts(products.filter((p) => p.id !== id));
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
                    <div className="relative min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>

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
                      <option value="all">All Stock</option>
                      <option value="in_stock">In Stock</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>

                    <select
                      value={expiryFilter}
                      onChange={(e) => setExpiryFilter(e.target.value)}
                      className="input-field w-40"
                    >
                      <option value="all">All Expiry</option>
                      <option value="expired">Expired</option>
                      <option value="expiring">Expiring Soon</option>
                      <option value="safe">Safe</option>
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
                      Import Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="hidden"
                      />
                    </label>

                    <button onClick={handleExcelExport} className="btn-secondary flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </button>

                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </button>
                  </div>
                </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Category</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Unit</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Purchase</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Selling</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Stock</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Batch</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Expiry</th>
                  <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
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
                      {product.unit} ({product.pack_size}/ctn)
                    </td>
                    <td className="p-2 text-right text-slate-600">৳ {product.purchase_price}</td>
                    <td className="p-2 text-right font-medium text-slate-900">৳ {product.selling_price}</td>
                    <td className="p-2 text-right">
                      <span
                        className={`font-medium ${
                          product.stock_quantity < 50 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No products found. Try adjusting your search or add a new product.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal would go here */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
                    onSave={(product, addAnother) => {
                      if (editingProduct) {
                        setProducts(products.map((p) => (p.id === product.id ? product : p)));
                      } else {
                        setProducts([...products, { ...product, id: `new-${Date.now()}` }]);
                      }
                      if (!addAnother) {
                        setShowAddModal(false);
                        setEditingProduct(null);
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
}

interface ValidationErrors {
  [key: string]: string;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
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
    
    if (batchHasValue && !formData.expiry_date) {
      setErrors({ ...errors, expiry_date: 'Expiry date is required when batch number is provided' });
      return;
    }
    
    onSave(formData as Product, addAnother);
    
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
                  className={`input-field w-full ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                    className="input-field flex-1"
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
                  className="input-field flex-1"
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
                className="input-field w-full"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
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
                className="input-field w-full"
              >
                <option value="Pack">Pack</option>
                <option value="Bag">Bag</option>
                <option value="Box">Box</option>
                <option value="Piece">Piece</option>
                <option value="Carton">Carton</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pack Size</label>
              <input
                type="number"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: Number(e.target.value) })}
                className="input-field w-full"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pieces/Carton</label>
              <input
                type="number"
                value={formData.pieces_per_carton}
                onChange={(e) => setFormData({ ...formData, pieces_per_carton: Number(e.target.value) })}
                className="input-field w-full"
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
              {suppliers.map(sup => (
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
            <button type="submit" className="btn-primary">
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
