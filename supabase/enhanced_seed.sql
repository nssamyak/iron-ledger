-- =====================================================
-- IronLedger: Enhanced Realistic Seed Data
-- Includes: Price History, Diverse Orders, Rich Transactions
-- =====================================================

-- 1. CLEAR EVERYTHING
TRUNCATE TABLE 
    bills, 
    transactions, 
    orders, 
    product_warehouse, 
    employees, 
    user_roles, 
    products, 
    categories, 
    warehouses, 
    suppliers, 
    departments, 
    roles 
RESTART IDENTITY CASCADE;

-- 2. DEPARTMENTS & ROLES
INSERT INTO departments (d_name) VALUES 
('Executive'), 
('Logistics'), 
('Procurement'), 
('Quality Control'), 
('Sales'), 
('IT Support'),
('Finance'),
('Customer Service');

INSERT INTO roles (role_name, permissions) VALUES 
('Administrator', '{"all": true}'::jsonb),
('Warehouse Manager', '{"inventory": "full", "orders": "read"}'::jsonb),
('Procurement Officer', '{"orders": "full", "suppliers": "full"}'::jsonb),
('Inventory Specialist', '{"inventory": "write"}'::jsonb),
('Finance Manager', '{"bills": "full", "orders": "read"}'::jsonb),
('Sales Representative', '{"orders": "create", "inventory": "read"}'::jsonb);

-- 3. HIERARCHICAL CATEGORIES
DO $$ 
DECLARE 
    hardware_id INT;
    peripheral_id INT;
    network_id INT;
BEGIN
    INSERT INTO categories (cat_name) VALUES ('Core Hardware') RETURNING c_id INTO hardware_id;
    INSERT INTO categories (cat_name) VALUES ('Peripherals') RETURNING c_id INTO peripheral_id;
    INSERT INTO categories (cat_name) VALUES ('Networking') RETURNING c_id INTO network_id;

    INSERT INTO categories (cat_name, parent_id) VALUES 
    ('Processors', hardware_id), ('Graphics Cards', hardware_id), ('Memory', hardware_id), ('Storage', hardware_id),
    ('Monitors', peripheral_id), ('Input Devices', peripheral_id), ('Audio', peripheral_id),
    ('Switches', network_id), ('Routers', network_id), ('Cables', network_id);
END $$;

-- 4. WAREHOUSES & SUPPLIERS
INSERT INTO warehouses (w_name, address) VALUES
('Warehouse-Alpha (Main)', '123 Logistics Way, San Jose, CA'),
('Warehouse-Beta (Secondary)', '456 Distribution Blvd, Austin, TX'),
('Warehouse-Gamma (Port)', '789 Shipping St, Seattle, WA'),
('Warehouse-Delta (East)', '101 Atlantic Ave, Brooklyn, NY'),
('Warehouse-Epsilon (South)', '202 Commerce Dr, Miami, FL');

INSERT INTO suppliers (s_name, address, contact_email, contact_phone) VALUES
('Global Tech Supplies', 'California, USA', 'sales@globaltech.com', '+1-555-0100'),
('MicroCircuit Corp', 'Hsinchu, Taiwan', 'orders@microcircuit.tw', '+886-3-5550200'),
('Apex Logistics', 'Texas, USA', 'support@apexlogistics.com', '+1-512-5550300'),
('Titan Industrial', 'Shenzhen, China', 'export@titan-ind.cn', '+86-755-5550400'),
('FastTrack Components', 'Berlin, Germany', 'contact@fasttrack.de', '+49-30-5550500'),
('Pacific Rim Electronics', 'Tokyo, Japan', 'sales@pacificrim.jp', '+81-3-5550600'),
('Nordic Tech Solutions', 'Stockholm, Sweden', 'info@nordictech.se', '+46-8-5550700'),
('Atlantic Components', 'Dublin, Ireland', 'orders@atlanticcomp.ie', '+353-1-5550800');

