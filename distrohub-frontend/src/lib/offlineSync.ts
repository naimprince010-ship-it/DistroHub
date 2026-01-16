import api from '@/lib/api';
import {
  clearPendingSync,
  deleteRecord,
  getPendingSync,
  saveProduct,
  savePurchase,
  saveRetailer,
  saveSale,
  type PendingSyncRecord,
  type ProductRecord,
  type PurchaseRecord,
  type RetailerRecord,
  type SaleRecord,
} from '@/lib/offlineDb';

type SyncEntity = PendingSyncRecord['entity'];

const entityApiBase: Record<SyncEntity, string> = {
  products: '/api/products',
  retailers: '/api/retailers',
  sales: '/api/sales',
  purchases: '/api/purchases',
};

function isOnline() {
  return navigator.onLine;
}

async function mirrorToOfflineStore(entity: SyncEntity, data: any, synced: boolean) {
  const basePayload = { ...data, synced, lastModified: Date.now() };
  if (entity === 'products') {
    await saveProduct(basePayload as ProductRecord);
  } else if (entity === 'retailers') {
    await saveRetailer(basePayload as RetailerRecord);
  } else if (entity === 'sales') {
    await saveSale(basePayload as SaleRecord);
  } else if (entity === 'purchases') {
    await savePurchase(basePayload as PurchaseRecord);
  }
}

async function syncAction(action: PendingSyncRecord) {
  const baseUrl = entityApiBase[action.entity];
  if (!baseUrl) {
    throw new Error(`Unsupported entity: ${action.entity}`);
  }

  if (action.type === 'create') {
    const data = action.data as Record<string, unknown>;
    const payload = { ...data };
    const localId = typeof payload._local_id === 'string' ? payload._local_id : null;
    const isOfflineSale = payload._offline_items === true;
    if ('_local_id' in payload) {
      delete payload._local_id;
    }
    if ('_offline_items' in payload) {
      delete payload._offline_items;
    }
    if (action.entity === 'sales' && isOfflineSale) {
      const salePayload = await buildSalesPayload(payload);
      const response = await api.post(baseUrl, salePayload);
      if (localId) {
        await deleteRecord(action.entity, localId);
      }
      await mirrorToOfflineStore(action.entity, response.data ?? salePayload, true);
      return;
    }
    const response = await api.post(baseUrl, payload);
    if (localId) {
      await deleteRecord(action.entity, localId);
    }
    await mirrorToOfflineStore(action.entity, response.data ?? action.data, true);
    return;
  }

  if (action.type === 'update') {
    const data = action.data as { id?: string };
    if (!data?.id) {
      throw new Error(`Missing id for update ${action.entity}`);
    }
    const response = await api.put(`${baseUrl}/${data.id}`, action.data);
    await mirrorToOfflineStore(action.entity, response.data ?? action.data, true);
    return;
  }

  if (action.type === 'delete') {
    const data = action.data as { id?: string };
    if (!data?.id) {
      throw new Error(`Missing id for delete ${action.entity}`);
    }
    await api.delete(`${baseUrl}/${data.id}`);
    await deleteRecord(action.entity, data.id);
  }
}

async function buildSalesPayload(payload: Record<string, unknown>) {
  const retailerId = payload.retailer_id as string | undefined;
  if (!retailerId) {
    throw new Error('Missing retailer_id for offline sale sync');
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const productsRes = await api.get('/api/products');
  const products = productsRes.data || [];
  const saleItems = [];
  const productsWithoutBatches: string[] = [];

  for (const item of items) {
    const typedItem = item as { product_name?: string; quantity?: number; unit_price?: number };
    const product = products.find((p: any) => p.name === typedItem.product_name);
    if (!product) {
      continue;
    }
    const batchesRes = await api.get(`/api/products/${product.id}/batches`);
    const batches = batchesRes.data || [];
    if (batches.length === 0) {
      productsWithoutBatches.push(typedItem.product_name || product.name);
      continue;
    }
    const batch = batches[0];
    saleItems.push({
      product_id: product.id,
      batch_id: batch.id,
      quantity: typedItem.quantity || 0,
      unit_price: typedItem.unit_price || 0,
      discount: 0,
    });
  }

  if (saleItems.length === 0) {
    const details = productsWithoutBatches.length > 0 ? `Missing batches for: ${productsWithoutBatches.join(', ')}` : 'No valid items';
    throw new Error(`Unable to sync offline sale. ${details}`);
  }

  return {
    retailer_id: retailerId,
    items: saleItems,
    payment_type: payload.payment_type || 'cash',
    paid_amount: payload.paid_amount || 0,
    notes: payload.notes,
    assigned_to: payload.assigned_to,
  };
}

export async function runOfflineSync() {
  if (!isOnline()) {
    return { synced: 0, remaining: 0, skipped: true };
  }

  const pending = await getPendingSync();
  if (pending.length === 0) {
    return { synced: 0, remaining: 0, skipped: false };
  }

  const sorted = [...pending].sort((a, b) => a.timestamp - b.timestamp);
  let syncedCount = 0;

  for (const action of sorted) {
    try {
      await syncAction(action);
      await clearPendingSync(action.id);
      syncedCount += 1;
    } catch (error) {
      console.warn('[offlineSync] Failed action, keeping in queue:', action, error);
      break;
    }
  }

  const remaining = (await getPendingSync()).length;
  return { synced: syncedCount, remaining, skipped: false };
}

export function initOfflineSync() {
  window.addEventListener('online', () => {
    runOfflineSync().catch((error) => {
      console.error('[offlineSync] Auto-sync failed:', error);
    });
  });
}
