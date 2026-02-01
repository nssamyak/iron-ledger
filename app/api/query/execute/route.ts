import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { sql } = await req.json();
    const supabase = await createClient();

    // Use RPC to execute raw SQL permanently.
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        return NextResponse.json({ success: false, error: error.message });
    }

    // Since exec_sql returns a jsonb object like { success: boolean, data: [], error: string }
    if (data && typeof data === 'object' && data.success === false) {
        return NextResponse.json({ success: false, error: data.error || "Internal database error" });
    }

    return NextResponse.json({ success: true, data: data?.data || [] });
}
