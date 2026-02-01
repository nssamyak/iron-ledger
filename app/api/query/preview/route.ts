import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { sql } = await req.json();
    const supabase = await createClient();

    // Supabase JS client doesn't support raw transactions easily in the way we want (ROLLBACK after select).
    // However, we can use the `.rpc()` if we had a stored proc, OR we can just run the query if it's a SELECT.
    // BUT the requirement is "after each query, perform the query on a temporary copy... if confirm... only then apply".
    // Since we are using Supabase (Postgres) directly via Client, we might be limited.
    // TRICK: We can wrap the query: "BEGIN; [QUERY]; ROLLBACK;"
    // But `supabase.rpc` or `postgres` function calls usually auto-commit or are atomic.

    // BETTER APPROACH for "Preview":
    // 1. If it's a SELECT, just run it.
    // 2. If it's INSERT/UPDATE/DELETE, we CANNOT easily "preview" the result without actually doing it and rolling back.
    // Supabase `rpc` allows executing SQL.

    // We will use a custom RPC function `exec_sql` (need to create this in schema) or simple logic.
    // Since we cannot easily create a true session-based transaction via HTTP stateless request without a connection pooler holding the session, 
    // simulating "Input -> Result" is hard for mutations.

    // ALTERNATIVE: Use `EXPLAIN ANALYZE` or just `RETURNING` events?
    // The user wants to see "Temporary copy".
    // 
    // REALISTIC SOLUTION for Supabase HTTP:
    // We wrap the user SQL in a function that raises an exception at the end to rollback?
    // Or we just "Describe" what will happen for mutation.

    // Let's try to match the user request "perform the query on a temporary copy".
    // We can wrap:
    // BEGIN;
    // [USER SQL] RETURNING *; -- Capture output
    // ROLLBACK; 

    // We need a postgres function `exec_sql_readonly` that takes sql query, executes it, captures result, and rolls back?
    // No, plpgsql functions run inside a transaction. If we raise error, we see error, not data.

    // Workaround: We will interpret the query.
    // If SELECT: Run and return.
    // If INSERT/UPDATE: We will try to run inside a `BEGIN; ...; ROLLBACK;` block if using a direct connection (node-postgres).
    // But we are using `supabase-js`. `supabase-js` doesn't support arbitrary SQL execution unless we use `rpc` with a function that takes SQL.

    // Let's use `rpc` 'exec_sql' (we need to create this unsafe function for this demo).
    // Note: Allowing arbitrary SQL via RPC is dangerous (SQL Injection) but this is an NLP app specifically DESIGNED to run SQL.

    // To support "Preview" (Rollback):
    // We will execute: "BEGIN; result := [QUERY]; ROLLBACK; return result;"

    // For now, I'll assume we can use `rpc` call to a function `preview_sql(query_text)` that I will define in the schema now.

    const { data, error } = await supabase.rpc('preview_sql', { query: sql });

    if (error) {
        return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({ data });
}
