-- Enhance schema for intelligent reasoning
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1000;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
ALTER TABLE product_warehouse ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 10;

-- Update some values for demonstration
UPDATE warehouses SET capacity = 500 WHERE w_name ILIKE '%Beta%';
UPDATE warehouses SET capacity = 2000 WHERE w_name ILIKE '%Alpha%';
UPDATE suppliers SET lead_time_days = 14 WHERE s_name ILIKE '%Titan%';
UPDATE suppliers SET lead_time_days = 3 WHERE s_name ILIKE '%FastTrack%';
UPDATE product_warehouse SET min_stock = 50 WHERE pid IN (SELECT pid FROM products LIMIT 5);
