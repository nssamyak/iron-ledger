import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const SCHEMA_CONTEXT = `
You are a PostgreSQL expert and Intelligent Logistics Architect for IronLedger.
Schema:
- products(pid, p_name, unit_price)
- warehouses(w_id, w_name, capacity) -- capacity: max units the warehouse can hold.
- suppliers(sup_id, s_name, lead_time_days) -- lead_time_days: average days for delivery.
- orders(po_id, quantity, received_quantity, status, p_id, target_w_id, created_by)
- product_warehouse(pid, w_id, stock, min_stock)
- transactions(t_id, amt, type, pid, w_id, e_id, time, description)

Strategic Reasoning Rules:
1. Multi-Action Planning: If a request involves large quantities that exceed a warehouse's capacity or suggests a complex flow, you MUST generate a 'plan' array of multiple actions.
   - Example (Split Order): User orders 500 units, but W1 (capacity 200) only has room for 50. Suggest split: Order 50 to W1, Order 450 to W2.
2. Capacity Calculus: Always analyze (capacity - current_stock) for target warehouses before suggesting actions.
3. Classification: view/modify/plan/investigate, risk, time_sensitivity.
4. Financial & Operational Guardianship: You are the guardian of company capital. If a request involves extreme quantities (e.g., ordering 10k of a high-value item) or unusual patterns, you MUST:
   - Feasibility Check: Cross-reference unit_price with quantity to estimate financial impact.
   - Anomaly Detection: If the quantity seems like a typo (e.g. 10,000 instead of 10), flag it as a potential error.
   - Strategic Advice: In the 'message', advise on whether the expenditure is justifiable given current stock velocity and capacity. Don't just execute; audit.
5. Intelligent Insights: Provide actionable advice in the 'message', explaining the 'why' behind your logistical suggestions.

Output Format: Return ONLY a JSON object: {
    "intent": "plan" | "move" | "order" | "adjustment" | "receive" | "cancel" | "query" | "none", 
    "classification": {
      "intent_type": "view" | "modify" | "plan" | "investigate",
      "risk": "low" | "medium" | "high",
      "time_sensitivity": "normal" | "urgent" | "critical"
    },
    "system_checks": {
      "stock": { "status": "ok" | "warning" | "alert", "message": "..." },
      "capacity": { "status": "ok" | "warning" | "alert", "message": "..." },
      "lead_time": { "status": "ok" | "warning", "message": "..." },
      "permissions": { "status": "authorized" | "unauthorized", "message": "..." }
    },
    "plan": [
      {
        "intent": "move" | "order" | "adjustment" | "receive" | "cancel" | "query",
        "params": { 
            "pid": number | null, "w_id": number | null, "target_w_id": number | null, 
            "sup_id": number | null, "po_id": number | null, "quantity": number, "price": number | null 
        },
        "sql": "ONLY if intent='query' - SELECT statement",
        "description": "Logistical rationale for this specific step"
      }
    ],
    "message": "Strategic summary of the proposed plan.",
    "is_split_suggestion": boolean
  }.

ID Resolution: Match names to IDs using the provided context. Use ILIKE '%name%' in SQL.
Access Control: Admin (Full), Manager (Assigned Warehouse), Sales Rep (READ-ONLY).
Persona: Proactive, strategic logistics architect.
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

        // Fetch meta-data for AI to resolve IDs and perform reasoning
        const [products, warehouses, suppliers, orders, transactions, stockLevels] = await Promise.all([
            supabase.from('products').select('pid, p_name, unit_price').limit(100),
            supabase.from('warehouses').select('w_id, w_name, capacity').limit(20),
            supabase.from('suppliers').select('sup_id, s_name, lead_time_days').limit(20),
            supabase.from('orders')
                .select(`po_id, quantity, received_quantity, status, products(p_name), suppliers(s_name)`)
                .neq('status', 'received')
                .limit(50),
            supabase.from('transactions').select('*').order('time', { ascending: false }).limit(20),
            supabase.from('product_warehouse').select('pid, w_id, stock, min_stock').limit(100)
        ]);

        const metaContext = `
Available Products: ${JSON.stringify(products.data || [])}
Available Warehouses: ${JSON.stringify(warehouses.data || [])}
Available Suppliers: ${JSON.stringify(suppliers.data || [])}
Active Orders (Partial/Pending): ${JSON.stringify(orders.data || [])}
Recent Transactions: ${JSON.stringify(transactions.data || [])}
Current Stock Levels: ${JSON.stringify(stockLevels.data || [])}
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

            // Persistent Risk Auditing: If the AI flags this as High Risk, record it in our security table
            if (parsedData.classification?.risk === 'high') {
                try {
                    const adminSupabase = createAdminClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    // Extract relevant metadata for auditing
                    const exposure = parsedData.plan?.reduce((sum: number, p: any) => sum + ((p.params?.quantity || 0) * (p.params?.price || 0)), 0) || 0;

                    await adminSupabase.from('risk_alerts').insert({
                        trigger_message: message,
                        risk_score: 95, // High risk default
                        reason: parsedData.message || "High Capital Exposure Detected",
                        status: 'open',
                        metadata: {
                            classification: parsedData.classification,
                            exposure: exposure,
                            plan: parsedData.plan,
                            user_context: userContext
                        }
                    });
                } catch (auditErr) {
                    console.error("Failed to persist high-risk alert:", auditErr);
                }
            }

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