# 🌱 IronLedger Database Population Guide

## 📋 Overview

I've created a comprehensive seed file that will populate your IronLedger database with **realistic, meaningful data** spanning **1 year of operations**. This includes historical transactions, price changes, orders in various stages, and much more.

## 🎯 What You'll Get

### Master Data
- ✅ **8 Departments**: Executive, Logistics, Procurement, Quality Control, Sales, IT Support, Finance, Customer Service
- ✅ **6 Roles**: Administrator, Warehouse Manager, Procurement Officer, Inventory Specialist, Finance Manager, Sales Representative
- ✅ **5 Warehouses**: 
  - Warehouse-Alpha (Main) - San Jose, CA
  - Warehouse-Beta (Secondary) - Austin, TX
  - Warehouse-Gamma (Port) - Seattle, WA
  - Warehouse-Delta (East) - Brooklyn, NY
  - Warehouse-Epsilon (South) - Miami, FL
- ✅ **8 Suppliers**: Global Tech Supplies, MicroCircuit Corp, Apex Logistics, Titan Industrial, FastTrack Components, Pacific Rim Electronics, Nordic Tech Solutions, Atlantic Components

### Products (45+ Items)
- **Processors** (5): Intel Core i9/i7/i5, AMD Ryzen 9/7
- **Graphics Cards** (5): NVIDIA RTX 4090/4080/4070/4060, AMD Radeon RX 7900 XTX
- **Memory** (4): DDR5 kits from Corsair, G.Skill, Kingston
- **Storage** (5): NVMe SSDs (Samsung 990 Pro, Crucial T700), HDDs (WD Black, Seagate IronWolf)
- **Monitors** (5): LG UltraGear, Dell UltraSharp, Samsung Odyssey G9, ASUS ROG Swift, BenQ
- **Input Devices** (5): Logitech G Pro, Razer Huntsman, MX Master 3S, Keychron Q1, DeathAdder
- **Audio** (5): Sony WH-1000XM5, HyperX Cloud II, Blue Yeti, Shure SM7B, Sennheiser HD 660S2
- **Networking** (6): Cisco Catalyst, Ubiquiti UniFi, Netgear NightHawk, MikroTik, TP-Link
- **Core Hardware** (6): Motherboards, CPU coolers, PSUs, PC cases

### Transactional Data

#### 📦 **300+ Orders** with Realistic Statuses
- **Pending**: Recent orders awaiting approval (~30 orders)
- **Approved**: Orders approved but not yet sent to supplier (~25 orders)
- **Ordered**: Orders placed with suppliers (~35 orders)
- **Shipped**: Orders in transit (~40 orders)
- **Received**: Completed deliveries (~120 orders)
- **Partial**: Partially received orders (~30 orders)
- **Cancelled**: Cancelled orders (~20 orders)

Order progression is realistic based on order age:
- Orders from 1 year ago → mostly received or cancelled
- Orders from 1 month ago → shipped or received
- Recent orders → pending, approved, or ordered

#### 🔄 **500+ Transactions** Showing Inventory Movement
- **Receive** (~300): Stock inbound from suppliers
- **Take** (~250): Sales, customer orders, fulfillment
- **Transfer** (~100): Inter-warehouse stock movement
- **Return** (~50): Customer returns, RMAs
- **Adjustment** (~100): Inventory audits, corrections, damaged goods

Each transaction has:
- Realistic timestamps distributed over 1 year
- Meaningful descriptions (e.g., "Customer order fulfillment", "Inter-warehouse stock rebalancing")
- Proper employee attribution
- Accurate quantity tracking

#### 💰 **Bills with Complete Invoice Data**
Each bill includes:
```json
{
  "invoice_number": "INV-00000123",
  "invoice_date": "2025-06-15",
  "due_date": "2025-07-15",
  "subtotal": 125000.00,
  "tax": 10000.00,
  "total": 135000.00,
  "payment_terms": "Net 30",
  "currency": "INR"
}
```

#### 📈 **Price History** Tracking Market Fluctuations
- Each product has 3-8 price changes over the year
- Price variations of ±15% reflecting market conditions
- Reasons include:
  - Market demand increase
  - Supplier price adjustment
  - Currency exchange rate change
  - Seasonal promotion
  - Bulk purchase discount

### 👥 **15 Employees** with Realistic Names
- John Smith, Sarah Johnson, Michael Williams, Emily Brown, David Jones
- Jessica Garcia, James Martinez, Ashley Rodriguez, Robert Davis, Amanda Lopez
- William Gonzalez, Jennifer Wilson, Richard Anderson, Lisa Thomas, Christopher Taylor

Each employee is assigned to a department and role, with proper user_roles for RLS.

## 🚀 How to Populate Your Database

### Method 1: Supabase SQL Editor (Recommended)

