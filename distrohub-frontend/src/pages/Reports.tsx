import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Download,
  Calendar,
  Filter,
  Search,
  FileText,
  Printer,
  X,
  Eye,
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
  items: Array<{ id: string; product_name: string; quantity: number; unit_price: number; total: number }>;
}

interface SaleReport extends Sale {
  gross_total: number;
  returned_total: number;
  net_total: number;
  has_returns: boolean;
  return_count: number;
  total_items: number;
  returned_qty: number;
  net_items: number;
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
  total_items: number;
  total_returned_items: number;
  total_net_items: number;
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

type ReportType = 'sales' | 'purchases' | 'stock' | 'sales-returns' | 'collection';

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
  const [salesReport, setSalesReport] = useState<SaleReport[]>([]);
  const [salesReportSummary, setSalesReportSummary] = useState<SalesReportSummary | null>(null);
  const [salesReturns, setSalesReturns] = useState<SaleReturnReport[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [collectionPayments, setCollectionPayments] = useState<any[]>([]);
  const [collectionSummary, setCollectionSummary] = useState<any | null>(null);
  const [srFilter, setSrFilter] = useState<string>('all');
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  
  // UI State
  const [selectedInvoice, setSelectedInvoice] = useState<SaleReport | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{sale_item_id: string; quantity_returned: number; product_name: string}>>([]);
  const [loadingReturnItems, setLoadingReturnItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch categories, products, and sales reps for filter
  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [categoriesResponse, productsResponse, usersResponse] = await Promise.all([
          api.get('/api/categories'),
          api.get('/api/products'),
          api.get('/api/users')
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

        if (usersResponse.data) {
          const reps = usersResponse.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({ id: u.id, name: u.name }));
          setSalesReps(reps);
        }
      } catch (error) {
        console.error('[Reports] Error fetching categories/products/users:', error);
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
      } else if (activeReport === 'collection') {
        const params = new URLSearchParams();
        if (startDate) params.append('from_date', startDate);
        if (endDate) params.append('to_date', endDate);
        if (srFilter && srFilter !== 'all') {
          params.append('user_id', srFilter);
        }
        const url = `/api/reports/collections${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        if (response.data) {
          // New collection report returns payments array and summary
          setCollectionPayments(response.data.payments || []);
          setCollectionSummary(response.data.summary || null);
          console.log('[Reports] Collection report fetched:', response.data.payments?.length || 0);
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
  }, [activeReport, startDate, endDate, srFilter]);

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

  // Helper function to format date as DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Pagination for sales report
  const totalPages = Math.ceil(filteredSalesReport.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSalesReport = filteredSalesReport.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeReport, startDate, endDate, categoryFilter, productSearch]);

  // Fetch return items when invoice is selected
  useEffect(() => {
    const fetchReturnItems = async () => {
      if (!selectedInvoice) {
        setReturnItems([]);
        return;
      }

      try {
        setLoadingReturnItems(true);
        // Get all returns for this sale (includes items)
        const returnsResponse = await api.get(`/api/sales/${selectedInvoice.id}/returns`);
        if (returnsResponse.data && Array.isArray(returnsResponse.data)) {
          // Extract return items from all returns
          const allReturnItems: Array<{sale_item_id: string; quantity_returned: number; product_name: string}> = [];
          returnsResponse.data.forEach((ret: any) => {
            if (ret.items && Array.isArray(ret.items)) {
              ret.items.forEach((item: any) => {
                allReturnItems.push({
                  sale_item_id: item.sale_item_id,
                  quantity_returned: item.quantity_returned,
                  product_name: item.product_name
                });
              });
            }
          });
          setReturnItems(allReturnItems);
        }
      } catch (error) {
        console.error('[Reports] Error fetching return items:', error);
        setReturnItems([]);
      } finally {
        setLoadingReturnItems(false);
      }
    };

    fetchReturnItems();
  }, [selectedInvoice]);

  // Calculate totals for sales report (use summary from API if available, otherwise calculate)
  const salesTotal = salesReportSummary?.total_gross ?? filteredSalesReport.reduce((sum, s) => sum + (s.gross_total || s.total_amount), 0);
  const salesReturnsTotal = salesReportSummary?.total_returns ?? filteredSalesReport.reduce((sum, s) => sum + (s.returned_total || 0), 0);
  const salesNetTotal = salesReportSummary?.total_net ?? filteredSalesReport.reduce((sum, s) => sum + (s.net_total || s.total_amount), 0);
  const salesPaid = filteredSalesReport.reduce((sum, s) => sum + s.paid_amount, 0);
  const salesDue = filteredSalesReport.reduce((sum, s) => sum + s.due_amount, 0);
  const salesItems = salesReportSummary?.total_items ?? filteredSalesReport.reduce((sum, s) => sum + (s.total_items || s.items.reduce((itemSum, item) => itemSum + item.quantity, 0)), 0);
  const salesReturnedItems = salesReportSummary?.total_returned_items ?? filteredSalesReport.reduce((sum, s) => sum + (s.returned_qty || 0), 0);
  const salesNetItems = salesReportSummary?.total_net_items ?? filteredSalesReport.reduce((sum, s) => sum + (s.net_items || s.items.reduce((itemSum, item) => itemSum + item.quantity, 0)), 0);
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

  // Export to PDF
  const exportToPDF = () => {
    // Simple PDF generation using window.print with CSS
    // For production, consider using jsPDF or similar library
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report - ${startDate} to ${endDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; text-align: center; }
            .text-left { text-align: left; }
            @media print {
              @page { size: A4 landscape; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <p><strong>Period:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</p>
          <table>
            <thead>
              <tr>
                <th class="text-left">Date</th>
                <th class="text-left">Invoice</th>
                <th class="text-left">Retailer</th>
                <th>Gross</th>
                <th>Returns</th>
                <th>Net</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Items</th>
                <th>Returned</th>
                <th>Net Items</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSalesReport.map(sale => {
                const gross = sale.gross_total || sale.total_amount;
                const returned = sale.returned_total || 0;
                const net = sale.net_total || gross;
                const totalItems = sale.total_items || sale.items.reduce((sum, item) => sum + item.quantity, 0);
                const returnedQty = sale.returned_qty || 0;
                const netItems = sale.net_items || totalItems;
                return `
                  <tr>
                    <td class="text-left">${formatDate(sale.created_at)}</td>
                    <td class="text-left">${sale.invoice_number}</td>
                    <td class="text-left">${sale.retailer_name}</td>
                    <td>৳${gross.toLocaleString()}</td>
                    <td>৳${returned.toLocaleString()}</td>
                    <td>৳${net.toLocaleString()}</td>
                    <td>৳${sale.paid_amount.toLocaleString()}</td>
                    <td>৳${sale.due_amount.toLocaleString()}</td>
                    <td>${totalItems}</td>
                    <td>${returnedQty}</td>
                    <td>${netItems}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <td colspan="3" class="text-left">Totals:</td>
                <td>৳${salesTotal.toLocaleString()}</td>
                <td>৳${salesReturnsTotal.toLocaleString()}</td>
                <td>৳${salesNetTotal.toLocaleString()}</td>
                <td>৳${salesPaid.toLocaleString()}</td>
                <td>৳${salesDue.toLocaleString()}</td>
                <td>${salesItems}</td>
                <td>${salesReturnedItems}</td>
                <td>${salesNetItems}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeReport === 'sales') {
      filename = `sales-report-${startDate}-to-${endDate}.csv`;
      csvContent = 'Date,Invoice,Retailer,Gross Sales,Returns,Net Sales,Paid,Due,Items,Returned Qty,Net Items\n';
      filteredSalesReport.forEach((sale) => {
        const date = formatDate(sale.created_at);
        const gross = sale.gross_total || sale.total_amount;
        const returned = sale.returned_total || 0;
        const net = sale.net_total || gross;
        const totalItems = sale.total_items || sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const returnedQty = sale.returned_qty || 0;
        const netItems = sale.net_items || totalItems;
        csvContent += `${date},${sale.invoice_number},${sale.retailer_name},${gross},${returned},${net},${sale.paid_amount},${sale.due_amount},${totalItems},${returnedQty},${netItems}\n`;
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
            <button
              onClick={() => setActiveReport('collection')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === 'collection'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Collection Report
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

            {activeReport === 'collection' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={srFilter}
                  onChange={(e) => setSrFilter(e.target.value)}
                  className="input-field w-48"
                >
                  <option value="all">All SRs</option>
                  {salesReps.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.name}
                    </option>
                  ))}
                </select>
              </div>
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
            {activeReport === 'sales' && (
              <>
                <button
                  onClick={() => exportToPDF()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {activeReport === 'sales' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Gross Sales</p>
              <p className="text-2xl font-bold text-green-600">৳ {salesTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{salesItems} items</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Returns</p>
              <p className="text-2xl font-bold text-red-600">৳ {salesReturnsTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">({salesReturnedItems} items)</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Net Sales</p>
              <p className="text-2xl font-bold text-blue-600">৳ {salesNetTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{salesNetItems} items</p>
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

        {activeReport === 'collection' && collectionSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Payments</p>
              <p className="text-2xl font-bold text-slate-900">{collectionSummary.total_payments || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">৳ {(collectionSummary.total_amount || 0).toLocaleString()}</p>
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
                    <th className="text-right p-2 font-semibold text-slate-700">Items</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Returned Qty</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Net Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSalesReport.map((sale, index) => {
                    const gross = sale.gross_total || sale.total_amount;
                    const returned = sale.returned_total || 0;
                    const net = sale.net_total || gross;
                    const totalItems = sale.total_items || sale.items.reduce((sum, item) => sum + item.quantity, 0);
                    const returnedQty = sale.returned_qty || 0;
                    const netItems = sale.net_items || totalItems;
                    return (
                      <tr 
                        key={sale.id} 
                        className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                      >
                        <td className="p-2 text-slate-600">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => setSelectedInvoice(sale)}
                            className="font-medium text-primary-600 hover:text-primary-700 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {sale.invoice_number}
                          </button>
                        </td>
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
                        <td className="p-2 text-right text-slate-600">
                          {totalItems}
                        </td>
                        <td className={`p-2 text-right ${returnedQty > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                          {returnedQty}
                        </td>
                        <td className="p-2 text-right text-blue-600 font-semibold">
                          {netItems}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={3} className="p-2 font-bold text-slate-900 text-right">
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
                    <td className="p-2 text-right font-bold text-slate-900">
                      {salesItems}
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      {salesReturnedItems}
                    </td>
                    <td className="p-2 text-right font-bold text-blue-600">
                      {salesNetItems}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredSalesReport.length)} of {filteredSalesReport.length} invoices
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
        ) : activeReport === 'stock' ? (
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
        ) : activeReport === 'collection' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading collection report...</div>
            ) : collectionPayments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm">
                No payment records found for the selected period.
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Date/Time</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Invoice #</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Retailer</th>
                        <th className="text-right p-3 font-semibold text-slate-700 text-sm">Amount</th>
                        <th className="text-center p-3 font-semibold text-slate-700 text-sm">Method</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Collected By</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Route #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {collectionPayments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-sm text-slate-600">
                            {formatDate(payment.created_at)}
                          </td>
                          <td className="p-3 text-sm font-medium text-primary-600">
                            {payment.invoice_number || '-'}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {payment.retailer_name}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-slate-900">
                              <span className="text-sm font-semibold">৳</span>{payment.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {payment.collected_by_name || '-'}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {payment.route_number || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-slate-900">
                            <span className="text-sm font-semibold">৳</span>
                            {collectionPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                          </span>
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Invoice Details - {selectedInvoice.invoice_number}</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Retailer</p>
                  <p className="font-semibold text-slate-900">{selectedInvoice.retailer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(selectedInvoice.created_at)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">Items</h3>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Qty</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Returned</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Unit Price</th>
                      <th className="text-right p-2 font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingReturnItems ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">
                          Loading return items...
                        </td>
                      </tr>
                    ) : (
                      selectedInvoice.items.map((item, idx) => {
                        // Find returned quantity for this item
                        const returnedItem = returnItems.find(ri => ri.sale_item_id === item.id);
                        const returnedQty = returnedItem?.quantity_returned || 0;
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-2 text-slate-900">{item.product_name}</td>
                            <td className="p-2 text-right text-slate-600">{item.quantity}</td>
                            <td className={`p-2 text-right font-semibold ${returnedQty > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {returnedQty > 0 ? returnedQty : '-'}
                            </td>
                            <td className="p-2 text-right text-slate-600">৳ {item.unit_price.toLocaleString()}</td>
                            <td className="p-2 text-right font-semibold text-slate-900">৳ {item.total.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Gross Total</p>
                    <p className="text-lg font-bold text-green-600">
                      ৳ {(selectedInvoice.gross_total || selectedInvoice.total_amount).toLocaleString()}
                    </p>
                  </div>
                  {selectedInvoice.returned_total > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-slate-500">Returns</p>
                        <p className="text-lg font-bold text-red-600">
                          ৳ {selectedInvoice.returned_total.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Net Total</p>
                        <p className="text-lg font-bold text-blue-600">
                          ৳ {selectedInvoice.net_total.toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-slate-500">Paid</p>
                    <p className="text-lg font-bold text-green-600">
                      ৳ {selectedInvoice.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Due</p>
                    <p className="text-lg font-bold text-red-600">
                      ৳ {selectedInvoice.due_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Items</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(selectedInvoice.total_items || selectedInvoice.items.reduce((sum, item) => sum + item.quantity, 0))}
                    </p>
                  </div>
                  {(selectedInvoice.returned_qty || 0) > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-slate-500">Returned Items</p>
                        <p className="text-lg font-bold text-red-600">
                          {selectedInvoice.returned_qty || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Net Items</p>
                        <p className="text-lg font-bold text-blue-600">
                          {selectedInvoice.net_items || (selectedInvoice.total_items || selectedInvoice.items.reduce((sum, item) => sum + item.quantity, 0))}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
