-- Reset production data to start from zero
-- WARNING: This will delete ALL transactional data and products.
-- Keep master data (users, categories, suppliers, units, warehouses).
-- Run in Supabase SQL Editor on the production database.

BEGIN;

-- Sales returns and related items
DELETE FROM sales_return_items;
DELETE FROM sales_returns;

-- Route system data
DELETE FROM route_reconciliation_items;
DELETE FROM route_reconciliations;
DELETE FROM route_sales;
DELETE FROM routes;
DELETE FROM sr_cash_holdings;
UPDATE users SET current_cash_holding = 0;

-- Payments and sales
DELETE FROM payments;
DELETE FROM sale_items;
DELETE FROM sales;

-- Purchases
DELETE FROM purchase_items;
DELETE FROM purchases;

-- Stock and products
DELETE FROM warehouse_stock;
DELETE FROM product_batches;
DELETE FROM products;

-- Reset retailer balances
UPDATE retailers SET total_due = 0;

COMMIT;
