-- =====================================================
-- IronLedger: Ultra-Realistic & Comprehensive Seed
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
('Executive'), ('Logistics'), ('Procurement'), ('Quality Control'), ('Sales'), ('IT Support');

INSERT INTO roles (role_name, permissions) VALUES 
('Administrator', '{"all": true}'::jsonb),
('Warehouse Manager', '{"inventory": "full", "orders": "read"}'::jsonb),
('Procurement Officer', '{"orders": "full", "suppliers": "full"}'::jsonb),
('Inventory Specialist', '{"inventory": "write"}'::jsonb);

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
('Warehouse-Delta (East)', '101 Atlantic Ave, Brooklyn, NY');

INSERT INTO suppliers (s_name, address, contact_email, contact_phone) VALUES
('Global Tech Supplies', 'California, USA', 'sales@globaltech.com', '+1-555-0100'),
('MicroCircuit Corp', 'Hsinchu, Taiwan', 'orders@microcircuit.tw', '+886-3-5550200'),
('Apex Logistics', 'Texas, USA', 'support@apexlogistics.com', '+1-512-5550300'),
('Titan Industrial', 'Shenzhen, China', 'export@titan-ind.cn', '+86-755-5550400'),
('FastTrack Components', 'Berlin, Germany', 'contact@fasttrack.de', '+49-30-5550500');

