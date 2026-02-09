import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SCHEMA_CONTEXT = `
You are a PostgreSQL expert for an inventory management system (IronLedger).
Schema:
- products(pid, p_name, unit_price)
- warehouses(w_id, w_name)
- suppliers(sup_id, s_name)
- orders(po_id, quantity, received_quantity, status, p_id, target_w_id, created_by) -- status: 'pending', 'approved', 'ordered', 'shipped', 'received', 'cancelled', 'cancel_pending'
- product_warehouse(pid, w_id, stock) -- Junction table linking products to warehouses with stock counts.
- transactions(t_id, amt, type, pid, w_id, e_id, time, description) -- type: 'receive', 'transfer', 'adjustment'
- employees(e_id, f_name, l_name, d_id)
- departments(d_id, d_name)

Operational Rules:
1. Output Format: Return ONLY a JSON object: {
    "intent": "move" | "order" | "adjustment" | "receive" | "cancel" | "query" | "none", 
    "params": { 
      "pid": number | null, 
      "w_id": number | null, 
      "target_w_id": number | null, 
      "sup_id": number | null, 
      "po_id": number | null,
      "quantity": number, 
      "price": number | null 
    }, 
    "message": "Conversational human response",
    "sql": "ONLY for intent='query' - MUST be a valid SELECT statement"
  }.
2. ID Resolution: Match names to IDs. 
    - Use ILIKE '%name%' for flexible matching in SQL.
    - If user says "PO-123", extract 123 as 'po_id'.
3. Intent Rules:
    - 'query': Use this for ANY "show", "list", "view", or data-related question.
      - If user says "me", "my", "placed by me", "I created", etc., use "created_by = CUR_EMP_ID" in the WHERE clause.
      - If user asks for "pending" items, filter by status = 'pending'.
      - Joined queries are preferred for readability (e.g. join products for p_name).
      - Example: "show my pending orders" -> SELECT * FROM orders WHERE created_by = CUR_EMP_ID AND status = 'pending';
    - Action Intents (move, order, etc.): These will generate an interactive form. Use these ONLY when the user is clearly asking to PERFORM an action (e.g. "Order 50 X", "Move 10 Y from A to B").
4. Access Control:
    - If role is 'sales_representative', the ONLY allowed intents are 'query' and 'none'.
    - If User Context specifies an 'Assigned Warehouse ID' (w_id), restrict queries/actions to that warehouse.
5. Placeholder: Use CUR_EMP_ID as a literal string in the SQL for the current user's employee ID.
6. Persona: Helpful human warehouse assistant.
`;


export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                error: "OpenRouter API Key not configured."
            }, { status: 500 });
        }

        const body = await req.json();
        const { message } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json({
                error: "Invalid message"
            }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let userContext = "Current User: Guest";
        if (user) {
            // 1. Get mapping from user_roles
            const { data: urData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).maybeSingle();
            const empIdFromUR = (urData as any)?.emp_id;

            // 2. Get employee record
            let empData = null;
            if (empIdFromUR) {
                const { data: e } = await supabase.from('employees').select('e_id, f_name, role_id').eq('e_id', empIdFromUR).maybeSingle();


                empData = e;
            } else {
                const { data: e } = await supabase.from('employees').select('e_id, f_name, role_id').eq('user_id', user.id).maybeSingle();


                empData = e;
            }

            if (empData) {
                // 3. Resolve role name
                let dbRoleName = null;
                if (empData.role_id) {
                    const { data: roleRec } = await supabase.from('roles').select('role_name').eq('role_id', empData.role_id).maybeSingle();
                    dbRoleName = roleRec?.role_name;
                }

                let role = 'warehouse_staff';
                if (dbRoleName === 'Administrator') {
                    role = 'admin';
                } else if (dbRoleName === 'Warehouse Manager') {
                    role = 'manager';
                } else if (dbRoleName) {
                    role = dbRoleName.toLowerCase().replace(/ /g, '_');
                }

                userContext = `Current User Employee ID: ${empData.e_id}, Name: ${empData.f_name}, Role: ${role}`;

                // Check if they manage a warehouse
                const { data: wData } = await supabase.from('warehouses').select('w_id, w_name').eq('mgr_id', empData.e_id).maybeSingle();
                if (wData) {
                    userContext += `, Assigned Warehouse ID: ${wData.w_id} (${wData.w_name})`;
                }
            }
        }

        const { billUrl } = body;
        if (billUrl) {
            userContext += `\nAttached Bill URL: ${billUrl}`;
        }

        // Fetch meta-data for AI to resolve IDs
        const [products, warehouses, suppliers, orders, transactions] = await Promise.all([
            supabase.from('products').select('pid, p_name').limit(100),
            supabase.from('warehouses').select('w_id, w_name').limit(20),
            supabase.from('suppliers').select('sup_id, s_name').limit(20),
            supabase.from('orders')
                .select(`po_id, quantity, received_quantity, status, products(p_name), suppliers(s_name)`)
                .neq('status', 'received')
                .limit(50),
            supabase.from('transactions').select('*').order('time', { ascending: false }).limit(20)
        ]);

        const metaContext = `
Available Products: ${JSON.stringify(products.data || [])}
Available Warehouses: ${JSON.stringify(warehouses.data || [])}
Available Suppliers: ${JSON.stringify(suppliers.data || [])}
Active Orders (Partial/Pending): ${JSON.stringify(orders.data || [])}
Recent Transactions: ${JSON.stringify(transactions.data || [])}
        `.trim();

        console.log("Processing with OpenRouter:", message, "Context:", userContext);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "IronLedger"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: SCHEMA_CONTEXT + "\n" + userContext + "\n" + metaContext },
                    { role: "user", content: `User Request: "${message}"\n\nReturn JSON Response:` }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            console.error("OpenRouter Error Response:", data);
            throw new Error(data.error?.message || "Failed to get response from OpenRouter");
        }

        const content = data.choices[0].message.content;
        console.log("OpenRouter raw response:", content);

        // Clean up markdown code blocks if the AI adds them
        const cleanText = content.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsedData = JSON.parse(cleanText);
            return NextResponse.json(parsedData);
        } catch (e) {
            console.error("JSON Parse Error:", cleanText);
            return NextResponse.json({
                explanation: "I understood your intent but failed to format the response correctly. Please try again.",
                error: "Parse Error"
            });
        }

    } catch (error: any) {
        console.error("OpenRouter API Error:", error);
        return NextResponse.json({
            error: "Failed to process request via OpenRouter",
            explanation: `An error occurred: ${error?.message || 'Unknown error'}`
        }, { status: 500 });
    }
}