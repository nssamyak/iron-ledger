-- Add sales_representative to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales_representative';

-- Create a role entry for Sales Representative in the roles table
INSERT INTO roles (role_name, permissions)
VALUES 
  ('Sales Representative', '{"view_inventory": true, "view_orders": true, "manage_inventory": false, "manage_orders": false, "manage_users": false}')
ON CONFLICT (role_name) DO NOTHING;

-- Map any existing procurement_officer user_roles to warehouse_staff (merging them)
UPDATE user_roles
SET role = 'warehouse_staff'
WHERE role = 'procurement_officer';

-- We intentionally do not remove 'procurement_officer' from the ENUM as Postgres does not support removing enum values easily
-- and it might be needed for historical data if we didn't update everything. 
-- However, we have updated the active assignments above.

-- Update policies to restrict sales_representative to VIEW only
-- This is a high-level policy update pattern. For strict RLS, we'd need to edit the specific policy definitions.
-- For now, the application-level logic (Sidebar/Page access) handles the view/edit distinction, 
-- and we rely on RLS policies that check for 'admin'/'manager'/'warehouse_staff' for INSERT/UPDATE.