1. **Open the SQL Editor**
   - Click this link: [Supabase SQL Editor](https://app.supabase.com/project/sgvuwilskrfmxchuvfab/sql/new)
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the SQL File**
   - Open: `supabase/enhanced_seed.sql`
   - Select all (Ctrl+A) and copy (Ctrl+C)

3. **Paste and Execute**
   - Paste into the SQL Editor (Ctrl+V)
   - Click "Run" or press Ctrl+Enter
   - Wait for completion (should take 10-30 seconds)

### Method 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db execute -f supabase/enhanced_seed.sql
```

### Method 3: Using psql

```bash
psql -h db.sgvuwilskrfmxchuvfab.supabase.co -U postgres -d postgres -f supabase/enhanced_seed.sql
```

## ✅ Verification

After running the seed, verify the data with these queries:

### Check Overall Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM warehouses) as warehouses,
  (SELECT COUNT(*) FROM suppliers) as suppliers,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM bills) as bills,
  (SELECT COUNT(*) FROM price_history) as price_changes;
```

Expected results:
- Products: 45+
- Warehouses: 5
- Suppliers: 8
- Employees: 15
- Orders: 310+
- Transactions: 800+
- Bills: 200+
- Price changes: 200+

### Check Order Status Distribution
```sql
SELECT status, COUNT(*) as count
FROM orders 
GROUP BY status 
ORDER BY COUNT(*) DESC;
```

### Check Transaction Types
```sql
SELECT type, COUNT(*) as count
FROM transactions 
GROUP BY type 
ORDER BY COUNT(*) DESC;
```

### Check Top Products by Stock
```sql
SELECT 
  p.p_name,
  p.quantity as total_stock,
  p.unit_price,
  COUNT(pw.w_id) as warehouses_with_stock
FROM products p
LEFT JOIN product_warehouse pw ON p.pid = pw.pid
GROUP BY p.pid, p.p_name, p.quantity, p.unit_price
ORDER BY p.quantity DESC
LIMIT 10;
```

### Check Recent Transactions
```sql
SELECT 
  t.time,
  t.type,
  p.p_name,
  w.w_name,
  t.amt,
  t.description,
  e.e_name as employee
FROM transactions t
JOIN products p ON t.pid = p.pid
JOIN warehouses w ON t.w_id = w.w_id
JOIN employees e ON t.e_id = e.e_id
ORDER BY t.time DESC
LIMIT 20;
```

### Check Pending Orders
```sql
SELECT 
  o.po_id,
  p.p_name as product,
  s.s_name as supplier,
  w.w_name as target_warehouse,
  o.quantity,
  o.price,
  o.status,
  o.date
FROM orders o
JOIN products p ON o.p_id = p.pid
JOIN suppliers s ON o.sup_id = s.sup_id
JOIN warehouses w ON o.target_w_id = w.w_id
WHERE o.status IN ('pending', 'approved', 'ordered')
ORDER BY o.date DESC;
```

## 📊 Data Characteristics

### Realistic Patterns
- **Seasonal Variations**: More orders during certain periods
- **Business Hours**: Transactions weighted toward business hours
- **Bulk Discounts**: Order prices reflect 2-10% bulk discounts
- **Partial Deliveries**: Some orders received in multiple shipments
- **Returns**: ~10% of sales have returns
- **Stock Transfers**: Regular inter-warehouse movements

### Time Distribution
- Data spans **365 days** (1 year)
- From: February 3, 2025
- To: February 3, 2026
- Realistic progression of order statuses based on age

### Price Dynamics
- Initial prices set at market rates (in INR)
- 3-8 price changes per product over the year
- ±15% variation reflecting market conditions
- Price history tracked with reasons and timestamps

## 🎨 Use Cases

This data enables you to:
1. **Test NLP Queries**: "Show me all pending orders from last month"
2. **Visualize Trends**: Order volume over time, inventory levels
3. **Track Movements**: Product journey through warehouses
4. **Analyze Performance**: Supplier delivery times, order fulfillment rates
5. **Financial Reports**: Revenue, costs, profit margins
6. **Inventory Optimization**: Stock levels, reorder points
7. **Employee Activity**: Transaction history by employee

## ⚠️ Important Notes

- The seed script **TRUNCATES all tables** before inserting data
- All existing data will be **permanently deleted**
- Make sure to backup any important data first
- The script is idempotent - you can run it multiple times
- Execution time: ~10-30 seconds depending on your connection

## 📁 Files Created

1. **`supabase/enhanced_seed.sql`** - Main seed file (30KB+)
2. **`supabase/SEED_INSTRUCTIONS.md`** - Quick reference guide
3. **`scripts/populate_database.js`** - Helper script with instructions
4. **`DATABASE_POPULATION_GUIDE.md`** - This comprehensive guide

## 🆘 Troubleshooting

### Error: "relation does not exist"
- Make sure you've run `schema.sql` first
- Check that all tables are created

### Error: "permission denied"
- Ensure you're using the SQL Editor in Supabase Dashboard
- Or use a service role key if running via API

### Slow Execution
- The script has 800+ INSERT statements
- This is normal for large seed files
- Wait for completion (up to 1 minute)

### Data Not Showing
- Check for errors in the SQL Editor output
- Verify RLS policies are set correctly
- Make sure you're logged in as an authenticated user

## 🎉 Next Steps

After populating the database:

1. **Refresh your application** to see the new data
2. **Test NLP queries** in the chat interface
3. **Explore visualizations** with real data
4. **Test order workflows** with various statuses
5. **Verify RLS policies** work correctly with different roles

Enjoy your fully populated IronLedger database! 🚀
