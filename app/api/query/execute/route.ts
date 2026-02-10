import { createClient } from "@/utils/supabase/server";
import { getServerRole } from "@/utils/roles";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { sql } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = await getServerRole(supabase, user.id);

    // Hard rejection for Sales Representative trying to manipulate data
    if (role === 'sales_representative') {
        const isManipulation = /^(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)/i.test(sql.trim());
        if (isManipulation) {
            return NextResponse.json({
                success: false,
                error: "Access Denied: Your Sales Representative role is restricted to read-only access. Data manipulation is strictly prohibited."
            }, { status: 403 });
        }
    }

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
