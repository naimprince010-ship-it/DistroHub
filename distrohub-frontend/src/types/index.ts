export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sales_rep';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  pack_size: number;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  batch_number?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  area: string;
  district: string;
  credit_limit: number;
  current_due: number;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  supplier_name: string;
  invoice_number: string;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  items: PurchaseItem[];
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  batch_number: string;
  expiry_date: string;
  total: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  retailer_id: string;
  retailer_name: string;
  order_date: string;
  delivery_date?: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  items: SalesOrderItem[];
  assigned_to?: string;  // User ID of SR/delivery man assigned to collect payment
  assigned_to_name?: string;  // Name of assigned SR/delivery man
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  retailer_id: string;
  retailer_name: string;
  sale_id?: string;
  order_id?: string;
  amount: number;
  payment_date?: string;
  payment_method: 'cash' | 'bank' | 'mobile';
  reference?: string;
  collected_by?: string;  // User ID of SR/delivery man who collected this payment
  collected_by_name?: string;  // Name of SR/delivery man who collected this payment
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  total_sales: number;
  total_due: number;
  total_products: number;
  total_retailers: number;
  expiring_soon: number;
  low_stock: number;
}

// SMS Notification Types
export type SmsEventType = 'low_stock' | 'expiry_alert' | 'payment_due' | 'new_order';
export type SmsDeliveryMode = 'immediate' | 'queued';
export type SmsStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'delivered' | 'undelivered';

export interface SmsSettings {
  id: string;
  user_id?: string;
  role?: string;
  event_type: SmsEventType;
  enabled: boolean;
  delivery_mode: SmsDeliveryMode;
  recipients: string[];
  created_at: string;
  updated_at: string;
}

export interface SmsSettingsCreate {
  event_type: SmsEventType;
  enabled?: boolean;
  delivery_mode?: SmsDeliveryMode;
  recipients?: string[];
}

export interface SmsTemplate {
  id: string;
  event_type: SmsEventType;
  template_text: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmsTemplateCreate {
  event_type: SmsEventType;
  template_text: string;
  variables?: string[];
  is_default?: boolean;
}

export interface SmsLog {
  id: string;
  recipient_phone: string;
  message: string;
  event_type: SmsEventType;
  status: SmsStatus;
  trxn_id?: string;
  delivery_status?: string;
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
}

export interface SmsSendRequest {
  recipient_phone: string;
  message: string;
  event_type?: SmsEventType;
}

// Collection Report Types
export interface CollectionReport {
  user_id: string;
  user_name: string;
  total_orders_assigned: number;
  total_sales_amount: number;
  total_collected_amount: number;
  total_returns: number;
  current_pending_amount: number;
  collection_rate: number;  // Percentage
  payment_history: Payment[];
}

export interface CollectionReportSummary {
  total_srs: number;
  total_pending: number;
  reports: CollectionReport[];
}