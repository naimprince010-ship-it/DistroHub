import { useRef } from 'react';
import { X } from 'lucide-react';

interface ChallanItem {
  product: string;
  qty: number;
  unit?: string;
  pack_size?: string;
  unit_price?: number;
  bonus_qty?: number;
  discount?: number;
  discount_amount?: number;
}

interface ChallanData {
  challan_number: string;
  order_number: string;
  date: string;
  delivery_date: string;
  retailer_name: string;
  retailer_id?: string;
  retailer_address?: string;
  retailer_phone?: string;
  retailer_area?: string;
  items: ChallanItem[];
  total_items: number;
  total_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  challan_type?: 'Normal' | 'Return';
  notes?: string;
  delivery_status?: 'pending' | 'delivered' | 'partially_delivered' | 'returned';
  // Distribution Info
  distributor_name?: string;
  route_name?: string;
  route_code?: string;
  sr_name?: string;
  sr_id?: string;
}

interface ChallanPrintProps {
  data: ChallanData;
  onClose: () => void;
}

export function ChallanPrint({ data, onClose }: ChallanPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challan - ${data.challan_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: A4;
              margin: 15mm;
            }
            body { 
              font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              padding: 0;
              color: #1e293b;
              background: white;
            }
            .challan-container { 
              max-width: 210mm; 
              width: 100%;
              margin: 0 auto; 
              padding: 15mm;
              background: white;
            }
            .invoice-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
            }
            .invoice-meta { 
              text-align: right; 
            }
            .invoice-meta .meta-row { 
              margin-bottom: 6px; 
              font-size: 12px;
            }
            .invoice-meta .meta-label { 
              color: #6b7280; 
              font-weight: 500;
            }
            .invoice-meta .meta-value { 
              color: #111827; 
              font-weight: 600;
              margin-left: 8px;
            }
            .invoice-type-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .invoice-type-badge.normal {
              background: #dbeafe;
              color: #1e40af;
            }
            .invoice-type-badge.return {
              background: #fee2e2;
              color: #991b1b;
            }
            .header-section { 
              display: flex; 
              justify-content: space-between; 
              gap: 30px; 
              margin-bottom: 25px; 
            }
            .retailer-section, .distribution-section { 
              flex: 1; 
              background: #f9fafb; 
              padding: 16px; 
              border-radius: 6px; 
              border: 1px solid #e5e7eb; 
            }
            .section-title { 
              font-size: 11px; 
              color: #6b7280; 
              margin-bottom: 10px; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              font-weight: 600;
            }
            .section-content p { 
              font-size: 13px; 
              margin-bottom: 6px; 
              line-height: 1.5;
              color: #111827;
            }
            .section-content .label { 
              color: #6b7280; 
              font-size: 12px; 
              font-weight: 500;
            }
            .section-content .value { 
              color: #111827; 
              font-weight: 600;
              margin-left: 6px;
            }
            .header-two-column { 
              display: flex; 
              justify-content: space-between; 
              gap: 30px; 
              margin-bottom: 30px; 
            }
            .header-left, .header-right { flex: 1; }
            .deliver-to-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #e2e8f0; 
            }
            .deliver-to-section h3 { 
              font-size: 12px; 
              color: #64748b; 
              margin-bottom: 12px; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              font-weight: 600;
            }
            .deliver-to-section p { 
              font-size: 14px; 
              margin-bottom: 8px; 
              line-height: 1.6;
            }
            .deliver-to-section .highlight { 
              font-weight: 600; 
              color: #0f172a; 
              font-size: 16px; 
            }
            .deliver-to-section .label { 
              color: #64748b; 
              font-size: 12px; 
            }
            .metadata-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #e2e8f0; 
            }
            .metadata-section h3 { 
              font-size: 12px; 
              color: #64748b; 
              margin-bottom: 12px; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              font-weight: 600;
            }
            .metadata-section .meta-item { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              padding-bottom: 8px; 
              border-bottom: 1px solid #e2e8f0; 
            }
            .metadata-section .meta-item:last-child { 
              border-bottom: none; 
              margin-bottom: 0; 
            }
            .metadata-section .meta-label { 
              color: #64748b; 
              font-size: 13px; 
            }
            .metadata-section .meta-value { 
              font-weight: 600; 
              color: #0f172a; 
              font-size: 14px; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 12px; 
              font-size: 11px; 
              font-weight: 600; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
            }
            .status-badge.pending { 
              background: #fed7aa; 
              color: #9a3412; 
              border: 1px solid #fdba74; 
            }
            .status-badge.delivered { 
              background: #bbf7d0; 
              color: #166534; 
              border: 1px solid #86efac; 
            }
            .status-badge.partially_delivered { 
              background: #fef08a; 
              color: #854d0e; 
              border: 1px solid #fde047; 
            }
            .status-badge.returned { 
              background: #fecaca; 
              color: #991b1b; 
              border: 1px solid #fca5a5; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              border: 1px solid #ddd;
            }
            th { 
              background: #f4f4f4; 
              color: #1e293b;
              padding: 14px 12px; 
              text-align: left; 
              font-size: 13px; 
              font-weight: 700;
              text-transform: uppercase; 
              border: 1px solid #ddd;
              letter-spacing: 0.5px;
            }
            td { 
              padding: 14px 12px; 
              border: 1px solid #ddd; 
              font-size: 14px; 
              vertical-align: middle;
            }
            tbody tr { 
              height: 50px; 
            }
            tbody tr:nth-child(even) { 
              background: #fafafa; 
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { 
              background: #f1f5f9 !important; 
              font-weight: 700; 
            }
            .total-row td { 
              border-top: 3px double #4f46e5; 
              border-bottom: 3px double #4f46e5; 
              padding: 16px 12px; 
            }
            .notes-section { 
              background: #fffbeb; 
              border: 1px solid #fcd34d; 
              border-radius: 8px; 
              padding: 15px; 
              margin-bottom: 20px;
            }
            .notes-section h4 { font-size: 12px; color: #92400e; margin-bottom: 8px; text-transform: uppercase; }
            .notes-section p { font-size: 14px; color: #78350f; }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 11px; 
              color: #64748b; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 15px; 
            }
            .footer .print-datetime { 
              margin-bottom: 10px; 
              font-weight: 500; 
            }
            .signature-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 50px; 
              gap: 20px;
            }
            .signature-box { 
              text-align: center; 
              flex: 1; 
            }
            .signature-line { 
              border-top: 2px dotted #0f172a; 
              margin-top: 60px; 
              padding-top: 8px; 
              font-size: 12px; 
              font-weight: 500;
            }
            .checkbox-row { 
              display: flex; 
              align-items: center; 
              gap: 8px; 
              margin-top: 15px; 
            }
            .checkbox { 
              width: 18px; 
              height: 18px; 
              border: 2px solid #64748b; 
              border-radius: 4px; 
            }
            .payment-summary { 
              background: #f9fafb; 
              border: 1px solid #e5e7eb; 
              border-radius: 6px; 
              padding: 16px; 
              margin-bottom: 20px;
            }
            .payment-summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              font-size: 13px;
            }
            .payment-summary-row:last-child { 
              margin-bottom: 0; 
              padding-top: 10px;
              border-top: 2px solid #d1d5db;
              font-weight: 700;
              font-size: 14px;
            }
            .payment-status-badge {
              display: inline-block;
              padding: 6px 14px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .disclaimer { 
              background: #fef3c7; 
              border: 1px solid #fcd34d; 
              border-radius: 6px; 
              padding: 12px; 
              margin-bottom: 20px;
              font-size: 11px;
              color: #92400e;
              text-align: center;
              font-weight: 500;
            }
            @media print {
              body { padding: 0; margin: 0; }
              .no-print { display: none !important; }
              .challan-container { 
                padding: 15mm; 
                max-width: 100%;
                width: 100%;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
              table { page-break-inside: avoid; }
              .signature-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const paymentStatus = data.payment_status || 'unpaid';
  const challanType = data.challan_type || 'Normal';
  const totalAmount = data.total_amount || 0;
  const paidAmount = data.paid_amount || 0;
  const dueAmount = data.due_amount || (totalAmount - paidAmount);
  const printDateTime = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
      case 'partially_delivered':
        return 'Partially Delivered';
      case 'returned':
        return 'Returned';
      default:
        return 'Pending';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return { label: 'Paid', class: 'paid', bg: '#bbf7d0', color: '#166534', border: '#86efac' };
      case 'partial':
        return { label: 'Partial', class: 'partial', bg: '#fef08a', color: '#854d0e', border: '#fde047' };
      case 'unpaid':
      default:
        return { label: 'Unpaid', class: 'unpaid', bg: '#fecaca', color: '#991b1b', border: '#fca5a5' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-900">Delivery Challan Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary"
            >
              Print Challan
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6" ref={printRef}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap');
            .challan-container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px; 
              font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #4f46e5; 
              padding-bottom: 15px; 
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #4f46e5; 
              margin-bottom: 5px; 
            }
            .company-tagline { 
              font-size: 14px; 
              color: #64748b; 
            }
            .challan-title { 
              font-size: 22px; 
              font-weight: bold; 
              margin: 15px 0; 
              color: #0f172a;
              background: #f1f5f9;
              padding: 10px;
              border-radius: 8px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header-two-column { 
              display: flex; 
              justify-content: space-between; 
              gap: 30px; 
              margin-bottom: 30px; 
            }
            .header-left, .header-right { 
              flex: 1; 
            }
            .deliver-to-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #e2e8f0; 
            }
            .deliver-to-section h3 { 
              font-size: 12px; 
              color: #64748b; 
              margin-bottom: 12px; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              font-weight: 600;
            }
            .deliver-to-section p { 
              font-size: 14px; 
              margin-bottom: 8px; 
              line-height: 1.6;
            }
            .deliver-to-section .highlight { 
              font-weight: 600; 
              color: #0f172a; 
              font-size: 16px; 
            }
            .deliver-to-section .label { 
              color: #64748b; 
              font-size: 12px; 
            }
            .metadata-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #e2e8f0; 
            }
            .metadata-section h3 { 
              font-size: 12px; 
              color: #64748b; 
              margin-bottom: 12px; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              font-weight: 600;
            }
            .metadata-section .meta-item { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
              padding-bottom: 8px; 
              border-bottom: 1px solid #e2e8f0; 
            }
            .metadata-section .meta-item:last-child { 
              border-bottom: none; 
              margin-bottom: 0; 
            }
            .metadata-section .meta-label { 
              color: #64748b; 
              font-size: 13px; 
            }
            .metadata-section .meta-value { 
              font-weight: 600; 
              color: #0f172a; 
              font-size: 14px; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 12px; 
              font-size: 11px; 
              font-weight: 600; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
            }
            .status-badge.pending { 
              background: #fed7aa; 
              color: #9a3412; 
              border: 1px solid #fdba74; 
            }
            .status-badge.delivered { 
              background: #bbf7d0; 
              color: #166534; 
              border: 1px solid #86efac; 
            }
            .status-badge.partially_delivered { 
              background: #fef08a; 
              color: #854d0e; 
              border: 1px solid #fde047; 
            }
            .status-badge.returned { 
              background: #fecaca; 
              color: #991b1b; 
              border: 1px solid #fca5a5; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              border: 1px solid #ddd;
            }
            th { 
              background: #f4f4f4; 
              color: #1e293b;
              padding: 14px 12px; 
              text-align: left; 
              font-size: 13px; 
              font-weight: 700;
              text-transform: uppercase; 
              border: 1px solid #ddd;
              letter-spacing: 0.5px;
            }
            td { 
              padding: 14px 12px; 
              border: 1px solid #ddd; 
              font-size: 14px; 
              vertical-align: middle;
            }
            tbody tr { 
              height: 50px; 
            }
            tbody tr:nth-child(even) { 
              background: #fafafa; 
            }
            .text-right { 
              text-align: right; 
            }
            .text-center { 
              text-align: center; 
            }
            .total-row { 
              background: #f1f5f9 !important; 
              font-weight: 700; 
            }
            .total-row td { 
              border-top: 3px double #4f46e5; 
              border-bottom: 3px double #4f46e5; 
              padding: 16px 12px; 
            }
            .notes-section { 
              background: #fffbeb; 
              border: 1px solid #fcd34d; 
              border-radius: 8px; 
              padding: 15px; 
              margin-bottom: 20px;
            }
            .notes-section h4 { 
              font-size: 12px; 
              color: #92400e; 
              margin-bottom: 8px; 
              text-transform: uppercase; 
            }
            .notes-section p { 
              font-size: 14px; 
              color: #78350f; 
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 11px; 
              color: #64748b; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 15px; 
            }
            .footer .print-datetime { 
              margin-bottom: 10px; 
              font-weight: 500; 
            }
            .signature-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 50px; 
              gap: 20px;
            }
            .signature-box { 
              text-align: center; 
              flex: 1; 
            }
            .signature-line { 
              border-top: 2px dotted #0f172a; 
              margin-top: 60px; 
              padding-top: 8px; 
              font-size: 12px; 
              font-weight: 500;
            }
            .checkbox-row { 
              display: flex; 
              align-items: center; 
              gap: 8px; 
              margin-top: 15px; 
            }
            .checkbox { 
              width: 18px; 
              height: 18px; 
              border: 2px solid #64748b; 
              border-radius: 4px; 
            }
          `}</style>
          <div className="challan-container">
            {/* Invoice Header with Meta Info Top-Right */}
            <div className="invoice-header">
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4f46e5', marginBottom: '4px' }}>DistroHub</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Grocery Distribution Management System</div>
              </div>
              <div className="invoice-meta">
                <div className="meta-row">
                  <span className="meta-label">Invoice/Challan No:</span>
                  <span className="meta-value">{data.challan_number}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{data.date}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Type:</span>
                  <span className={`invoice-type-badge ${challanType.toLowerCase()}`}>
                    {challanType}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Section: Retailer Info Left, Distribution Info Right */}
            <div className="header-section">
              <div className="retailer-section">
                <div className="section-title">Retailer Information</div>
                <div className="section-content">
                  <p><span className="label">Name:</span><span className="value">{data.retailer_name}</span></p>
                  {data.retailer_id && <p><span className="label">ID:</span><span className="value">{data.retailer_id}</span></p>}
                  {data.retailer_address && <p>{data.retailer_address}</p>}
                  {data.retailer_phone && <p><span className="label">Contact:</span><span className="value">{data.retailer_phone}</span></p>}
                </div>
              </div>
              <div className="distribution-section">
                <div className="section-title">Distribution Information</div>
                <div className="section-content">
                  {data.distributor_name && <p><span className="label">Distributor:</span><span className="value">{data.distributor_name}</span></p>}
                  {data.route_name && <p><span className="label">Route:</span><span className="value">{data.route_name}</span></p>}
                  {data.route_code && <p><span className="label">Route Code:</span><span className="value">{data.route_code}</span></p>}
                  {data.sr_name && <p><span className="label">SR Name:</span><span className="value">{data.sr_name}</span></p>}
                  {data.sr_id && <p><span className="label">SR ID:</span><span className="value">{data.sr_id}</span></p>}
                </div>
              </div>
            </div>

            {/* Product Table with Square Format */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>S/N</th>
                  <th style={{ width: '30%' }}>Product Name</th>
                  <th style={{ width: '12%' }}>Pack Size</th>
                  <th className="text-right" style={{ width: '12%' }}>Unit Price</th>
                  <th className="text-center" style={{ width: '10%' }}>Qty</th>
                  <th className="text-center" style={{ width: '10%' }}>Bonus Qty</th>
                  <th className="text-right" style={{ width: '11%' }}>Discount</th>
                  <th className="text-right" style={{ width: '10%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => {
                  const unitPrice = item.unit_price || 0;
                  const discount = item.discount || 0;
                  const discountAmount = item.discount_amount || (unitPrice * item.qty * discount / 100);
                  const amount = (unitPrice * item.qty) - discountAmount;
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.product}</td>
                      <td>{item.pack_size || item.unit || 'N/A'}</td>
                      <td className="text-right">{unitPrice > 0 ? unitPrice.toFixed(2) : '-'}</td>
                      <td className="text-center" style={{ fontWeight: 600 }}>{item.qty}</td>
                      <td className="text-center">{item.bonus_qty || '-'}</td>
                      <td className="text-right">{discountAmount > 0 ? discountAmount.toFixed(2) : '-'}</td>
                      <td className="text-right" style={{ fontWeight: 600 }}>{amount > 0 ? amount.toFixed(2) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Payment & Status Summary */}
            <div className="payment-summary">
              <div className="payment-summary-row">
                <span>Total Amount:</span>
                <span style={{ fontWeight: 600 }}>৳{totalAmount.toFixed(2)}</span>
              </div>
              <div className="payment-summary-row">
                <span>Paid Amount:</span>
                <span style={{ fontWeight: 600 }}>৳{paidAmount.toFixed(2)}</span>
              </div>
              <div className="payment-summary-row">
                <span>Due Amount:</span>
                <span style={{ fontWeight: 600, color: dueAmount > 0 ? '#dc2626' : '#16a34a' }}>
                  ৳{dueAmount.toFixed(2)}
                </span>
              </div>
              <div className="payment-summary-row">
                <span>Payment Status:</span>
                <span>
                  <span 
                    className="payment-status-badge"
                    style={{
                      background: getPaymentStatusBadge(paymentStatus).bg,
                      color: getPaymentStatusBadge(paymentStatus).color,
                      border: `1px solid ${getPaymentStatusBadge(paymentStatus).border}`
                    }}
                  >
                    {getPaymentStatusBadge(paymentStatus).label}
                  </span>
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer">
              ⚠️ Dokane pora o idurer katan mal ferot neya hoy na
            </div>

            {/* Three-Column Signature Layout */}
            <div className="signature-section">
              <div className="signature-box">
                <div className="signature-line">Prepared By</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">Delivery Person</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">Received By (Customer Signature)</div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <p className="print-datetime">Print Date & Time: {printDateTime}</p>
              <p>This is a computer-generated document. No signature required from issuer.</p>
              <p style={{ marginTop: '5px' }}>DistroHub - Your Trusted Distribution Partner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
