-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Enum Types
-- -----------------------------------------------------------------------------
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'warehouse_staff', 'procurement_officer');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'ordered', 'shipped', 'received', 'cancelled', 'reordered', 'partial');
CREATE TYPE transaction_type AS ENUM ('take', 'return', 'transfer', 'adjustment', 'receive');

-- -----------------------------------------------------------------------------
-- Table: Categories
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  c_id SERIAL PRIMARY KEY,
  cat_name VARCHAR NOT NULL,
  parent_id INTEGER REFERENCES categories(c_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Products
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  pid SERIAL PRIMARY KEY,
  p_name VARCHAR NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  manufacturer VARCHAR,
  c_id INTEGER REFERENCES categories(c_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Departments
-- -----------------------------------------------------------------------------
CREATE TABLE departments (
  d_id SERIAL PRIMARY KEY,
  d_name VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Roles
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Employees
-- -----------------------------------------------------------------------------
CREATE TABLE employees (
  e_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- Linked to Supabase Auth
  f_name VARCHAR NOT NULL,
  l_name VARCHAR NOT NULL,
  e_name VARCHAR GENERATED ALWAYS AS (f_name || ' ' || l_name) STORED,
  d_id INTEGER REFERENCES departments(d_id),
  role_id INTEGER REFERENCES roles(role_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Warehouses
-- -----------------------------------------------------------------------------
CREATE TABLE warehouses (
  w_id SERIAL PRIMARY KEY,
  w_name VARCHAR NOT NULL,
  address TEXT,
  mgr_id UUID REFERENCES employees(e_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Suppliers
-- -----------------------------------------------------------------------------
CREATE TABLE suppliers (
  sup_id SERIAL PRIMARY KEY,
  s_name VARCHAR NOT NULL,
  address TEXT,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: User Roles (For RLS)
-- -----------------------------------------------------------------------------
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- -----------------------------------------------------------------------------
-- Table: Product Warehouse (Junction)
-- -----------------------------------------------------------------------------
CREATE TABLE product_warehouse (
  pid INTEGER REFERENCES products(pid),
  w_id INTEGER REFERENCES warehouses(w_id),
  stock INTEGER DEFAULT 0,
  PRIMARY KEY (pid, w_id)
);

-- -----------------------------------------------------------------------------
-- Table: Orders
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  po_id SERIAL PRIMARY KEY,
  quantity INTEGER NOT NULL,
  status order_status DEFAULT 'pending',
  p_id INTEGER REFERENCES products(pid),
  sup_id INTEGER REFERENCES suppliers(sup_id),
  target_w_id INTEGER REFERENCES warehouses(w_id),
  price NUMERIC,
  date DATE DEFAULT CURRENT_DATE,
  received_quantity INTEGER DEFAULT 0,
  last_received_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES employees(e_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Transactions
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
  t_id SERIAL PRIMARY KEY,
  time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amt INTEGER NOT NULL,
  type transaction_type NOT NULL,
  pid INTEGER REFERENCES products(pid),
  w_id INTEGER REFERENCES warehouses(w_id),
  target_w_id INTEGER REFERENCES warehouses(w_id),
  e_id UUID REFERENCES employees(e_id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: Bills
-- -----------------------------------------------------------------------------
CREATE TABLE bills (
  bill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id INTEGER REFERENCES orders(po_id),
  supplier_id INTEGER REFERENCES suppliers(sup_id),
  file_url TEXT NOT NULL,
  file_type VARCHAR,
  uploaded_by UUID REFERENCES employees(e_id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  invoice_data JSONB DEFAULT '{}'
);

-- -----------------------------------------------------------------------------
-- Table: Command History (NLP)
-- -----------------------------------------------------------------------------
CREATE TABLE command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  command TEXT NOT NULL,
  result JSONB,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) Policies (Basic Setup - to be refined)
-- -----------------------------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users for now
-- (Specific role-based policies will be added in a separate migration/step for clarity)
CREATE POLICY "Enable read access for authenticated users" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON product_warehouse FOR SELECT TO authenticated USING (true);

-- Policies for orders and transactions
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for bills
CREATE POLICY "Enable insert for authenticated users" ON bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable read for authenticated users" ON bills FOR SELECT TO authenticated USING (true);

-- Storage Setup (Requires storage schema)
-- Note: In a real Supabase environment, you might need to run these in the SQL Editor
-- if the 'storage' schema is not automatically available in your migration context.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-assets', 'order-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-assets');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-assets');

-- Function to handle new user signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.employees (user_id, f_name, l_name)
  values (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'last_name', 'User')
  );
  
  -- Default role assignment
  insert into public.user_roles (user_id, role)
  values (new.id, 'warehouse_staff');
  
  return new;
end;
$$;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