-- 5. PRODUCTS (Approx 30 items)
INSERT INTO products (p_name, description, quantity, unit_price, manufacturer, c_id) VALUES
('Intel Core i9-14900K', 'High-end desktop CPU', 0, 589.99, 'Intel', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('AMD Ryzen 7 7800X3D', 'Gaming champion CPU', 0, 449.00, 'AMD', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('NVIDIA RTX 4080 Super', 'High-end gaming GPU', 0, 999.99, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('NVIDIA RTX 4070 Ti', 'Mid-high range GPU', 0, 799.99, 'NVIDIA', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('ASUS ROG Strix Z790', 'Overclocking motherboard', 0, 399.00, 'ASUS', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Corsair Vengeance 32GB DDR5', '6000MHz Performance RAM', 0, 129.99, 'Corsair', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),
('G.Skill Trident Z5 64GB', 'DDR5 memory kit', 0, 249.99, 'G.Skill', (SELECT c_id FROM categories WHERE cat_name = 'Memory')),
('Samsung 990 Pro 1TB', 'PCIe 4.0 NVMe SSD', 0, 119.99, 'Samsung', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('Western Digital Black 4TB', 'High capacity HDD', 0, 159.99, 'WD', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('LG UltraGear 27GP850', '27 inch QHD Gaming Monitor', 0, 399.99, 'LG', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('Dell UltraSharp 32', '4K Professional Monitor', 0, 899.00, 'Dell', (SELECT c_id FROM categories WHERE cat_name = 'Monitors')),
('Logitech G Pro X Superlight', 'Ultra-light gaming mouse', 0, 149.99, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Razer Huntsman V3 Pro', 'Analog optical keyboard', 0, 249.99, 'Razer', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Cisco Catalyst 1000', '24-port Managed Switch', 0, 850.00, 'Cisco', (SELECT c_id FROM categories WHERE cat_name = 'Switches')),
('Ubiquiti UniFi Dream Router', 'Integrated Router & AP', 0, 199.00, 'Ubiquiti', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('Sony WH-1000XM5', 'Noise cancelling headphones', 0, 399.99, 'Sony', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('Crucial T700 2TB', 'PCIe 5.0 NVMe SSD', 0, 279.99, 'Crucial', (SELECT c_id FROM categories WHERE cat_name = 'Storage')),
('ASUS TUF Gaming OC RTX 4090', 'Extreme 4090 GPU', 0, 1999.00, 'ASUS', (SELECT c_id FROM categories WHERE cat_name = 'Graphics Cards')),
('Noctua NH-D15', 'Premium CPU Air Cooler', 0, 119.00, 'Noctua', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Seasonic PRIME 1000W', 'Titanium Efficiency PSU', 0, 299.00, 'Seasonic', (SELECT c_id FROM categories WHERE cat_name = 'Core Hardware')),
('Cat6a Ethernet Cable 10m', 'High speed networking cable', 0, 25.00, 'Generic', (SELECT c_id FROM categories WHERE cat_name = 'Cables')),
('Netgear NightHawk M6', '5G Mobile Router', 0, 799.99, 'Netgear', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('Logitech MX Master 3S', 'Professional wireless mouse', 0, 99.99, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Keychron Q1 Max', 'Custom Mechanical Keyboard', 0, 189.00, 'Keychron', (SELECT c_id FROM categories WHERE cat_name = 'Input Devices')),
('Intel Core i7-14700K', 'Performance desktop CPU', 0, 399.99, 'Intel', (SELECT c_id FROM categories WHERE cat_name = 'Processors')),
('HyperX Cloud II', 'Gaming Headset', 0, 99.00, 'HP', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('MikroTik RB5009', 'Heavy-duty router', 0, 199.00, 'MikroTik', (SELECT c_id FROM categories WHERE cat_name = 'Routers')),
('Epson EcoTank Pro', 'Supertank color printer', 0, 899.00, 'Epson', (SELECT c_id FROM categories WHERE cat_name = 'Peripherals')),
('Blue Yeti USB Mic', 'Streaming microphone', 0, 129.00, 'Logitech', (SELECT c_id FROM categories WHERE cat_name = 'Audio')),
('Samsung Odyssey G9', '49" Super Ultrawide', 0, 1299.00, 'Samsung', (SELECT c_id FROM categories WHERE cat_name = 'Monitors'));

-- 6. DYNAMIC DATA: EMPLOYEES & HISTORY
DO $$
DECLARE
    u_rec RECORD;
    emp_id UUID;
    p_rec RECORD;
    w_rec RECORD;
    s_rec RECORD;
    new_po_id INT;
    order_qty INT;
    t_date TIMESTAMP;
    i INT;
BEGIN
    -- A. CREATE EMPLOYEES FOR ALL AUTH USERS
    FOR u_rec IN SELECT id, email FROM auth.users LOOP
        INSERT INTO employees (user_id, f_name, l_name, role_id, d_id)
        VALUES (
            u_rec.id, 
            split_part(u_rec.email, '@', 1), 
            'Staff', 
            (SELECT role_id FROM roles ORDER BY random() LIMIT 1),
            (SELECT d_id FROM departments ORDER BY random() LIMIT 1)
        )
        RETURNING e_id INTO emp_id;

        -- Assign User Role for RLS
        INSERT INTO user_roles (user_id, role) 
        VALUES (u_rec.id, 'admin') -- Grant all admin for demo purposes
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Pick one employee for following actions
    SELECT e_id INTO emp_id FROM employees LIMIT 1;

    -- B. PROCUREMENT HISTORY (50 Orders)
    FOR i IN 1..50 LOOP
        SELECT * INTO p_rec FROM products ORDER BY random() LIMIT 1;
        SELECT * INTO w_rec FROM warehouses ORDER BY random() LIMIT 1;
        SELECT * INTO s_rec FROM suppliers ORDER BY random() LIMIT 1;
        
        order_qty := 10 + floor(random() * 100)::int;
        t_date := CURRENT_TIMESTAMP - (floor(random() * 90) || ' days')::interval;
        
        INSERT INTO orders (quantity, status, p_id, sup_id, target_w_id, price, date, received_quantity, last_received_at, created_by)
        VALUES (
            order_qty, 
            'received', 
            p_rec.pid, 
            s_rec.sup_id, 
            w_rec.w_id, 
            (p_rec.unit_price * order_qty * 0.94), -- Bulk price
            t_date::date,
            order_qty,
            t_date + interval '2 days',
            emp_id
        )
        RETURNING po_id INTO new_po_id;

        INSERT INTO bills (order_id, supplier_id, file_url, file_type, uploaded_by, notes)
        VALUES (new_po_id, s_rec.sup_id, 'https://cdn.ironledger.io/bills/inv_' || new_po_id || '.pdf', 'application/pdf', emp_id, 'Seed data invoice');

        INSERT INTO transactions (amt, type, pid, w_id, target_w_id, e_id, description, time)
        VALUES (order_qty, 'receive', p_rec.pid, w_rec.w_id, NULL, emp_id, 'Stock Inbound PO-' || new_po_id, t_date + interval '2 days');
    END LOOP;

    -- C. OPERATIONAL MOVEMENTS (200 Transactions)
    FOR i IN 1..200 LOOP
        SELECT * INTO p_rec FROM products ORDER BY random() LIMIT 1;
        t_date := CURRENT_TIMESTAMP - (floor(random() * 60) || ' days')::interval;
        SELECT * INTO w_rec FROM warehouses ORDER BY random() LIMIT 1;
        
        CASE floor(random() * 5)::int
            WHEN 0 THEN -- Transfer
                INSERT INTO transactions (amt, type, pid, w_id, target_w_id, e_id, description, time)
                VALUES (5, 'transfer', p_rec.pid, w_rec.w_id, (SELECT w_id FROM warehouses WHERE w_id != w_rec.w_id ORDER BY random() LIMIT 1), emp_id, 'Inter-warehouse transfer', t_date);
            WHEN 1, 2, 3 THEN -- Outgoing / Sale
                INSERT INTO transactions (amt, type, pid, w_id, e_id, description, time)
                VALUES (-(1 + floor(random() * 10)::int), 'take', p_rec.pid, w_rec.w_id, emp_id, 'Customer Order Pickup', t_date);
            ELSE -- Adjustment
                INSERT INTO transactions (amt, type, pid, w_id, e_id, description, time)
                VALUES ((CASE WHEN random() > 0.5 THEN 1 ELSE -1 END), 'adjustment', p_rec.pid, w_rec.w_id, emp_id, 'Inventory audit correction', t_date);
        END CASE;
    END LOOP;

    -- D. FINAL AGGREGATION
    -- Sync warehouse distribution first
    INSERT INTO product_warehouse (pid, w_id, stock)
    SELECT pid, w_id, SUM(deltas) as current_stock
    FROM (
        SELECT pid, w_id, amt as deltas FROM transactions WHERE type != 'transfer'
        UNION ALL
        SELECT pid, w_id, -amt FROM transactions WHERE type = 'transfer'
        UNION ALL
        SELECT pid, target_w_id as w_id, amt FROM transactions WHERE type = 'transfer'
    ) sub
    WHERE w_id IS NOT NULL
    GROUP BY pid, w_id
    HAVING SUM(deltas) > 0;

    -- Then sync global product quantity from the warehouse totals
    UPDATE products p SET quantity = COALESCE((SELECT SUM(stock) FROM product_warehouse pw WHERE pw.pid = p.pid), 0) WHERE true;
END $$;
