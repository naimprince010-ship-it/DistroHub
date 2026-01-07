import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Download,
  Calendar,
  Filter,
  Search,
} from 'lucide-react';
import api from '@/lib/api';

interface Sale {
  id: string;
  invoice_number: string;
  retailer_name: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number; total: number }>;
}

interface SaleReport extends Sale {
  gross_total: number;
  returned_total: number;
  net_total: number;
  has_returns: boolean;
  return_count: number;
}

interface SaleReturnReport {
  id: string;
  return_number: string;
  sale_id: string;
  invoice_number: string;
  retailer_name: string;
  total_return_amount: number;
  reason?: string;
  refund_type: string;
  created_at: string;
}

interface SalesReportSummary {
  total_gross: number;
  total_returns: number;
  total_net: number;
  return_rate: number;
  total_sales: number;
  sales_with_returns: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  supplier_name: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number; total: number }>;
}

interface InventoryItem {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  total_stock: number;
  batches: Array<{ batch_number: string; quantity: number; expiry_date: string }>;
}

interface Category {
  id: string;
  name: string;
}

type ReportType = 'sales' | 'purchases' | 'stock' | 'sales-returns';

export function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [loading, setLoading] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Product/Category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  
  // Data
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesReport, setSalesReport] = useState<SaleReport[]>([]);
  const [salesReportSummary, setSalesReportSummary] = useState<SalesReportSummary | null>(null);
  const [salesReturns, setSalesReturns] = useState<SaleReturnReport[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; category: string }>>([]);

  // Fetch categories and products for filter
  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [categoriesResponse, productsResponse] = await Promise.all([
          api.get('/api/categories'),
          api.get('/api/products')
        ]);
        
        if (categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }
        
        if (productsResponse.data) {
          setProducts(productsResponse.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category || 'Uncategorized'
          })));
        }
      } catch (error) {
        console.error('[Reports] Error fetching categories/products:', error);
      }
    };

    fetchCategoriesAndProducts();
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Reports] No token found, skipping data fetch');
      return;
    }

    try {
      setLoading(true);
      console.log(`[Reports] Fetching ${activeReport} report data...`);

      if (activeReport === 'sales') {
        // Use new reports endpoint with date filters
        const params = new URLSearchParams();
        if (startDate) params.append('from_date', startDate);
        if (endDate) params.append('to_date', endDate);
        const url = `/api/reports/sales${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        if (response.data) {
          setSalesReport(response.data.sales || []);
          setSalesReportSummary(response.data.summary || null);
          console.log('[Reports] Sales report fetched:', response.data.sales?.length || 0);
        }
      } else if (activeReport === 'sales-returns') {
        // Get sales returns report
        const params = new URLSearchParams();
        if (startDate) params.append('from_date', startDate);
        if (endDate) params.append('to_date', endDate);
        const url = `/api/reports/sales-returns${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        if (response.data) {
          setSalesReturns(response.data);
          console.log('[Reports] Sales returns fetched:', response.data.length);
        }
      } else if (activeReport === 'purchases') {
        const response = await api.get('/api/purchases');
        if (response.data) {
          setPurchases(response.data);
          console.log('[Reports] Purchases fetched:', response.data.length);
        }
      } else if (activeReport === 'stock') {
        const response = await api.get('/api/inventory');
        if (response.data) {
          setInventory(response.data);
          console.log('[Reports] Inventory fetched:', response.data.length);
        }
      }
    } catch (error: any) {
      console.error(`[Reports] Error fetching ${activeReport} data:`, error);
      if (error?.response?.status === 401) {
        console.warn('[Reports] 401 Unauthorized - token may be expired');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReport, startDate, endDate]);

  // Filter sales report by category/product (date filtering done on backend)
  const filteredSalesReport = salesReport.filter((sale) => {
    const matchesCategory = categoryFilter === 'all' || 
      sale.items.some(item => {
        const product = products.find(p => p.name === item.product_name);
        return product?.category === categoryFilter;
      });
    const matchesProduct = !productSearch || 
      sale.items.some(item => 
        item.product_name.toLowerCase().includes(productSearch.toLowerCase())
      );
    return matchesCategory && matchesProduct;
  });

  // Filter sales returns by date (date filtering done on backend)
  const filteredSalesReturns = salesReturns.filter((return_record) => {
    const matchesRetailer = !productSearch || 
      return_record.retailer_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      return_record.return_number.toLowerCase().includes(productSearch.toLowerCase()) ||
      return_record.invoice_number.toLowerCase().includes(productSearch.toLowerCase());
    return matchesRetailer;
  });

  // Filter purchases by date range
  const filteredPurchases = purchases.filter((purchase) => {
    const purchaseDate = new Date(purchase.created_at).toISOString().split('T')[0];
    const matchesDate = purchaseDate >= startDate && purchaseDate <= endDate;
    const matchesCategory = categoryFilter === 'all' || 
      purchase.items.some(item => {
        const product = products.find(p => p.name === item.product_name);
        return product?.category === categoryFilter;
      });
    const matchesProduct = !productSearch || 
      purchase.items.some(item => 
        item.product_name.toLowerCase().includes(productSearch.toLowerCase())
      );
    return matchesDate && matchesCategory && matchesProduct;
  });

  // Filter inventory by category/product
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesProduct = !productSearch || 
      item.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesProduct;
  });

  // Calculate totals for sales report (use summary from API if available, otherwise calculate)
  const salesTotal = salesReportSummary?.total_gross ?? filteredSalesReport.reduce((sum, s) => sum + (s.gross_total || s.total_amount), 0);
  const salesReturnsTotal = salesReportSummary?.total_returns ?? filteredSalesReport.reduce((sum, s) => sum + (s.returned_total || 0), 0);
  const salesNetTotal = salesReportSummary?.total_net ?? filteredSalesReport.reduce((sum, s) => sum + (s.net_total || s.total_amount), 0);
  const salesPaid = filteredSalesReport.reduce((sum, s) => sum + s.paid_amount, 0);
  const salesDue = filteredSalesReport.reduce((sum, s) => sum + s.due_amount, 0);
  const salesItems = filteredSalesReport.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const returnRate = salesReportSummary?.return_rate ?? (salesTotal > 0 ? (salesReturnsTotal / salesTotal * 100) : 0);

  // Calculate totals for sales returns
  const returnsTotalAmount = filteredSalesReturns.reduce((sum, r) => sum + r.total_return_amount, 0);
  const returnsCount = filteredSalesReturns.length;
  const returnsAvgAmount = returnsCount > 0 ? returnsTotalAmount / returnsCount : 0;

  const purchasesTotal = filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const purchasesPaid = filteredPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
  const purchasesItems = filteredPurchases.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  const stockTotal = filteredInventory.reduce((sum, i) => sum + i.total_stock, 0);
  const stockProducts = filteredInventory.length;

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeReport === 'sales') {
      filename = `sales-report-${startDate}-to-${endDate}.csv`;
      csvContent = 'Date,Invoice,Retailer,Gross Sales,Returns,Net Sales,Paid,Due\n';
      filteredSalesReport.forEach((sale) => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        const gross = sale.gross_total || sale.total_amount;
        const returned = sale.returned_total || 0;
        const net = sale.net_total || gross;
        csvContent += `${date},${sale.invoice_number},${sale.retailer_name},${gross},${returned},${net},${sale.paid_amount},${sale.due_amount}\n`;
      });
    } else if (activeReport === 'sales-returns') {
      filename = `sales-returns-report-${startDate}-to-${endDate}.csv`;
      csvContent = 'Date,Return Number,Sale Invoice,Retailer,Amount,Reason,Refund Type\n';
      filteredSalesReturns.forEach((return_record) => {
        const date = new Date(return_record.created_at).toISOString().split('T')[0];
        csvContent += `${date},${return_record.return_number},${return_record.invoice_number},${return_record.retailer_name},${return_record.total_return_amount},${return_record.reason || ''},${return_record.refund_type}\n`;
      });
    } else if (activeReport === 'purchases') {
      filename = `purchases-report-${startDate}-to-${endDate}.csv`;
      csvContent = 'Date,Invoice,Supplier,Total Amount,Paid\n';
      filteredPurchases.forEach((purchase) => {
        const date = new Date(purchase.created_at).toISOString().split('T')[0];
        csvContent += `${date},${purchase.invoice_number},${purchase.supplier_name},${purchase.total_amount},${purchase.paid_amount}\n`;
      });
    } else if (activeReport === 'stock') {
      filename = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Product Name,SKU,Category,Total Stock\n';
      filteredInventory.forEach((item) => {
        csvContent += `${item.product_name},${item.sku},${item.category},${item.total_stock}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen">
      <Header title="Reports" />

      <div className="p-3">
        {/* Report Type Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-2">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveReport('sales')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === 'sales'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sales Report
            </button>
            <button
              onClick={() => setActiveReport('purchases')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === 'purchases'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Purchase Report
            </button>
            <button
              onClick={() => setActiveReport('stock')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === 'stock'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Stock Summary
            </button>
            <button
              onClick={() => setActiveReport('sales-returns')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === 'sales-returns'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sales Returns Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2">
          <div className="flex flex-wrap items-center gap-2">
            {activeReport !== 'stock' && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field w-40"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field w-40"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field w-40"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search product..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="input-field flex-1"
              />
            </div>

            <button
              onClick={fetchReportData}
              className="btn-primary"
            >
              Refresh
            </button>

            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {activeReport === 'sales' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Gross Sales</p>
              <p className="text-2xl font-bold text-green-600">৳ {salesTotal.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Returns</p>
              <p className="text-2xl font-bold text-red-600">৳ {salesReturnsTotal.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Net Sales</p>
              <p className="text-2xl font-bold text-blue-600">৳ {salesNetTotal.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Return Rate</p>
              <p className="text-2xl font-bold text-slate-900">{returnRate.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {activeReport === 'sales-returns' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Returns</p>
              <p className="text-2xl font-bold text-red-600">৳ {returnsTotalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Returns Count</p>
              <p className="text-2xl font-bold text-slate-900">{returnsCount}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Avg Return Amount</p>
              <p className="text-2xl font-bold text-blue-600">৳ {returnsAvgAmount.toLocaleString()}</p>
            </div>
          </div>
        )}

        {activeReport === 'purchases' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Purchases</p>
              <p className="text-2xl font-bold text-blue-600">৳ {purchasesTotal.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">৳ {purchasesPaid.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">{filteredPurchases.length}</p>
            </div>
          </div>
        )}

        {activeReport === 'stock' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-slate-900">{stockProducts}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Stock</p>
              <p className="text-2xl font-bold text-blue-600">{stockTotal.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Report Tables */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            Loading report data...
          </div>
        ) : activeReport === 'sales' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Invoice</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Gross</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Returns</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Net</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Paid</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Due</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesReport.map((sale) => {
                    const gross = sale.gross_total || sale.total_amount;
                    const returned = sale.returned_total || 0;
                    const net = sale.net_total || gross;
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-slate-600">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-medium text-primary-600">{sale.invoice_number}</td>
                        <td className="p-2 text-slate-900">{sale.retailer_name}</td>
                        <td className="p-2 text-right font-semibold text-slate-900">
                          ৳ {gross.toLocaleString()}
                        </td>
                        <td className={`p-2 text-right font-semibold ${returned > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          ৳ {returned.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-semibold text-blue-600">
                          ৳ {net.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-semibold text-green-600">
                          ৳ {sale.paid_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-semibold text-red-600">
                          ৳ {sale.due_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-center text-slate-600">
                          {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-2 font-semibold text-slate-900 text-right">
                      Totals:
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      ৳ {salesTotal.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      ৳ {salesReturnsTotal.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-blue-600">
                      ৳ {salesNetTotal.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-green-600">
                      ৳ {salesPaid.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      ৳ {salesDue.toLocaleString()}
                    </td>
                    <td className="p-2 text-center font-bold text-slate-900">
                      {salesItems}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {filteredSalesReport.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No sales found for the selected filters.
              </div>
            )}
          </div>
        ) : activeReport === 'sales-returns' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Return #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Sale Invoice</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Reason</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Refund Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesReturns.map((return_record) => (
                    <tr key={return_record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-slate-600">
                        {new Date(return_record.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-medium text-primary-600">{return_record.return_number}</td>
                      <td className="p-2 text-slate-600">{return_record.invoice_number || '-'}</td>
                      <td className="p-2 text-slate-900">{return_record.retailer_name}</td>
                      <td className="p-2 text-right font-semibold text-red-600">
                        ৳ {return_record.total_return_amount.toLocaleString()}
                      </td>
                      <td className="p-2 text-slate-600 text-sm max-w-xs truncate" title={return_record.reason || ''}>
                        {return_record.reason || '-'}
                      </td>
                      <td className="p-2 text-slate-600">
                        <span className={`px-2 py-1 rounded text-xs ${
                          return_record.refund_type === 'adjust_due' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {return_record.refund_type === 'adjust_due' ? 'Adjust Due' : 'Cash Refund'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="p-2 font-semibold text-slate-900 text-right">
                      Totals:
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      ৳ {returnsTotalAmount.toLocaleString()}
                    </td>
                    <td colSpan={2} className="p-2 text-center font-bold text-slate-900">
                      {returnsCount} returns
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {filteredSalesReturns.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No returns found for the selected filters.
              </div>
            )}
          </div>
        ) : activeReport === 'purchases' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Invoice</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Supplier</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Paid</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-slate-600">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-medium text-primary-600">{purchase.invoice_number}</td>
                      <td className="p-2 text-slate-900">{purchase.supplier_name}</td>
                      <td className="p-2 text-right font-semibold text-slate-900">
                        ৳ {purchase.total_amount.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        ৳ {purchase.paid_amount.toLocaleString()}
                      </td>
                      <td className="p-2 text-center text-slate-600">
                        {purchase.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-2 font-semibold text-slate-900 text-right">
                      Totals:
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      ৳ {purchasesTotal.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-green-600">
                      ৳ {purchasesPaid.toLocaleString()}
                    </td>
                    <td className="p-2 text-center font-bold text-slate-900">
                      {purchasesItems}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {filteredPurchases.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No purchases found for the selected filters.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                    <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Category</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total Stock</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Batches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-medium text-slate-900">{item.product_name}</td>
                      <td className="p-2 text-slate-600">{item.sku}</td>
                      <td className="p-2 text-slate-600">{item.category}</td>
                      <td className="p-2 text-right font-semibold text-slate-900">
                        {item.total_stock.toLocaleString()}
                      </td>
                      <td className="p-2 text-slate-600 text-sm">
                        {item.batches.length} batch{item.batches.length !== 1 ? 'es' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="p-2 font-semibold text-slate-900 text-right">
                      Totals:
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      {stockTotal.toLocaleString()}
                    </td>
                    <td className="p-2 text-left font-bold text-slate-900">
                      {stockProducts} products
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {filteredInventory.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No products found for the selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
