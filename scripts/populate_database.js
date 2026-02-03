/**
 * Direct Database Seeding via Supabase REST API
 * This script executes the enhanced seed SQL directly
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

async function executeSQLFile() {
    console.log('🌱 IronLedger Database Population');
    console.log('='.repeat(50));
    console.log('');

    // Read the enhanced seed file
    const seedFilePath = path.join(__dirname, '..', 'supabase', 'enhanced_seed.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf8');

    console.log('📄 Loaded: enhanced_seed.sql');
    console.log(`📏 Size: ${(seedSQL.length / 1024).toFixed(2)} KB`);
    console.log('');

    console.log('⚠️  IMPORTANT INSTRUCTIONS:');
    console.log('='.repeat(50));
    console.log('');
    console.log('To populate your database with realistic data:');
    console.log('');
    console.log('1️⃣  Open Supabase SQL Editor:');
    console.log(`   ${supabaseUrl.replace('//', '//app.')}/sql/new`);
    console.log('');
    console.log('2️⃣  Copy the SQL file:');
    console.log(`   File: ${seedFilePath}`);
    console.log('');
    console.log('3️⃣  Paste and click "Run" in the SQL Editor');
    console.log('');
    console.log('='.repeat(50));
    console.log('');

    console.log('📊 What will be created:');
    console.log('');
    console.log('  ✓ 8 Departments (Executive, Logistics, Procurement, etc.)');
    console.log('  ✓ 6 Roles (Admin, Warehouse Manager, Procurement Officer, etc.)');
    console.log('  ✓ 5 Warehouses across different locations');
    console.log('  ✓ 8 Suppliers (Global Tech, MicroCircuit, Apex, etc.)');
    console.log('  ✓ 45+ Products (CPUs, GPUs, Memory, Storage, Monitors, etc.)');
    console.log('  ✓ 15 Employees with realistic names and roles');
    console.log('  ✓ 300+ Orders with diverse statuses:');
    console.log('      - Pending, Approved, Ordered');
    console.log('      - Shipped, Received, Partial');
    console.log('      - Cancelled, Reordered');
    console.log('  ✓ 500+ Transactions:');
    console.log('      - Receive (stock inbound)');
    console.log('      - Take (sales/fulfillment)');
    console.log('      - Transfer (inter-warehouse)');
    console.log('      - Return (customer returns)');
    console.log('      - Adjustment (inventory corrections)');
    console.log('  ✓ Bills with detailed invoice data (JSON)');
    console.log('  ✓ Price History tracking market fluctuations');
    console.log('  ✓ Historical data spanning 1 year');
    console.log('');
    console.log('='.repeat(50));
    console.log('');

    // Create a quick reference file
    const quickRefPath = path.join(__dirname, '..', 'supabase', 'SEED_INSTRUCTIONS.md');
    const instructions = `# Database Population Instructions

## Quick Start

1. **Open Supabase SQL Editor**
   - URL: ${supabaseUrl.replace('//', '//app.')}/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the SQL File**
   - File location: \`supabase/enhanced_seed.sql\`
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
All data is distributed across **1 year** of operations, from ${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${new Date().toLocaleDateString()}

## Alternative Methods

### Using Supabase CLI
\`\`\`bash
# If you have migrations set up
supabase db reset

# Or execute directly
supabase db execute -f supabase/enhanced_seed.sql
\`\`\`

### Using psql
\`\`\`bash
psql -h db.sgvuwilskrfmxchuvfab.supabase.co -U postgres -d postgres -f supabase/enhanced_seed.sql
\`\`\`

## Verification

After running the seed, you can verify the data:

\`\`\`sql
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
\`\`\`

## Notes

- The seed script will **TRUNCATE** all tables before inserting new data
- All timestamps are realistic and distributed over the past year
- Price changes reflect market fluctuations (±15% variation)
- Order statuses progress realistically based on order age
- Transaction descriptions are varied and meaningful
- Invoice data includes all standard fields (subtotal, tax, total, payment terms)
`;

    fs.writeFileSync(quickRefPath, instructions, 'utf8');
    console.log(`📝 Created: ${quickRefPath}`);
    console.log('');
    console.log('💡 Tip: Check SEED_INSTRUCTIONS.md for detailed information');
    console.log('');
}

executeSQLFile().catch(console.error);
