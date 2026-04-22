# DSR/SR One-Page SOP

## Purpose

Define one enforceable route-to-cash process so every order is traceable from intake to delivery, collection, and reconciliation.

## Roles

- **Admin/Supervisor**
  - Create/edit sales orders.
  - Create/assign routes and route SR.
  - Approve route reconciliation and close variances.
  - Reassign orders/routes when exceptions occur.
- **DSR/Sales Rep**
  - Execute only assigned routes.
  - Update delivery status per stop.
  - Record collections against sale invoice (`sale_id`) with own user (`collected_by`).
  - Submit end-of-day reconciliation for assigned routes.

## Route Lifecycle

1. `pending` - route created, orders attached.
2. `in_progress` - route dispatched and field execution started.
3. `completed` - route run finished, awaiting cash/returns reconciliation.
4. `reconciled` - variance reviewed, approved, and route financially closed.

## Mandatory Data Rules (Non-Negotiable)

- Every customer collection must include:
  - `sale_id`
  - `collected_by`
  - `payment_method`
  - `amount`
- Route removal/deletion must clear route linkage and SR assignment override on affected sales.
- Payment method vocabulary is standardized:
  - `cash`
  - `bank_transfer`
  - `mobile_banking`
  - `check`
  - `other`

## Daily Operating Flow

1. **Order Intake (Admin)**  
   Create order with retailer, delivery date, and line items.

2. **Route Planning (Admin)**  
   Bundle pending orders into route and assign SR.

3. **Load & Dispatch (Admin + DSR)**  
   Confirm load sheet, order sequence, and expected collection.

4. **Field Execution (DSR)**  
   Deliver, update status, and record each collection by invoice.

5. **EOD Reconciliation (DSR + Admin)**  
   Submit collected cash, returns value, discrepancy notes; admin approves and route moves to `reconciled`.

## Exception Rules

- DSR cannot collect payments for non-assigned sales/routes.
- DSR cannot create/edit/delete routes.
- DSR cannot create/edit/delete sales orders.
- Any override must be handled by Admin and remain audit-traceable.
