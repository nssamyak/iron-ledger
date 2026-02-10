import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getServerRole } from "@/utils/roles";

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
6. Pre-Flight Permission Protocol (DIRECT DENIAL): You MUST cross-reference the user's Role (found in 'userContext') with the 'Access Control' rules before setting any operational 'intent'.
   - If a 'Sales Rep' requests ANY change (move, order, adjustment, etc.): You MUST set intent="none", classification.risk="high", system_checks.permissions.status="unauthorized". In 'message', DIRECTLY DENY the request, explaining that your security clearance is limited to system auditing and reporting. DO NOT generate parameters or plans.
   - If 'Warehouse Staff' requests 'order' or 'cancel': You MUST set intent="none", classification.risk="high", system_checks.permissions.status="unauthorized". In 'message', DIRECTLY REFUSE the procurement request, stating it requires Management authorization.
   - POLICY: If the Role lacks authority, the only acceptable output is 'intent': 'none' with a refusal message.

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
Access Control: 
- Admin: Unlimited operational authority.
- Manager: Full logistics and procurement oversight.
- Warehouse Staff: Restricted to logistics execution (move, receive, adjustment). CANNOT execute orders or cancellations.
- Sales Rep: READ-ONLY access to ALL tables (including Orders/Transactions). STRICTLY FORBIDDEN from creating or modifying data (No INSERT/UPDATE/DELETE).
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

        let role = 'guest';
        let userContext = "Current User: Guest";
        if (user) {
            role = await getServerRole(supabase, user.id);

            // Get employee record for context
            const { data: urData } = await supabase.from('user_roles').select('emp_id').eq('user_id', user.id).maybeSingle();
            const empId = urData?.emp_id;

            let empData = null;
            if (empId) {
                const { data: e } = await supabase.from('employees').select('e_id, f_name').eq('e_id', empId).maybeSingle();
                empData = e;
            } else {
                const { data: e } = await supabase.from('employees').select('e_id, f_name').eq('user_id', user.id).maybeSingle();
                empData = e;
            }

            if (empData) {
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
        // SECURITY: Context is allowed for Sales Reps to answer queries, but ACTIONS are blocked below.
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

            // --- Hard-Locked Backend Intent Interceptor ---
            // Even if the AI hallucinated an action, the backend will strip it if permissions fail.
            const intent = parsedData.intent;
            const isPurchaseIntent = (intent === 'order' || intent === 'cancel' || (intent === 'plan' && parsedData.plan?.[0]?.intent === 'order'));

            if (role === 'sales_representative') {
                const isManipulationSql = parsedData.sql && /^(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)/i.test(parsedData.sql.trim());

                // For Sales Reps: Only allow Queries. Block all manipulation or plans.
                // We do NOT block specific tables anymore (they can view orders), just actions.
                const forbidden = /order|purchase|procure|buy|sell|move|transfer|receive|cancel|adjust|ship|delete|update|insert|coordinate|split|optimize/i.test(message);
                const isQuery = intent === 'query' || (!intent && !parsedData.plan && !parsedData.sql);
                const hasOperationalPlan = parsedData.plan?.some((p: any) => p.intent && p.intent !== 'query');

                // If not a clear query, or contains manipulation, or triggers operational flags
                if (!isQuery || isManipulationSql || hasOperationalPlan || parsedData.is_split_suggestion || (forbidden && intent !== 'query')) {
                    parsedData.intent = 'none';
                    parsedData.plan = [];
                    parsedData.sql = null;
                    parsedData.is_split_suggestion = false;
                    parsedData.classification = { ...parsedData.classification, risk: 'high', intent_type: 'view' };
                    parsedData.message = "NOT VALID: Access Denied. Your Sales Representative account is restricted to read-only access. I cannot perform or plan this action.";
                    // Strip system_checks to prevent "analytics" from showing
                    delete parsedData.system_checks;
                }
            }
            else if (role === 'warehouse_staff') {
                // Warehouse Staff cannot perform procurement (order/cancel)
                if (isPurchaseIntent) {
                    parsedData.intent = 'none';
                    parsedData.plan = [];
                    parsedData.message = "DIRECT REFUSAL: Procurement and Order Cancellation are restricted to Management. Your Warehouse Staff role lacks the necessary authorization.";
                    parsedData.system_checks = { ...parsedData.system_checks, permissions: { status: 'unauthorized', message: 'Procurement restriction.' } };
                }
            }

            // Persistent Risk Auditing: If the AI flags this as High Risk, record it in our security table
            if (parsedData.classification?.risk === 'high' || !['none', 'query'].includes(parsedData.intent)) {
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