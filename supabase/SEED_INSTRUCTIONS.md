# Database Population Instructions

## Quick Start

1. **Open Supabase SQL Editor**
   - URL: https://app.sgvuwilskrfmxchuvfab.supabase.co/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the SQL File**
   - File location: `supabase/enhanced_seed.sql`
   - Or use the content below

3. **Execute**
   - Paste the SQL into the editor
   - Click "Run" or press Ctrl+Enter

## What Gets Created

### Master Data
- **8 Departments**: Executive, Logistics, Procurement, Quality Control, Sales, IT Support, Finance, Customer Service
- **6 Roles**: Administrator, Warehouse Manager, Procurement Officer, Inventory Specialist, Finance Manager, Sales Representative
- **5 Warehouses**: Alpha (Main), Beta (Secondary), Gamma (Port), Delta (East), Epsilon (South)
- **8 Suppliers**: Global Tech Supplies, MicroCircuit Corp, Apex Logistics, Titan Industrial, FastTrack Components, Pacific Rim Electronics, Nordic Tech Solutions, Atlantic Components

### Products (45+ items)
- **Processors**: Intel Core i9/i7/i5, AMD Ryzen 9/7
- **Graphics Cards**: NVIDIA RTX 4090/4080/4070/4060, AMD Radeon RX 7900
- **Memory**: DDR5 kits from Corsair, G.Skill, Kingston
- **Storage**: NVMe SSDs (Samsung, Crucial), HDDs (WD, Seagate)
- **Monitors**: Gaming and professional displays
- **Input Devices**: Gaming mice, keyboards
- **Audio**: Headphones, microphones
- **Networking**: Switches, routers, cables
- **Core Hardware**: Motherboards, coolers, PSUs, cases

### Transactional Data
- **300+ Orders** with realistic statuses and progression
- **500+ Transactions** showing inventory movement
- **Bills** with complete invoice data (invoice number, dates, amounts, tax, payment terms)
- **Price History** showing market fluctuations over time

### Time Span
All data is distributed across **1 year** of operations, from 2/3/2025 to 2/3/2026

## Alternative Methods

### Using Supabase CLI
```bash
# If you have migrations set up
supabase db reset

# Or execute directly
supabase db execute -f supabase/enhanced_seed.sql
```

### Using psql
```bash
psql -h db.sgvuwilskrfmxchuvfab.supabase.co -U postgres -d postgres -f supabase/enhanced_seed.sql
```

## Verification

After running the seed, you can verify the data:

```sql
-- Check totals
SELECT 
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM warehouses) as warehouses,
  (SELECT COUNT(*) FROM suppliers) as suppliers,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM bills) as bills;

-- Check order status distribution
SELECT status, COUNT(*) 
FROM orders 
GROUP BY status 
ORDER BY COUNT(*) DESC;

-- Check transaction types
SELECT type, COUNT(*) 
FROM transactions 
GROUP BY type 
ORDER BY COUNT(*) DESC;

-- Check inventory levels
SELECT 
  p.p_name,
  p.quantity as total_stock,
  COUNT(pw.w_id) as warehouses_with_stock
FROM products p
LEFT JOIN product_warehouse pw ON p.pid = pw.pid
GROUP BY p.pid, p.p_name, p.quantity
ORDER BY p.quantity DESC
LIMIT 10;
```

## Notes

- The seed script will **TRUNCATE** all tables before inserting new data
- All timestamps are realistic and distributed over the past year
- Price changes reflect market fluctuations (±15% variation)
- Order statuses progress realistically based on order age
- Transaction descriptions are varied and meaningful
- Invoice data includes all standard fields (subtotal, tax, total, payment terms)
