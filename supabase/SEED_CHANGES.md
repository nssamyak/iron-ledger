# Enhanced Seed File - Updated

## Changes Made

### 1. Employees (Cleaned Up)
- ✅ **Only 3 employees** are created
- ✅ Employees are **linked to actual auth.users** from the `user_roles` table
- ✅ If no auth users exist, creates 3 dummy employees (Admin User, Manager User, Staff User)
- ✅ All employees are assigned to the Executive department with Administrator role
- ✅ Proper user_roles entries created for RLS

### 2. Recent Orders (Added)
- ✅ **60 additional recent orders** from the last 30 days
- ✅ Realistic status distribution:
  - **30% Pending** (~18 orders)
  - **20% Approved** (~12 orders)
  - **20% Ordered** (~12 orders)
  - **20% Shipped** (~12 orders)
  - **10% Received** (~6 orders)
- ✅ All orders have realistic timestamps
- ✅ Orders page will now be populated with current data

## Total Data After Seeding

### Master Data
- 45+ Products
- 5 Warehouses
- 8 Suppliers
- **3 Employees** (linked to auth users)
- 8 Departments
- 6 Roles

### Transactional Data
- **360+ Orders** total:
  - ~300 historical orders (from the past year)
  - ~60 recent orders (last 30 days)
- 500+ Transactions
- 200+ Bills
- 200+ Price changes

## How to Use

1. **Open Supabase SQL Editor**
   - https://app.supabase.com/project/sgvuwilskrfmxchuvfab/sql/new

2. **Copy and paste** `supabase/enhanced_seed.sql`

3. **Run** the script

4. **Verify** your orders page is now populated!

## Verification Queries

```sql
-- Check employees (should be 3)
SELECT e_id, f_name, l_name, user_id FROM employees;

-- Check recent orders (should see 60+ from last 30 days)
SELECT 
  po_id, 
  status, 
  date, 
  p.p_name as product,
  s.s_name as supplier
FROM orders o
JOIN products p ON o.p_id = p.pid
JOIN suppliers s ON o.sup_id = s.sup_id
WHERE date >= CURRENT_DATE - 30
ORDER BY date DESC;

-- Check order status distribution
SELECT status, COUNT(*) as count
FROM orders
WHERE date >= CURRENT_DATE - 30
GROUP BY status
ORDER BY count DESC;
```

## Expected Results

After running the seed:
- ✅ Employees table: **3 rows**
- ✅ Orders from last 30 days: **~60 rows**
- ✅ Total orders: **~360 rows**
- ✅ Orders page: **Fully populated with recent data**
