import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
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

interface MarginRow {
  sale_id: string;
  invoice_number?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  net_sales: number;
  cogs_total: number;
  margin_amount: number;
  margin_percent: number;
  created_at: string;
}

interface MarginSummary {
  total_net_sales: number;
  total_cogs: number;
  total_margin: number;
  margin_percent: number;
  rows: MarginRow[];
}

type ReportType = 'sales' | 'purchases' | 'stock' | 'sales-returns' | 'collection' | 'margins';

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
  const [marginSummary, setMarginSummary] = useState<MarginSummary | null>(null);
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
      } else if (activeReport === 'margins') {
        const params = new URLSearchParams();
        if (startDate) params.append('from_date', startDate);
        if (endDate) params.append('to_date', endDate);
        const url = `/api/reports/margins${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        if (response.data) {
          setMarginSummary(response.data);
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
  const marginRows = marginSummary?.rows || [];

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
    <PageShell
      title="Reports"
      actions={
        <Link to="/reports/stock-reconciliation" className="btn-secondary inline-flex h-9 items-center gap-2 px-3">
          Stock Reconciliation
        </Link>
      }
    >
        {/* Report Type Tabs */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex border-b border-border px-1">
            {[
              { id: 'sales', label: 'Sales Report' },
              { id: 'purchases', label: 'Purchase Report' },
              { id: 'stock', label: 'Stock Summary' },
              { id: 'sales-returns', label: 'Sales Returns' },
              { id: 'collection', label: 'Collection' },
              { id: 'margins', label: 'Margins' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveReport(tab.id as any)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${activeReport === tab.id ? 'text-[hsl(var(--primary))] border-[hsl(var(--primary))]' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

        {/* Filters */}
        <div className="border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeReport !== 'stock' && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field h-9 w-36 text-sm" />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field h-9 w-36 text-sm" />
                </div>
              </>
            )}

            {activeReport === 'collection' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={srFilter}
                  onChange={(e) => setSrFilter(e.target.value)}
                  className="input-field h-9 w-48 text-sm"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border-b border-border">
            <div className="rounded-lg bg-[hsl(var(--dh-green))]/5 border border-[hsl(var(--dh-green))]/20 p-3">
              <p className="text-xs text-muted-foreground">Gross Sales</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-green))]">৳ {salesTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{salesItems} items</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 p-3">
              <p className="text-xs text-muted-foreground">Returns</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {salesReturnsTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">({salesReturnedItems} items)</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--dh-blue))]/5 border border-[hsl(var(--dh-blue))]/20 p-3">
              <p className="text-xs text-muted-foreground">Net Sales</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-blue))]">৳ {salesNetTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{salesNetItems} items</p>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">Return Rate</p>
              <p className="text-xl font-bold font-mono text-foreground">{returnRate.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {activeReport === 'sales-returns' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border-b border-border">
            <div className="rounded-lg bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 p-3">
              <p className="text-xs text-muted-foreground">Total Returns</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {returnsTotalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">Returns Count</p>
              <p className="text-xl font-bold font-mono text-foreground">{returnsCount}</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--dh-blue))]/5 border border-[hsl(var(--dh-blue))]/20 p-3">
              <p className="text-xs text-muted-foreground">Avg Return Amount</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-blue))]">৳ {returnsAvgAmount.toLocaleString()}</p>
            </div>
          </div>
        )}

        {activeReport === 'collection' && collectionSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border-b border-border">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-xl font-bold font-mono text-foreground">{collectionSummary.total_payments || 0}</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--dh-green))]/5 border border-[hsl(var(--dh-green))]/20 p-3">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold font-mono text-[hsl(var(--dh-green))]">৳ {(collectionSummary.total_amount || 0).toLocaleString()}</p>
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

        {activeReport === 'margins' && marginSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Net Sales</p>
              <p className="text-2xl font-bold text-blue-600">৳ {marginSummary.total_net_sales.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">COGS</p>
              <p className="text-2xl font-bold text-slate-900">৳ {marginSummary.total_cogs.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Total Margin</p>
              <p className="text-2xl font-bold text-green-600">৳ {marginSummary.total_margin.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-slate-500 text-sm">Margin %</p>
              <p className="text-2xl font-bold text-purple-600">{marginSummary.margin_percent.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Report Tables */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading report data…</div>
        ) : activeReport === 'sales' ? (
          <div className="dh-table-shell border-0 shadow-none">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {['Date','Invoice','Retailer','Gross','Returns','Net','Paid','Due','Items','Ret. Qty','Net Items'].map(h => (
                    <th key={h} className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${['Gross','Returns','Net','Paid','Due','Items','Ret. Qty','Net Items'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedSalesReport.map((sale) => {
                  const gross = sale.gross_total || sale.total_amount;
                  const returned = sale.returned_total || 0;
                  const net = sale.net_total || gross;
                  const totalItems = sale.total_items || sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  const returnedQty = sale.returned_qty || 0;
                  const netItems = sale.net_items || totalItems;
                  return (
                    <tr key={sale.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDate(sale.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setSelectedInvoice(sale)} className="font-medium text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" />{sale.invoice_number}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-foreground">{sale.retailer_name}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">৳ {gross.toLocaleString()}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-semibold ${returned > 0 ? 'text-[hsl(var(--dh-red))]' : 'text-muted-foreground/50'}`}>৳ {returned.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-blue))]">৳ {net.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-green))]">৳ {sale.paid_amount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-red))]">৳ {sale.due_amount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{totalItems}</td>
                      <td className={`px-3 py-2.5 text-right font-mono ${returnedQty > 0 ? 'text-[hsl(var(--dh-red))] font-semibold' : 'text-muted-foreground/50'}`}>{returnedQty}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-blue))]">{netItems}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border">
                  <td colSpan={3} className="px-3 py-2.5 font-bold text-foreground text-right text-sm">Totals:</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳ {salesTotal.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-red))]">৳ {salesReturnsTotal.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-blue))]">৳ {salesNetTotal.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-green))]">৳ {salesPaid.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-red))]">৳ {salesDue.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">{salesItems}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-red))]">{salesReturnedItems}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-blue))]">{salesNetItems}</td>
                </tr>
              </tfoot>
            </table>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Showing {startIndex + 1}–{Math.min(endIndex, filteredSalesReport.length)} of {filteredSalesReport.length} invoices</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
            {filteredSalesReport.length === 0 && (
              <div className="dh-empty-state py-10">
                <p className="dh-empty-state-title">No sales found</p>
                <p className="dh-empty-state-desc">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : activeReport === 'sales-returns' ? (
          <div className="dh-table-shell border-0 shadow-none">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Return #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Sale Invoice</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Refund Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSalesReturns.map((return_record) => (
                  <tr key={return_record.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(return_record.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{return_record.return_number}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{return_record.invoice_number || '–'}</td>
                    <td className="px-3 py-2.5 text-foreground">{return_record.retailer_name}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-red))]">৳ {return_record.total_return_amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-sm max-w-xs truncate" title={return_record.reason || ''}>{return_record.reason || '–'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${return_record.refund_type === 'adjust_due' ? 'bg-[hsl(var(--dh-blue))]/10 text-[hsl(var(--dh-blue))]' : 'bg-[hsl(var(--dh-green))]/10 text-[hsl(var(--dh-green))]'}`}>
                        {return_record.refund_type === 'adjust_due' ? 'Adjust Due' : 'Cash Refund'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t-2 border-border">
                <tr>
                  <td colSpan={4} className="px-3 py-2.5 font-semibold text-foreground text-right text-sm">Totals:</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-red))]">৳ {returnsTotalAmount.toLocaleString()}</td>
                  <td colSpan={2} className="px-3 py-2.5 text-center font-bold text-foreground text-sm">{returnsCount} returns</td>
                </tr>
              </tfoot>
            </table>
            {filteredSalesReturns.length === 0 && (
              <div className="dh-empty-state py-10">
                <p className="dh-empty-state-title">No returns found</p>
                <p className="dh-empty-state-desc">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : activeReport === 'purchases' ? (
          <div className="dh-table-shell border-0 shadow-none">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(purchase.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{purchase.invoice_number}</td>
                    <td className="px-3 py-2.5 text-foreground">{purchase.supplier_name}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">৳ {purchase.total_amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-green))]">৳ {purchase.paid_amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{purchase.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t-2 border-border">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 font-semibold text-foreground text-right text-sm">Totals:</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳ {purchasesTotal.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-green))]">৳ {purchasesPaid.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">{purchasesItems}</td>
                </tr>
                </tfoot>
            </table>
            {filteredPurchases.length === 0 && (
              <div className="dh-empty-state py-10">
                <p className="dh-empty-state-title">No purchases found</p>
                <p className="dh-empty-state-desc">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : activeReport === 'stock' ? (
          <div className="dh-table-shell border-0 shadow-none">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Stock</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInventory.map((item) => (
                  <tr key={item.product_id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.product_name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.sku}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.category}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">{item.total_stock.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-sm">{item.batches.length} batch{item.batches.length !== 1 ? 'es' : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t-2 border-border">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 font-semibold text-foreground text-right text-sm">Totals:</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">{stockTotal.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-left font-bold text-foreground text-sm">{stockProducts} products</td>
                </tr>
              </tfoot>
            </table>
            {filteredInventory.length === 0 && (
              <div className="dh-empty-state py-10">
                <p className="dh-empty-state-title">No products found</p>
                <p className="dh-empty-state-desc">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : activeReport === 'collection' ? (
          <div>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading collection report…</div>
            ) : collectionPayments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No payment records found for the selected period.</div>
            ) : (
              <div className="dh-table-shell border-0 shadow-none">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date/Time</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                      <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Collected By</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Route #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {collectionPayments.map((payment: any) => (
                      <tr key={payment.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                        <td className="px-3 py-2.5 text-muted-foreground">{formatDate(payment.created_at)}</td>
                        <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{payment.invoice_number || '–'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{payment.retailer_name}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-mono font-bold text-foreground">৳{payment.amount.toLocaleString()}
                            </span>
                          </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-[hsl(var(--dh-blue))]/10 text-[hsl(var(--dh-blue))] text-xs font-medium rounded capitalize">{payment.payment_method}</span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{payment.collected_by_name || '–'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{payment.route_number || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/40 border-t border-border">
                    <tr>
                      <td colSpan={3} className="px-3 py-2.5 text-right font-semibold text-foreground text-sm">Total:</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳{collectionPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : activeReport === 'margins' ? (
          <div className="dh-table-shell border-0 shadow-none">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Sales</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">COGS</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {marginRows.map((row, idx) => (
                  <tr key={`${row.sale_id}-${row.product_id}-${idx}`} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{row.invoice_number || '—'}</td>
                    <td className="px-3 py-2.5 text-foreground">{row.product_name || row.product_id}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono">৳ {row.net_sales.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono">৳ {row.cogs_total.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-green-600">৳ {row.margin_amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.margin_percent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marginRows.length === 0 && (
              <div className="dh-empty-state py-10">
                <p className="dh-empty-state-title">No margin rows found</p>
                <p className="dh-empty-state-desc">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : null}
        </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="dh-modal-overlay">
          <div className="dh-modal-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Invoice Details – {selectedInvoice.invoice_number}</h2>
              <button onClick={() => setSelectedInvoice(null)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Retailer</p>
                  <p className="font-semibold text-foreground">{selectedInvoice.retailer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                  <p className="font-semibold text-foreground">{formatDate(selectedInvoice.created_at)}</p>
                </div>
              </div>
              <div className="mb-5">
                <h3 className="font-semibold text-foreground mb-2 text-sm">Items</h3>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Returned</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingReturnItems ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">Loading return items…</td></tr>
                    ) : (
                      selectedInvoice.items.map((item, idx) => {
                        const returnedItem = returnItems.find(ri => ri.sale_item_id === item.id);
                        const returnedQty = returnedItem?.quantity_returned || 0;
                        return (
                          <tr key={idx} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                            <td className="px-3 py-2 text-foreground">{item.product_name}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{item.quantity}</td>
                            <td className={`px-3 py-2 text-right font-mono font-semibold ${returnedQty > 0 ? 'text-[hsl(var(--dh-red))]' : 'text-muted-foreground/50'}`}>{returnedQty > 0 ? returnedQty : '–'}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">৳ {item.unit_price.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">৳ {item.total.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Gross Total</p>
                    <p className="text-lg font-bold font-mono text-[hsl(var(--dh-green))]">৳ {(selectedInvoice.gross_total || selectedInvoice.total_amount).toLocaleString()}</p>
                  </div>
                  {selectedInvoice.returned_total > 0 && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Returns</p>
                        <p className="text-lg font-bold font-mono text-[hsl(var(--dh-red))]">৳ {selectedInvoice.returned_total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Net Total</p>
                        <p className="text-lg font-bold font-mono text-[hsl(var(--dh-blue))]">৳ {selectedInvoice.net_total.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Paid</p>
                    <p className="text-lg font-bold font-mono text-[hsl(var(--dh-green))]">৳ {selectedInvoice.paid_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Due</p>
                    <p className="text-lg font-bold font-mono text-[hsl(var(--dh-red))]">৳ {selectedInvoice.due_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Total Items</p>
                    <p className="text-lg font-bold font-mono text-foreground">
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
    </PageShell>
  );
}
