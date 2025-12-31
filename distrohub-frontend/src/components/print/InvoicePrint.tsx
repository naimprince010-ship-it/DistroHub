import { useRef } from 'react';
import { X } from 'lucide-react';

interface InvoiceItem {
  product: string;
  qty: number;
  price: number;
  discount?: number;
}

interface InvoiceData {
  invoice_number: string;
  order_date: string;
  retailer_name: string;
  retailer_address?: string;
  retailer_phone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
}

interface InvoicePrintProps {
  data: InvoiceData;
  onClose: () => void;
}

export function InvoicePrint({ data, onClose }: InvoicePrintProps) {
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
          <title>Invoice - ${data.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px;
              color: #1e293b;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #4f46e5; margin-bottom: 5px; }
            .company-tagline { font-size: 14px; color: #64748b; }
            .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0 10px; color: #0f172a; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .meta-section { flex: 1; }
            .meta-section h3 { font-size: 14px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
            .meta-section p { font-size: 14px; margin-bottom: 4px; }
            .meta-section .highlight { font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .totals-row.total { border-top: 2px solid #0f172a; border-bottom: none; font-weight: bold; font-size: 18px; }
            .totals-row.due { color: #dc2626; }
            .totals-row.paid { color: #16a34a; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #0f172a; margin-top: 50px; padding-top: 8px; font-size: 12px; }
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-200 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-900">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary"
            >
              Print Invoice
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6" ref={printRef}>
          <div className="invoice-container">
            <div className="header">
              <div className="company-name">DistroHub</div>
              <div className="company-tagline">Grocery Distribution Management System</div>
              <div className="invoice-title">INVOICE</div>
            </div>

            <div className="invoice-meta">
              <div className="meta-section">
                <h3>Bill To</h3>
                <p className="highlight">{data.retailer_name}</p>
                {data.retailer_address && <p>{data.retailer_address}</p>}
                {data.retailer_phone && <p>Phone: {data.retailer_phone}</p>}
              </div>
              <div className="meta-section" style={{ textAlign: 'right' }}>
                <h3>Invoice Details</h3>
                <p><span className="highlight">Invoice #:</span> {data.invoice_number}</p>
                <p><span className="highlight">Date:</span> {data.order_date}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>#</th>
                  <th style={{ width: '40%' }}>Product</th>
                  <th className="text-center" style={{ width: '15%' }}>Quantity</th>
                  <th className="text-right" style={{ width: '15%' }}>Unit Price</th>
                  <th className="text-right" style={{ width: '20%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.product}</td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-right">৳ {item.price.toLocaleString()}</td>
                    <td className="text-right">৳ {(item.qty * item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>৳ {data.subtotal.toLocaleString()}</span>
              </div>
              {data.discount > 0 && (
                <div className="totals-row">
                  <span>Discount</span>
                  <span>- ৳ {data.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="totals-row total">
                <span>Total</span>
                <span>৳ {data.total_amount.toLocaleString()}</span>
              </div>
              <div className="totals-row paid">
                <span>Paid Amount</span>
                <span>৳ {data.paid_amount.toLocaleString()}</span>
              </div>
              <div className="totals-row due">
                <span>Due Amount</span>
                <span>৳ {data.due_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="signature-section">
              <div className="signature-box">
                <div className="signature-line">Customer Signature</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">Authorized Signature</div>
              </div>
            </div>

            <div className="footer">
              <p>Thank you for your business!</p>
              <p style={{ marginTop: '8px' }}>DistroHub - Your Trusted Distribution Partner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
