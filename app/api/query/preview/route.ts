import { createClient } from "@/utils/supabase/server";
import { getServerRole } from "@/utils/roles";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { sql } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getServerRole(supabase, user.id);

    // For Sales Rep, only allow SELECT in preview
    if (role === 'sales_representative') {
        const isManipulation = /^(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)/i.test(sql.trim());
        if (isManipulation) {
            return NextResponse.json({
                error: "Access Denied: Sales Representative role is restricted to data visualization. Previews for data manipulation are disabled."
            }, { status: 403 });
        }
    }

    const { data, error } = await supabase.rpc('preview_sql', { query: sql });

    if (error) {
        return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({ data });
}
