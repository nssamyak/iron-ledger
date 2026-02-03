-- Quick verification queries to run after seeding
-- Copy and paste these into Supabase SQL Editor to verify your data

-- ========================================
-- 1. OVERALL SUMMARY
-- ========================================
SELECT 
  'Products' as entity, COUNT(*)::text as count FROM products
UNION ALL
SELECT 'Warehouses', COUNT(*)::text FROM warehouses
UNION ALL
SELECT 'Suppliers', COUNT(*)::text FROM suppliers
UNION ALL
SELECT 'Employees', COUNT(*)::text FROM employees
UNION ALL
SELECT 'Departments', COUNT(*)::text FROM departments
UNION ALL
SELECT 'Roles', COUNT(*)::text FROM roles
UNION ALL
SELECT 'Orders', COUNT(*)::text FROM orders
UNION ALL
SELECT 'Transactions', COUNT(*)::text FROM transactions
UNION ALL
SELECT 'Bills', COUNT(*)::text FROM bills
UNION ALL
SELECT 'Price Changes', COUNT(*)::text FROM price_history
UNION ALL
SELECT 'Total Inventory', SUM(quantity)::text FROM products;

-- ========================================
-- 2. ORDER STATUS BREAKDOWN
-- ========================================
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders 
GROUP BY status 
ORDER BY count DESC;

-- ========================================
-- 3. TRANSACTION TYPE BREAKDOWN
-- ========================================
SELECT 
  type,
  COUNT(*) as count,
  SUM(amt) as total_quantity,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM transactions 
GROUP BY type 
ORDER BY count DESC;

-- ========================================
-- 4. TOP 10 PRODUCTS BY STOCK
-- ========================================
SELECT 
  p.p_name as product,
  p.quantity as total_stock,
  p.unit_price as price_inr,
  COUNT(DISTINCT pw.w_id) as num_warehouses,
  p.manufacturer
FROM products p
LEFT JOIN product_warehouse pw ON p.pid = pw.pid
GROUP BY p.pid, p.p_name, p.quantity, p.unit_price, p.manufacturer
ORDER BY p.quantity DESC
LIMIT 10;

-- ========================================
-- 5. WAREHOUSE INVENTORY DISTRIBUTION
-- ========================================
SELECT 
  w.w_name as warehouse,
  COUNT(DISTINCT pw.pid) as unique_products,
  SUM(pw.stock) as total_units,
  ROUND(AVG(pw.stock), 2) as avg_stock_per_product
FROM warehouses w
LEFT JOIN product_warehouse pw ON w.w_id = pw.w_id
GROUP BY w.w_id, w.w_name
ORDER BY total_units DESC;

-- ========================================
-- 6. SUPPLIER ORDER SUMMARY
-- ========================================
SELECT 
  s.s_name as supplier,
  COUNT(o.po_id) as total_orders,
  SUM(o.quantity) as total_units_ordered,
  ROUND(SUM(o.price), 2) as total_value_inr,
  COUNT(CASE WHEN o.status = 'received' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN o.status IN ('pending', 'approved', 'ordered') THEN 1 END) as active_orders
FROM suppliers s
LEFT JOIN orders o ON s.sup_id = o.sup_id
GROUP BY s.sup_id, s.s_name
ORDER BY total_value_inr DESC;

-- ========================================
-- 7. RECENT ACTIVITY (Last 20 Transactions)
-- ========================================
SELECT 
  TO_CHAR(t.time, 'YYYY-MM-DD HH24:MI') as timestamp,
  t.type,
  p.p_name as product,
  w.w_name as warehouse,
  t.amt as quantity,
  e.e_name as employee,
  LEFT(t.description, 50) as description
FROM transactions t
JOIN products p ON t.pid = p.pid
JOIN warehouses w ON t.w_id = w.w_id
JOIN employees e ON t.e_id = e.e_id
ORDER BY t.time DESC
LIMIT 20;

-- ========================================
-- 8. PENDING/ACTIVE ORDERS
-- ========================================
SELECT 
  o.po_id as order_id,
  o.status,
  p.p_name as product,
  s.s_name as supplier,
  w.w_name as target_warehouse,
  o.quantity,
  ROUND(o.price, 2) as total_price_inr,
  o.date as order_date,
  e.e_name as created_by
FROM orders o
JOIN products p ON o.p_id = p.pid
JOIN suppliers s ON o.sup_id = s.sup_id
JOIN warehouses w ON o.target_w_id = w.w_id
JOIN employees e ON o.created_by = e.e_id
WHERE o.status IN ('pending', 'approved', 'ordered', 'shipped')
ORDER BY o.date DESC
LIMIT 20;

-- ========================================
-- 9. PRICE HISTORY SAMPLE
-- ========================================
SELECT 
  p.p_name as product,
  ph.old_price as old_price_inr,
  ph.new_price as new_price_inr,
  ROUND(((ph.new_price - ph.old_price) / ph.old_price * 100), 2) as change_percent,
  TO_CHAR(ph.change_date, 'YYYY-MM-DD') as date,
  ph.reason,
  e.e_name as changed_by
FROM price_history ph
JOIN products p ON ph.pid = p.pid
JOIN employees e ON ph.changed_by = e.e_id
ORDER BY ph.change_date DESC
LIMIT 15;

-- ========================================
-- 10. EMPLOYEE ACTIVITY SUMMARY
-- ========================================
SELECT 
  e.e_name as employee,
  d.d_name as department,
  r.role_name as role,
  COUNT(DISTINCT t.t_id) as transactions_handled,
  COUNT(DISTINCT o.po_id) as orders_created
FROM employees e
LEFT JOIN departments d ON e.d_id = d.d_id
LEFT JOIN roles r ON e.role_id = r.role_id
LEFT JOIN transactions t ON e.e_id = t.e_id
LEFT JOIN orders o ON e.e_id = o.created_by
GROUP BY e.e_id, e.e_name, d.d_name, r.role_name
ORDER BY transactions_handled DESC;

-- ========================================
-- 11. INVENTORY MOVEMENT TIMELINE (Last 30 Days)
-- ========================================
SELECT 
  DATE(time) as date,
  type,
  COUNT(*) as transaction_count,
  SUM(amt) as total_quantity
FROM transactions
WHERE time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(time), type
ORDER BY date DESC, type;

-- ========================================
-- 12. LOW STOCK ALERT
-- ========================================
SELECT 
  p.p_name as product,
  p.quantity as current_stock,
  p.unit_price as price_inr,
  c.cat_name as category,
  COUNT(DISTINCT o.po_id) FILTER (WHERE o.status IN ('pending', 'ordered')) as pending_orders
FROM products p
LEFT JOIN categories c ON p.c_id = c.c_id
LEFT JOIN orders o ON p.pid = o.p_id
GROUP BY p.pid, p.p_name, p.quantity, p.unit_price, c.cat_name
HAVING p.quantity < 50
ORDER BY p.quantity ASC;
