export type UserRole = 'admin' | 'sr' | 'dsr';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  sr_guarantee_limit?: number;
  sr_guarantee_enforcement?: 'off' | 'warn' | 'block';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unit_id?: string;
  base_uom?: string;
  template_id?: string;
  variant_id?: string;
  variant_attributes?: Record<string, string>;
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
  market_route_id?: string;
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
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  uom?: string;
  uom_quantity?: number;
  price_list_id?: string;
  base_price?: number;
  resolved_price?: number;
  price_source?: string;
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
  route_id?: string;  // Route ID if payment is for a sale in a route
  route_number?: string;  // Route number (enriched from route)
  invoice_number?: string;  // Invoice number (enriched from sale)
  notes?: string;
  created_at: string;
  approval_status?: 'pending_approval' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface SrLiabilitySummary {
  sr_user_id: string;
  sr_name?: string | null;
  open_sr_backed_due: number;
  adjustments_total: number;
  net_exposure: number;
  guarantee_limit: number;
  enforcement: string;
}

export interface SrRiskAdjustment {
  id: string;
  sr_user_id: string;
  amount: number;
  adjustment_type: string;
  reference_sale_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
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

export interface ProductTemplate {
  id: string;
  product_id: string;
  name: string;
  base_uom?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  template_id: string;
  product_id: string;
  sku: string;
  name: string;
  is_default: boolean;
  attributes: Record<string, string>;
  created_at: string;
}

export interface UomConversion {
  id: string;
  product_id: string;
  from_uom: string;
  to_uom: string;
  factor: number;
  rounding_mode: string;
  created_at: string;
}

export interface PriceList {
  id: string;
  name: string;
  currency: string;
  priority: number;
  is_active: boolean;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  variant_id?: string;
  uom?: string;
  min_qty: number;
  unit_price: number;
  discount_percent: number;
  created_at: string;
}

export interface ReorderSuggestion {
  id: string;
  product_id: string;
  product_name?: string;
  suggested_qty: number;
  trigger_reason?: string;
  stock_on_hand: number;
  reorder_level: number;
  avg_daily_sales: number;
  coverage_days: number;
  created_at: string;
}

export interface ReceivableAgingRow {
  retailer_id: string;
  retailer_name: string;
  total_due: number;
  current: number;
  bucket_8_15: number;
  bucket_16_30: number;
  bucket_31_60: number;
  bucket_60_plus: number;
}

export interface CreditCheckResponse {
  retailer_id: string;
  retailer_name?: string;
  credit_limit: number;
  current_due: number;
  new_order_amount: number;
  projected_due: number;
  over_limit_amount: number;
  enforcement_mode: string;
  can_submit: boolean;
  reason?: string;
}

export interface MarginReportRow {
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

export interface MarginReportSummary {
  total_net_sales: number;
  total_cogs: number;
  total_margin: number;
  margin_percent: number;
  rows: MarginReportRow[];
}