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
  
  -- If result is NULL (zero rows), return an empty array [] instead of NULL
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  -- Fallback for non-SELECT queries or errors
  BEGIN
    EXECUTE query;
    RETURN '[]'::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
  END;
END;
$$;

