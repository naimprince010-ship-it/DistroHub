import { useState, useEffect } from 'react';
import { ChallanPrint } from './ChallanPrint';
import api from '@/lib/api';

interface Route {
  id: string;
  route_number: string;
  sales?: any[];
  route_sales?: any[];
}

interface BulkChallanPrintProps {
  route: Route;
  onClose: () => void;
}

export function BulkChallanPrint({ route, onClose }: BulkChallanPrintProps) {
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/routes/${route.id}`);
        setRouteDetails(response.data);
      } catch (error) {
        console.error('[BulkChallanPrint] Error fetching route details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteDetails();
  }, [route.id]);

  if (loading || !routeDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">Loading challans...</div>
      </div>
    );
  }

  const sales = routeDetails.sales || [];
  const routeSales = routeDetails.route_sales || [];

  if (sales.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-slate-600">No sales found in this route.</p>
          <button onClick={onClose} className="btn-primary mt-4">Close</button>
        </div>
      </div>
    );
  }

  const currentSale = sales[currentIndex];
  const routeSale = routeSales.find((rs: any) => rs.sale_id === currentSale.id);
  const previousDue = routeSale?.previous_due || 0;

  const handleNext = () => {
    if (currentIndex < sales.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Prepare challan data
  const challanData = {
    challan_number: `CH-${currentSale.invoice_number.replace('INV-', '')}`,
    order_number: currentSale.invoice_number,
    date: currentSale.created_at ? currentSale.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    delivery_date: currentSale.delivery_date || currentSale.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    retailer_name: currentSale.retailer_name,
    retailer_id: currentSale.retailer_id,
    items: (currentSale.items || []).map((item: any) => ({
      product: item.product_name,
      qty: item.quantity,
      unit: 'Pcs',
      pack_size: 'Pcs',
      unit_price: item.unit_price,
      bonus_qty: 0,
      discount: item.discount || 0,
      discount_amount: (item.unit_price * item.quantity * (item.discount || 0)) / 100,
    })),
    total_items: currentSale.items?.length || 0,
    total_amount: currentSale.total_amount,
    paid_amount: currentSale.paid_amount || 0,
    due_amount: currentSale.due_amount || 0,
    payment_status: currentSale.payment_status || 'unpaid',
    challan_type: 'Normal' as const,
    delivery_status: currentSale.delivery_status || 'pending',
    distributor_name: 'DistroHub',
    route_name: 'Main Route',
    route_number: routeDetails.route_number,
    sr_name: routeDetails.assigned_to_name,
    sr_id: routeDetails.assigned_to,
    previous_due: previousDue,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto relative">
        {/* Navigation Bar */}
        <div className="sticky top-0 bg-white p-3 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Challan {currentIndex + 1} of {sales.length} - {currentSale.invoice_number}
            </span>
            <button
              onClick={handleNext}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded"
            >
              {currentIndex === sales.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
          >
            Close All
          </button>
        </div>

        {/* Challan Print Component */}
        <ChallanPrint data={challanData} onClose={handleNext} />
      </div>
    </div>
  );
}