-- 5. PRODUCTS WITH INITIAL PRICES
-- We'll track price changes separately
INSERT INTO products (p_name, description, quantity, unit_price, manufacturer, c_id) VALUES
-- Processors
('Intel Core i9-14900K', 'High-end desktop CPU, 24 cores, 5.8GHz boost', 0, 48969.17, 'Intel', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('AMD Ryzen 9 7950X', 'Flagship AMD CPU, 16 cores, 5.7GHz boost', 0, 54199.17, 'AMD', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('Intel Core i7-14700K', 'Performance desktop CPU, 20 cores', 0, 33199.17, 'Intel', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('AMD Ryzen 7 7800X3D', 'Gaming champion CPU with 3D V-Cache', 0, 37267.0, 'AMD', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('Intel Core i5-14600K', 'Mid-range gaming CPU, 14 cores', 0, 24817.0, 'Intel', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),

-- Graphics Cards
('NVIDIA RTX 4090', 'Flagship gaming GPU, 24GB GDDR6X', 0, 165917.0, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('NVIDIA RTX 4080 Super', 'High-end gaming GPU, 16GB', 0, 82999.17, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('NVIDIA RTX 4070 Ti', 'Mid-high range GPU, 12GB', 0, 66399.17, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('AMD Radeon RX 7900 XTX', 'AMD flagship GPU, 24GB', 0, 82999.17, 'AMD', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('NVIDIA RTX 4060 Ti', 'Mid-range GPU, 8GB', 0, 33117.0, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),

-- Memory
('Corsair Vengeance 32GB DDR5', '6000MHz Performance RAM, 2x16GB', 0, 10789.17, 'Corsair', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),
('G.Skill Trident Z5 64GB', 'DDR5 6400MHz memory kit, RGB', 0, 20749.17, 'G.Skill', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),
('Kingston Fury Beast 32GB DDR5', '5600MHz CL36, 2x16GB', 0, 9129.17, 'Kingston', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),
('Corsair Dominator Platinum 64GB', 'Premium DDR5 6200MHz', 0, 24817.0, 'Corsair', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),

-- Storage
('Samsung 990 Pro 1TB', 'PCIe 4.0 NVMe SSD, 7450MB/s', 0, 9959.17, 'Samsung', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('Samsung 990 Pro 2TB', 'PCIe 4.0 NVMe SSD, 7450MB/s', 0, 18299.17, 'Samsung', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('Crucial T700 2TB', 'PCIe 5.0 NVMe SSD, 12400MB/s', 0, 23239.17, 'Crucial', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('Western Digital Black 4TB', 'High capacity HDD, 7200RPM', 0, 13279.17, 'WD', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('Seagate IronWolf 8TB', 'NAS HDD, 7200RPM', 0, 16599.17, 'Seagate', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),

-- Monitors
('LG UltraGear 27GP850', '27" QHD 165Hz Gaming Monitor', 0, 33199.17, 'LG', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('Dell UltraSharp 32', '32" 4K Professional Monitor', 0, 74617.0, 'Dell', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('Samsung Odyssey G9', '49" Super Ultrawide 240Hz', 0, 107817.0, 'Samsung', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('ASUS ROG Swift PG27AQDM', '27" OLED 240Hz Gaming', 0, 82999.17, 'ASUS', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('BenQ PD3220U', '32" 4K Designer Monitor', 0, 66399.17, 'BenQ', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),

-- Input Devices
('Logitech G Pro X Superlight', 'Ultra-light gaming mouse, 63g', 0, 12449.17, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Razer Huntsman V3 Pro', 'Analog optical keyboard', 0, 20749.17, 'Razer', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Logitech MX Master 3S', 'Professional wireless mouse', 0, 8299.17, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Keychron Q1 Max', 'Custom Mechanical Keyboard', 0, 15687.0, 'Keychron', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Razer DeathAdder V3 Pro', 'Wireless gaming mouse', 0, 11619.17, 'Razer', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),

-- Audio
('Sony WH-1000XM5', 'Noise cancelling headphones', 0, 33199.17, 'Sony', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('HyperX Cloud II', 'Gaming Headset with 7.1 surround', 0, 8217.0, 'HP', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('Blue Yeti USB Mic', 'Professional streaming microphone', 0, 10707.0, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('Shure SM7B', 'Professional broadcast microphone', 0, 33117.0, 'Shure', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('Sennheiser HD 660S2', 'Audiophile headphones', 0, 41499.17, 'Sennheiser', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),

-- Networking
('Cisco Catalyst 1000', '24-port Managed Switch', 0, 70550.0, 'Cisco', (SELECT c_id FROM categories WHERE cat_name = 'Switches')),
('Ubiquiti UniFi Dream Router', 'Integrated Router & AP', 0, 16517.0, 'Ubiquiti', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('Netgear NightHawk M6', '5G Mobile Router', 0, 66399.17, 'Netgear', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('MikroTik RB5009', 'Heavy-duty enterprise router', 0, 16517.0, 'MikroTik', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('Cat6a Ethernet Cable 10m', 'High speed networking cable', 0, 2075.0, 'Generic', (SELECT c_id FROM categories WHERE cat_name = 'Cables')),
('TP-Link TL-SG1024D', '24-port Gigabit Switch', 0, 12449.17, 'TP-Link', (SELECT c_id FROM categories WHERE cat_name = 'Switches')),

-- Core Hardware
('ASUS ROG Strix Z790', 'Overclocking motherboard, LGA1700', 0, 33117.0, 'ASUS', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('MSI MAG X670E', 'AMD AM5 motherboard', 0, 29067.0, 'MSI', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Noctua NH-D15', 'Premium CPU Air Cooler', 0, 9877.0, 'Noctua', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Corsair iCUE H150i', 'RGB 360mm AIO Liquid Cooler', 0, 14939.17, 'Corsair', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Seasonic PRIME 1000W', 'Titanium Efficiency PSU', 0, 24817.0, 'Seasonic', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('NZXT H7 Flow', 'Mid-tower PC case', 0, 10789.17, 'NZXT', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware'));

-- 6. CREATE PRICE HISTORY TABLE (for tracking price changes)
CREATE TABLE IF NOT EXISTS price_history (
    ph_id SERIAL PRIMARY KEY,
    pid INTEGER REFERENCES products(pid),
    old_price NUMERIC,
    new_price NUMERIC,
    change_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reason TEXT,
    changed_by UUID REFERENCES employees(e_id)
);

-- 7. GENERATE REALISTIC DATA
DO $$
DECLARE
    u_rec RECORD;
    emp_id UUID;
    emp_ids UUID[];
    p_rec RECORD;
    w_rec RECORD;
    s_rec RECORD;
    new_po_id INT;
    order_qty INT;
    received_qty INT;
    t_date TIMESTAMP;
    i INT;
    j INT;
    random_status order_status;
    price_multiplier NUMERIC;
    base_date TIMESTAMP := CURRENT_TIMESTAMP - INTERVAL '365 days'; -- Start from 1 year ago
    employee_count INT := 0;
BEGIN
    -- A. CREATE EMPLOYEES FROM AUTH USERS
    -- Only create employees for users that exist in auth.users
    FOR u_rec IN SELECT id, email FROM auth.users LIMIT 3 LOOP
        employee_count := employee_count + 1;
        
        INSERT INTO employees (user_id, f_name, l_name, role_id, d_id)
        VALUES (
            u_rec.id,
            split_part(u_rec.email, '@', 1),
            'User',
            (SELECT role_id FROM roles WHERE role_name = 'Administrator' LIMIT 1),
            (SELECT d_id FROM departments WHERE d_name = 'Executive' LIMIT 1)
        )
        RETURNING e_id INTO emp_id;
        
        emp_ids := array_append(emp_ids, emp_id);
        
        -- Assign User Role for RLS
        INSERT INTO user_roles (user_id, role) 
        VALUES (u_rec.id, 'admin')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created employee for user: %', u_rec.email;
    END LOOP;
    
    -- If no auth users exist, create 3 dummy employees
    IF employee_count = 0 THEN
        FOR i IN 1..3 LOOP
            INSERT INTO employees (f_name, l_name, role_id, d_id)
            VALUES (
                CASE i
                    WHEN 1 THEN 'Admin'
                    WHEN 2 THEN 'Manager'
                    ELSE 'Staff'
                END,
                'User',
                (SELECT role_id FROM roles ORDER BY random() LIMIT 1),
                (SELECT d_id FROM departments ORDER BY random() LIMIT 1)
            )
            RETURNING e_id INTO emp_id;
            
            emp_ids := array_append(emp_ids, emp_id);
        END LOOP;
        
        RAISE NOTICE 'No auth users found. Created 3 dummy employees.';
    END IF;

    -- B. GENERATE PRICE HISTORY (simulate market fluctuations)
    FOR p_rec IN SELECT * FROM products LOOP
        -- Each product has 3-8 price changes over the year
        FOR j IN 1..(3 + floor(random() * 6)::int) LOOP
            t_date := base_date + (floor(random() * 365) || ' days')::interval;
            price_multiplier := 0.85 + (random() * 0.30); -- ±15% variation
            
            INSERT INTO price_history (pid, old_price, new_price, change_date, reason, changed_by)
            VALUES (
                p_rec.pid,
                p_rec.unit_price,
                ROUND((p_rec.unit_price * price_multiplier)::NUMERIC, 2),
                t_date,
                CASE floor(random() * 5)::int
                    WHEN 0 THEN 'Market demand increase'
                    WHEN 1 THEN 'Supplier price adjustment'
                    WHEN 2 THEN 'Currency exchange rate change'
                    WHEN 3 THEN 'Seasonal promotion'
                    ELSE 'Bulk purchase discount'
                END,
                emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int]
            );
        END LOOP;
    END LOOP;

    -- C. GENERATE DIVERSE ORDERS (300 orders with various statuses)
    FOR i IN 1..300 LOOP
        SELECT * INTO p_rec FROM products ORDER BY random() LIMIT 1;
        SELECT * INTO w_rec FROM warehouses ORDER BY random() LIMIT 1;
        SELECT * INTO s_rec FROM suppliers ORDER BY random() LIMIT 1;
        
        order_qty := 5 + floor(random() * 150)::int;
        t_date := base_date + (floor(random() * 365) || ' days')::interval;
        
        -- Determine order status based on age
        IF t_date < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN
            -- Older orders are mostly received or cancelled
            random_status := (ARRAY['received', 'received', 'received', 'cancelled', 'partial']::order_status[])[1 + floor(random() * 5)::int];
        ELSIF t_date < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN
            -- Recent orders are in various stages
            random_status := (ARRAY['shipped', 'received', 'ordered', 'partial']::order_status[])[1 + floor(random() * 4)::int];
        ELSE
            -- Very recent orders are pending or approved
            random_status := (ARRAY['pending', 'approved', 'ordered']::order_status[])[1 + floor(random() * 3)::int];
        END IF;
        
        -- Calculate received quantity based on status
        received_qty := CASE random_status
            WHEN 'received' THEN order_qty
            WHEN 'partial' THEN floor(order_qty * (0.3 + random() * 0.6))::int
            WHEN 'shipped' THEN 0
            WHEN 'ordered' THEN 0
            WHEN 'approved' THEN 0
            WHEN 'pending' THEN 0
            WHEN 'cancelled' THEN 0
            ELSE 0
        END;
        
        -- Get current price or historical price
        price_multiplier := 0.90 + (random() * 0.08); -- Bulk discount 2-10%
        
        INSERT INTO orders (
            quantity, status, p_id, sup_id, target_w_id, 
            price, date, received_quantity, last_received_at, created_by, created_at, updated_at
        )
        VALUES (
            order_qty,
            random_status,
            p_rec.pid,
            s_rec.sup_id,
            w_rec.w_id,
            ROUND((p_rec.unit_price * order_qty * price_multiplier)::NUMERIC, 2),
            t_date::date,
            received_qty,
            CASE WHEN received_qty > 0 THEN t_date + (2 + floor(random() * 10)::int || ' days')::interval ELSE NULL END,
            emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
            t_date,
            t_date + (1 + floor(random() * 5)::int || ' hours')::interval
        )
        RETURNING po_id INTO new_po_id;

        -- Generate bills for completed orders
        IF random_status IN ('received', 'partial', 'shipped') THEN
            INSERT INTO bills (
                order_id, supplier_id, file_url, file_type, 
                uploaded_by, uploaded_at, notes, invoice_data
            )
            VALUES (
                new_po_id,
                s_rec.sup_id,
                'https://cdn.ironledger.io/bills/inv_' || new_po_id || '.pdf',
                'application/pdf',
                emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                t_date + (1 + floor(random() * 3)::int || ' days')::interval,
                'Invoice for PO-' || new_po_id,
                jsonb_build_object(
                    'invoice_number', 'INV-' || LPAD(new_po_id::text, 8, '0'),
                    'invoice_date', (t_date + interval '1 day')::date,
                    'due_date', (t_date + interval '30 days')::date,
                    'subtotal', ROUND((p_rec.unit_price * order_qty * price_multiplier)::NUMERIC, 2),
                    'tax', ROUND((p_rec.unit_price * order_qty * price_multiplier * 0.08)::NUMERIC, 2),
                    'total', ROUND((p_rec.unit_price * order_qty * price_multiplier * 1.08)::NUMERIC, 2),
                    'payment_terms', 'Net 30',
                    'currency', 'INR'
                )
            );
        END IF;

        -- Create receive transactions for received/partial orders
        IF received_qty > 0 THEN
            INSERT INTO transactions (
                amt, type, pid, w_id, e_id, description, time, created_at
            )
            VALUES (
                received_qty,
                'receive',
                p_rec.pid,
                w_rec.w_id,
                emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                'Received from PO-' || new_po_id || ' (' || s_rec.s_name || ')',
                t_date + (2 + floor(random() * 10)::int || ' days')::interval,
                t_date + (2 + floor(random() * 10)::int || ' days')::interval
            );
        END IF;
    END LOOP;

    -- D. GENERATE OPERATIONAL TRANSACTIONS (500 transactions)
    FOR i IN 1..500 LOOP
        SELECT * INTO p_rec FROM products ORDER BY random() LIMIT 1;
        t_date := base_date + (floor(random() * 365) || ' days')::interval;
        SELECT * INTO w_rec FROM warehouses ORDER BY random() LIMIT 1;
        
        CASE floor(random() * 10)::int
            WHEN 0, 1 THEN -- Transfer (20%)
                INSERT INTO transactions (amt, type, pid, w_id, target_w_id, e_id, description, time, created_at)
                VALUES (
                    5 + floor(random() * 20)::int,
                    'transfer',
                    p_rec.pid,
                    w_rec.w_id,
                    (SELECT w_id FROM warehouses WHERE w_id != w_rec.w_id ORDER BY random() LIMIT 1),
                    emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                    'Inter-warehouse stock rebalancing',
                    t_date,
                    t_date
                );
                
            WHEN 2, 3, 4, 5, 6 THEN -- Take/Sale (50%)
                INSERT INTO transactions (amt, type, pid, w_id, e_id, description, time, created_at)
                VALUES (
                    -(1 + floor(random() * 15)::int),
                    'take',
                    p_rec.pid,
                    w_rec.w_id,
                    emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                    CASE floor(random() * 4)::int
                        WHEN 0 THEN 'Customer order fulfillment'
                        WHEN 1 THEN 'Retail store pickup'
                        WHEN 2 THEN 'Online order shipment'
                        ELSE 'B2B bulk order'
                    END,
                    t_date,
                    t_date
                );
                
            WHEN 7 THEN -- Return (10%)
                INSERT INTO transactions (amt, type, pid, w_id, e_id, description, time, created_at)
                VALUES (
                    1 + floor(random() * 5)::int,
                    'return',
                    p_rec.pid,
                    w_rec.w_id,
                    emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                    CASE floor(random() * 3)::int
                        WHEN 0 THEN 'Customer return - defective'
                        WHEN 1 THEN 'Customer return - changed mind'
                        ELSE 'RMA return from service center'
                    END,
                    t_date,
                    t_date
                );
                
            ELSE -- Adjustment (20%)
                INSERT INTO transactions (amt, type, pid, w_id, e_id, description, time, created_at)
                VALUES (
                    (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END) * (1 + floor(random() * 3)::int),
                    'adjustment',
                    p_rec.pid,
                    w_rec.w_id,
                    emp_ids[1 + floor(random() * array_length(emp_ids, 1))::int],
                    CASE floor(random() * 4)::int
                        WHEN 0 THEN 'Annual inventory audit correction'
                        WHEN 1 THEN 'Damaged goods write-off'
                        WHEN 2 THEN 'Found stock during reorganization'
                        ELSE 'System reconciliation'
                    END,
                    t_date,
                    t_date
                );
        END CASE;
    END LOOP;

    -- E. SYNC WAREHOUSE STOCK
    INSERT INTO product_warehouse (pid, w_id, stock)
    SELECT pid, w_id, GREATEST(SUM(deltas), 0) as current_stock
    FROM (
        SELECT pid, w_id, amt as deltas FROM transactions WHERE type != 'transfer'
        UNION ALL
        SELECT pid, w_id, -amt FROM transactions WHERE type = 'transfer'
        UNION ALL
        SELECT pid, target_w_id as w_id, amt FROM transactions WHERE type = 'transfer'
    ) sub
    WHERE w_id IS NOT NULL
    GROUP BY pid, w_id
    HAVING SUM(deltas) > 0
    ON CONFLICT (pid, w_id) DO UPDATE SET stock = EXCLUDED.stock;

    -- F. UPDATE GLOBAL PRODUCT QUANTITIES
    UPDATE products p 
    SET quantity = COALESCE((SELECT SUM(stock) FROM product_warehouse pw WHERE pw.pid = p.pid), 0);

    -- G. UPDATE PRODUCT LAST_UPDATED TIMESTAMPS
    UPDATE products p
    SET last_updated = (
        SELECT MAX(time) 
        FROM transactions t 
        WHERE t.pid = p.pid
    )
    WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.pid = p.pid);

    RAISE NOTICE 'Seed data generation complete!';
    RAISE NOTICE 'Created % employees', array_length(emp_ids, 1);
    RAISE NOTICE 'Generated % orders with diverse statuses', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Generated % transactions', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE 'Generated % bills', (SELECT COUNT(*) FROM bills);
    RAISE NOTICE 'Tracked % price changes', (SELECT COUNT(*) FROM price_history);
END $$;

-- 8. CREATE MORE RECENT/CURRENT ORDERS FOR DEMONSTRATION
-- Add 50+ recent orders with various statuses so the orders page isn't empty
DO $$
DECLARE
    p_rec RECORD;
    s_rec RECORD;
    w_rec RECORD;
    emp_id UUID;
    order_qty INT;
    i INT;
    days_ago INT;
    order_status_val order_status;
BEGIN
    -- Get a random employee for order creation
    SELECT e_id INTO emp_id FROM employees ORDER BY random() LIMIT 1;
    
    -- Create 60 recent orders with various statuses
    FOR i IN 1..60 LOOP
        SELECT * INTO p_rec FROM products ORDER BY random() LIMIT 1;
        SELECT * INTO s_rec FROM suppliers ORDER BY random() LIMIT 1;
        SELECT * INTO w_rec FROM warehouses ORDER BY random() LIMIT 1;
        
        order_qty := 10 + floor(random() * 80)::int;
        days_ago := floor(random() * 30)::int; -- Orders from last 30 days
        
        -- Distribute statuses realistically
        CASE floor(random() * 10)::int
            WHEN 0, 1, 2 THEN order_status_val := 'pending';      -- 30%
            WHEN 3, 4 THEN order_status_val := 'approved';        -- 20%
            WHEN 5, 6 THEN order_status_val := 'ordered';         -- 20%
            WHEN 7, 8 THEN order_status_val := 'shipped';         -- 20%
            ELSE order_status_val := 'received';                  -- 10%
        END CASE;
        
        INSERT INTO orders (quantity, status, p_id, sup_id, target_w_id, price, date, created_by, created_at, updated_at)
        VALUES (
            order_qty,
            order_status_val,
            p_rec.pid,
            s_rec.sup_id,
            w_rec.w_id,
            ROUND((p_rec.unit_price * order_qty * (0.90 + random() * 0.08))::NUMERIC, 2),
            CURRENT_DATE - days_ago,
            emp_id,
            CURRENT_TIMESTAMP - (days_ago || ' days')::interval,
            CURRENT_TIMESTAMP - (days_ago || ' days')::interval + (floor(random() * 24) || ' hours')::interval
        );
    END LOOP;
    
    RAISE NOTICE 'Created 60 recent orders for the orders page';
END $$;

-- 9. DISPLAY SUMMARY STATISTICS
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE POPULATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Products: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'Total Inventory: % units', (SELECT SUM(quantity) FROM products);
    RAISE NOTICE 'Warehouses: %', (SELECT COUNT(*) FROM warehouses);
    RAISE NOTICE 'Suppliers: %', (SELECT COUNT(*) FROM suppliers);
    RAISE NOTICE 'Employees: %', (SELECT COUNT(*) FROM employees);
    RAISE NOTICE 'Orders: %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE '  - Pending: %', (SELECT COUNT(*) FROM orders WHERE status = 'pending');
    RAISE NOTICE '  - Approved: %', (SELECT COUNT(*) FROM orders WHERE status = 'approved');
    RAISE NOTICE '  - Ordered: %', (SELECT COUNT(*) FROM orders WHERE status = 'ordered');
    RAISE NOTICE '  - Shipped: %', (SELECT COUNT(*) FROM orders WHERE status = 'shipped');
    RAISE NOTICE '  - Received: %', (SELECT COUNT(*) FROM orders WHERE status = 'received');
    RAISE NOTICE '  - Partial: %', (SELECT COUNT(*) FROM orders WHERE status = 'partial');
    RAISE NOTICE '  - Cancelled: %', (SELECT COUNT(*) FROM orders WHERE status = 'cancelled');
    RAISE NOTICE 'Transactions: %', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE '  - Receive: %', (SELECT COUNT(*) FROM transactions WHERE type = 'receive');
    RAISE NOTICE '  - Take: %', (SELECT COUNT(*) FROM transactions WHERE type = 'take');
    RAISE NOTICE '  - Transfer: %', (SELECT COUNT(*) FROM transactions WHERE type = 'transfer');
    RAISE NOTICE '  - Return: %', (SELECT COUNT(*) FROM transactions WHERE type = 'return');
    RAISE NOTICE '  - Adjustment: %', (SELECT COUNT(*) FROM transactions WHERE type = 'adjustment');
    RAISE NOTICE 'Bills: %', (SELECT COUNT(*) FROM bills);
    RAISE NOTICE 'Price Changes: %', (SELECT COUNT(*) FROM price_history);
    RAISE NOTICE '========================================';
END $$;
