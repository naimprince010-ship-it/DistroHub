import { useRef } from 'react';
import { X } from 'lucide-react';

interface ChallanItem {
  product: string;
  qty: number;
  unit?: string;
}

interface ChallanData {
  challan_number: string;
  order_number: string;
  date: string;
  delivery_date: string;
  retailer_name: string;
  retailer_address?: string;
  retailer_phone?: string;
  retailer_area?: string;
  items: ChallanItem[];
  total_items: number;
  notes?: string;
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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px;
              color: #1e293b;
            }
            .challan-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; }
            .company-name { font-size: 28px; font-weight: bold; color: #4f46e5; margin-bottom: 5px; }
            .company-tagline { font-size: 14px; color: #64748b; }
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
            .challan-meta { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 20px; }
            .meta-section { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-section h3 { font-size: 12px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-section p { font-size: 14px; margin-bottom: 6px; }
            .meta-section .highlight { font-weight: 600; color: #0f172a; font-size: 16px; }
            .meta-section .label { color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { 
              background: #4f46e5; 
              color: white;
              padding: 12px; 
              text-align: left; 
              font-size: 12px; 
              text-transform: uppercase; 
            }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            tr:nth-child(even) { background: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { background: #f1f5f9; font-weight: bold; }
            .total-row td { border-top: 2px solid #4f46e5; }
            .notes-section { 
              background: #fffbeb; 
              border: 1px solid #fcd34d; 
              border-radius: 8px; 
              padding: 15px; 
              margin-bottom: 20px;
            }
            .notes-section h4 { font-size: 12px; color: #92400e; margin-bottom: 8px; text-transform: uppercase; }
            .notes-section p { font-size: 14px; color: #78350f; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-box { text-align: center; width: 180px; }
            .signature-line { border-top: 1px solid #0f172a; margin-top: 60px; padding-top: 8px; font-size: 11px; }
            .delivery-info { 
              display: flex; 
              gap: 20px; 
              margin-bottom: 20px; 
              background: #ecfdf5; 
              padding: 15px; 
              border-radius: 8px;
              border: 1px solid #6ee7b7;
            }
            .delivery-info div { flex: 1; }
            .delivery-info .label { font-size: 11px; color: #047857; text-transform: uppercase; }
            .delivery-info .value { font-size: 16px; font-weight: 600; color: #065f46; }
            .checkbox-row { display: flex; align-items: center; gap: 8px; margin-top: 15px; }
            .checkbox { width: 18px; height: 18px; border: 2px solid #64748b; border-radius: 4px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
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

  const totalQuantity = data.items.reduce((sum, item) => sum + item.qty, 0);

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
          <div className="challan-container">
            <div className="header">
              <div className="company-name">DistroHub</div>
              <div className="company-tagline">Grocery Distribution Management System</div>
              <div className="challan-title">Delivery Challan</div>
            </div>

            <div className="delivery-info">
              <div>
                <div className="label">Challan No.</div>
                <div className="value">{data.challan_number}</div>
              </div>
              <div>
                <div className="label">Order No.</div>
                <div className="value">{data.order_number}</div>
              </div>
              <div>
                <div className="label">Date</div>
                <div className="value">{data.date}</div>
              </div>
              <div>
                <div className="label">Delivery Date</div>
                <div className="value">{data.delivery_date}</div>
              </div>
            </div>

            <div className="challan-meta">
              <div className="meta-section">
                <h3>Deliver To</h3>
                <p className="highlight">{data.retailer_name}</p>
                {data.retailer_address && <p>{data.retailer_address}</p>}
                {data.retailer_area && <p><span className="label">Area:</span> {data.retailer_area}</p>}
                {data.retailer_phone && <p><span className="label">Phone:</span> {data.retailer_phone}</p>}
              </div>
              <div className="meta-section">
                <h3>Shipping Details</h3>
                <p><span className="label">Total Items:</span> <span className="highlight">{data.items.length}</span></p>
                <p><span className="label">Total Quantity:</span> <span className="highlight">{totalQuantity}</span></p>
                <p><span className="label">Delivery Status:</span> Pending</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>SL</th>
                  <th style={{ width: '55%' }}>Product Description</th>
                  <th className="text-center" style={{ width: '15%' }}>Unit</th>
                  <th className="text-center" style={{ width: '20%' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.product}</td>
                    <td className="text-center">{item.unit || 'Pcs'}</td>
                    <td className="text-center" style={{ fontWeight: 600 }}>{item.qty}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3} className="text-right">Total Quantity:</td>
                  <td className="text-center">{totalQuantity}</td>
                </tr>
              </tbody>
            </table>

            {data.notes && (
              <div className="notes-section">
                <h4>Special Instructions</h4>
                <p>{data.notes}</p>
              </div>
            )}

            <div className="checkbox-row">
              <div className="checkbox"></div>
              <span style={{ fontSize: '13px' }}>I confirm that I have received all items listed above in good condition.</span>
            </div>

            <div className="signature-section">
              <div className="signature-box">
                <div className="signature-line">Prepared By</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">Delivery Person</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">Received By</div>
              </div>
            </div>

            <div className="footer">
              <p>This is a computer-generated document. No signature required from issuer.</p>
              <p style={{ marginTop: '5px' }}>DistroHub - Your Trusted Distribution Partner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
