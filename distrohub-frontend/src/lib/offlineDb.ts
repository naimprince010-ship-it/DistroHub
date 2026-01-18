import { openDB } from 'idb';

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  expiry_date: string;
  synced: boolean;
  lastModified: number;
}

export interface RetailerRecord {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  area: string;
  address: string;
  market_route_id?: string | null;
  credit_limit: number;
  current_due: number;
  synced: boolean;
  lastModified: number;
}

export interface SaleRecord {
  id: string;
  retailer_id: string;
  retailer_name: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  sale_date: string;
  synced: boolean;
  lastModified: number;
}

export interface PurchaseRecord {
  id: string;
  supplier_id: string;
  supplier_name: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  purchase_date: string;
  synced: boolean;
  lastModified: number;
}

export interface PendingSyncRecord {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'products' | 'retailers' | 'sales' | 'purchases';
  data: unknown;
  timestamp: number;
}

const DB_NAME = 'distrohub-offline';
const DB_VERSION = 2;

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('retailers')) {
        const retailerStore = db.createObjectStore('retailers', { keyPath: 'id' });
        retailerStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('purchases')) {
        const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
        purchaseStore.createIndex('by-synced', 'synced');
      }

      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { keyPath: 'id' });
      }
    },
  });
}

export async function saveProduct(product: ProductRecord) {
  const db = await getDb();
  await db.put('products', { ...product, lastModified: Date.now() });
}

export async function getProducts(): Promise<ProductRecord[]> {
  const db = await getDb();
  return db.getAll('products');
}

export async function saveRetailer(retailer: RetailerRecord) {
  const db = await getDb();
  await db.put('retailers', { ...retailer, lastModified: Date.now() });
}

export async function getRetailers(): Promise<RetailerRecord[]> {
  const db = await getDb();
  return db.getAll('retailers');
}

export async function saveSale(sale: SaleRecord) {
  const db = await getDb();
  await db.put('sales', { ...sale, lastModified: Date.now() });
}

export async function getSales(): Promise<SaleRecord[]> {
  const db = await getDb();
  return db.getAll('sales');
}

export async function savePurchase(purchase: PurchaseRecord) {
  const db = await getDb();
  await db.put('purchases', { ...purchase, lastModified: Date.now() });
}

export async function getPurchases(): Promise<PurchaseRecord[]> {
  const db = await getDb();
  return db.getAll('purchases');
}

export async function deleteRecord(storeName: 'products' | 'retailers' | 'sales' | 'purchases', id: string) {
  const db = await getDb();
  await db.delete(storeName, id);
}

export async function addPendingSync(action: Omit<PendingSyncRecord, 'id' | 'timestamp'>) {
  const db = await getDb();
  const id = `${action.entity}-${action.type}-${Date.now()}`;
  await db.put('pendingSync', {
    ...action,
    id,
    timestamp: Date.now(),
  });
}

export async function getPendingSync(): Promise<PendingSyncRecord[]> {
  const db = await getDb();
  return db.getAll('pendingSync');
}

export async function clearPendingSync(id: string) {
  const db = await getDb();
  await db.delete('pendingSync', id);
}

export async function clearAllPendingSync() {
  const db = await getDb();
  await db.clear('pendingSync');
}

export async function bulkSaveProducts(products: ProductRecord[]) {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all([
    ...products.map(p => tx.store.put({ ...p, synced: true, lastModified: Date.now() })),
    tx.done,
  ]);
}

export async function bulkSaveRetailers(retailers: RetailerRecord[]) {
  const db = await getDb();
  const tx = db.transaction('retailers', 'readwrite');
  await Promise.all([
    ...retailers.map(r => tx.store.put({ ...r, synced: true, lastModified: Date.now() })),
    tx.done,
  ]);
}

export async function bulkSaveSales(sales: SaleRecord[]) {
  const db = await getDb();
  const tx = db.transaction('sales', 'readwrite');
  await Promise.all([
    ...sales.map(s => tx.store.put({ ...s, synced: true, lastModified: Date.now() })),
    tx.done,
  ]);
}

export async function bulkSavePurchases(purchases: PurchaseRecord[]) {
  const db = await getDb();
  const tx = db.transaction('purchases', 'readwrite');
  await Promise.all([
    ...purchases.map(p => tx.store.put({ ...p, synced: true, lastModified: Date.now() })),
    tx.done,
  ]);
}

export async function getUnsyncedCount(): Promise<number> {
  const db = await getDb();
  const pending = await db.getAll('pendingSync');
  return pending.length;
}
