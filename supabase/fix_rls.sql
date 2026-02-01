-- 1. FIX THE SQL EXECUTION FUNCTION (Crucial for multi-statement updates)
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stmt text;
  result jsonb;
  final_result jsonb := '[]'::jsonb;
BEGIN
  FOR stmt IN SELECT unnest(string_to_array(query, ';')) LOOP
    IF trim(stmt) <> '' THEN
      IF UPPER(TRIM(stmt)) LIKE 'SELECT%' OR stmt ILIKE '%RETURNING%' THEN
        EXECUTE 'SELECT json_agg(t) FROM (' || rtrim(trim(stmt), ';') || ') t' INTO result;
        final_result := final_result || COALESCE(result, '[]'::jsonb);
      ELSE
        EXECUTE stmt;
      END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'data', final_result);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. ENSURE THE BUCKET EXISTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-assets', 'order-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. STORAGE POLICIES
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-assets');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-assets');

-- 4. TABLE POLICIES (BILLS, ORDERS, TRANSACTIONS)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bills;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON bills;
CREATE POLICY "Enable insert for authenticated users" ON bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable read for authenticated users" ON bills FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON orders;
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON transactions;
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;
CREATE POLICY "Enable read access for authenticated users" ON products FOR SELECT TO authenticated USING (true);
