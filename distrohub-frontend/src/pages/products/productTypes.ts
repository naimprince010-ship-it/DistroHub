export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  pack_size: number;
  pieces_per_carton: number;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  batch_number: string;
  expiry_date: string;
  supplier: string;
  vat_inclusive: boolean;
  vat_rate: number;
  image_url: string;
}
