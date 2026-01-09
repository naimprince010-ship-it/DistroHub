import React, { useState, useEffect } from 'react';
import { Printer, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';
import { BulkChallanPrint } from '@/components/print/BulkChallanPrint';

interface Route {
  id: string;
  route_number: string;
  assigned_to_name: string;
  route_date: string;
  sales?: any[];
  route_sales?: any[];
}

interface LoadSheetProps {
  route: Route;
  onClose: () => void;
}

export function LoadSheet({ route, onClose }: LoadSheetProps) {
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBulkPrint, setShowBulkPrint] = useState(false);

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/routes/${route.id}`);
        setRouteDetails(response.data);
      } catch (error) {
        console.error('[LoadSheet] Error fetching route details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteDetails();
  }, [route.id]);

  if (loading || !routeDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">Loading load sheet...</div>
      </div>
    );
  }

  const sales = routeDetails.sales || [];
  const routeSales = routeDetails.route_sales || [];

  // Calculate totals
  let totalPreviousDue = 0;
  let totalCurrentBill = 0;
  let totalOutstanding = 0;

  sales.forEach((sale: any) => {
    const routeSale = routeSales.find((rs: any) => rs.sale_id === sale.id);
    const previousDue = routeSale?.previous_due || 0;
    const currentBill = sale.total_amount || 0;
    const outstanding = previousDue + currentBill;
    
    totalPreviousDue += previousDue;
    totalCurrentBill += currentBill;
    totalOutstanding += outstanding;
  });

  // Group by retailer
  const salesByRetailer = sales.reduce((acc: any, sale: any) => {
    const retailerId = sale.retailer_id;
    if (!acc[retailerId]) {
      acc[retailerId] = {
        retailer_name: sale.retailer_name,
        retailer_id: retailerId,
        sales: []
      };
    }
    acc[retailerId].sales.push(sale);
    return acc;
  }, {});

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Load Sheet - {routeDetails.route_number}</h2>
              <p className="text-sm text-slate-600">
                SR: {routeDetails.assigned_to_name} | Date: {formatDateBD(routeDetails.route_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkPrint(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print All Invoices
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="p-3 grid grid-cols-3 gap-2 border-b border-slate-200">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Total Previous Due</p>
              <p className="text-lg font-bold text-slate-900">৳ {totalPreviousDue.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Total Current Bill</p>
              <p className="text-lg font-bold text-blue-600">৳ {totalCurrentBill.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600">৳ {totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Load Sheet Table */}
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">#</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Previous Due</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Current Bill</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total Outstanding</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Items</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(salesByRetailer).map((retailerGroup: any, groupIndex: number) => (
                    <React.Fragment key={retailerGroup.retailer_id}>
                      {retailerGroup.sales.map((sale: any, index: number) => {
                        const routeSale = routeSales.find((rs: any) => rs.sale_id === sale.id);
                        const previousDue = routeSale?.previous_due || 0;
                        const currentBill = sale.total_amount || 0;
                        const totalOutstanding = previousDue + currentBill;
                        const isFirstInGroup = index === 0;
                        const rowNumber = sales.findIndex((s: any) => s.id === sale.id) + 1;

                        // Determine status color
                        let statusColor = 'bg-green-100 text-green-700';
                        let statusLabel = 'Paid';
                        if (sale.payment_status === 'unpaid') {
                          statusColor = 'bg-red-100 text-red-700';
                          statusLabel = 'Unpaid';
                        } else if (sale.payment_status === 'partial') {
                          statusColor = 'bg-yellow-100 text-yellow-700';
                          statusLabel = 'Partial';
                        }

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-600">{rowNumber}</td>
                            <td className="p-2 font-medium text-primary-600">{sale.invoice_number}</td>
                            <td className="p-2">
                              {isFirstInGroup && (
                                <span className="font-medium text-slate-900">{retailerGroup.retailer_name}</span>
                              )}
                            </td>
                            <td className="p-2 text-right font-medium text-slate-700">
                              ৳ {previousDue.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-medium text-blue-600">
                              ৳ {currentBill.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-bold text-red-600">
                              ৳ {totalOutstanding.toLocaleString()}
                            </td>
                            <td className="p-2 text-center text-slate-600">
                              {sale.items?.length || 0}
                            </td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-2 font-bold text-slate-900 text-right">TOTAL:</td>
                    <td className="p-2 text-right font-bold text-slate-700">
                      ৳ {totalPreviousDue.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-blue-600">
                      ৳ {totalCurrentBill.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      ৳ {totalOutstanding.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Print Button Footer */}
          <div className="p-3 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setShowBulkPrint(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print All Invoices ({sales.length})
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Print Modal */}
      {showBulkPrint && routeDetails && (
        <BulkChallanPrint
          route={routeDetails}
          onClose={() => setShowBulkPrint(false)}
        />
      )}
    </>
  );
}
