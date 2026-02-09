-- Function to execute dynamic SQL (Careful! High privileges)
-- This is required for the NLP engine to execute arbitrary generated SQL.
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
  -- We split the query by semicolons and execute each non-empty statement.
  -- This ensures multi-statement scripts execute fully.
  FOR stmt IN SELECT unnest(string_to_array(query, ';')) LOOP
    IF trim(stmt) <> '' THEN
      IF UPPER(TRIM(stmt)) LIKE 'SELECT%' OR stmt ILIKE '%RETURNING%' THEN
        EXECUTE 'WITH t AS (' || rtrim(trim(stmt), ';') || ') SELECT json_agg(t) FROM t' INTO result;
        final_result := final_result || COALESCE(result, '[]'::jsonb);
      ELSE
        EXECUTE stmt;
      END IF;
    END IF;
  END LOOP;

  -- 🏁 LOG COMMAND HISTORY
  INSERT INTO command_history (user_id, command, result, success)
  VALUES (auth.uid(), query, final_result, true);
  
  RETURN jsonb_build_object('success', true, 'data', final_result);
EXCEPTION WHEN OTHERS THEN
  -- 🏁 LOG FAILED COMMAND
  INSERT INTO command_history (user_id, command, result, success)
  VALUES (auth.uid(), query, jsonb_build_object('error', SQLERRM), false);

  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Better version for SELECTs to return JSON
CREATE OR REPLACE FUNCTION read_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;
  RETURN result;
END;
$$;
-- Function to preview SQL results without committing (for SELECTs mostly)
CREATE OR REPLACE FUNCTION preview_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  cleaned_query text;
BEGIN
  -- Remove trailing semicolon if present to avoid syntax error in subquery
  cleaned_query := rtrim(query);
  IF right(cleaned_query, 1) = ';' THEN
    cleaned_query := left(cleaned_query, length(cleaned_query) - 1);
  END IF;

  -- Execute and aggregate to JSON
  EXECUTE 'SELECT json_agg(t) FROM (' || cleaned_query || ') t' INTO result;
  
  -- 🏁 LOG READ COMMAND
  INSERT INTO command_history (user_id, command, result, success)
  VALUES (auth.uid(), query, result, true);

  -- If result is NULL (zero rows), return an empty array [] instead of NULL
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  -- Fallback for non-SELECT queries or errors
  BEGIN
    EXECUTE query;
    -- 🏁 LOG COMMAND
    INSERT INTO command_history (user_id, command, result, success)
    VALUES (auth.uid(), query, '[]'::jsonb, true);
    RETURN '[]'::jsonb;
  EXCEPTION WHEN OTHERS THEN
    -- 🏁 LOG FAILED COMMAND
    INSERT INTO command_history (user_id, command, result, success)
    VALUES (auth.uid(), query, jsonb_build_object('error', SQLERRM), false);
    RETURN jsonb_build_object('error', SQLERRM);
  END;
END;
$$;

-- Function to seed command history with dummy data
CREATE OR REPLACE FUNCTION seed_command_history()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    u_rec RECORD;
    i INT;
    commands TEXT[] := ARRAY[
        'SELECT * FROM products WHERE quantity < 10',
        'UPDATE product_warehouse SET stock = stock + 50 WHERE w_id = 1 AND pid = 10',
        'INSERT INTO orders (p_id, sup_id, target_w_id, quantity, price, status) VALUES (5, 2, 1, 100, 50000, ''pending'')',
        'DELETE FROM transactions WHERE t_id = 45',
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ''public''',
        'UPDATE employees SET role_id = 1 WHERE e_id = ''e761623b-0000-0000-0000-000000000001''',
        'SELECT SUM(stock * unit_price) FROM products JOIN product_warehouse ON products.pid = product_warehouse.pid WHERE w_id = 2',
        'INSERT INTO product_warehouse (pid, w_id, stock) VALUES (12, 3, 25) ON CONFLICT (pid, w_id) DO UPDATE SET stock = product_warehouse.stock + 25'
    ];
BEGIN
    FOR u_rec IN SELECT id FROM auth.users LIMIT 10 LOOP
        FOR i IN 1..15 LOOP
            INSERT INTO command_history (user_id, command, result, success, created_at)
            VALUES (
                u_rec.id,
                commands[1 + floor(random() * array_length(commands, 1))::int],
                jsonb_build_object('rows_affected', floor(random() * 10)::int, 'timestamp', now()),
                (random() > 0.1), -- 90% success rate
                now() - (floor(random() * 30) || ' days')::interval
            );
        END LOOP;
    END LOOP;
    RETURN 'Seed successful';
END;
$$;

