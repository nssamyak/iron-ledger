import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SCHEMA_CONTEXT = `
You are a PostgreSQL expert for an inventory management system (IronLedger).
Schema:
- products(pid, p_name, unit_price)
- warehouses(w_id, w_name)
- suppliers(sup_id, s_name)
- orders(po_id, quantity, received_quantity, status, p_id, target_w_id) -- status: 'pending', 'partial', 'received'
- transactions...

Operational Rules:
1. Output Format: Return ONLY a JSON object: {
    "intent": "move" | "order" | "adjustment" | "receive" | "query" | "none", 
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
    "sql": "ONLY for intent='query'"
  }.
2. ID Resolution: Match names to IDs. For 'receive', try to match the most relevant active order (po_id) based on the product or supplier mentioned.
3. Intent Rules:
   - 'receive': Used when a user mentions receiving stock from an existing order.
   - 'query': SELECT queries.
   - Others: Action forms.
4. Persona: Helpful human warehouse assistant.
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
            const [empRes, roleRes] = await Promise.all([
                supabase.from('employees').select('e_id, f_name').eq('user_id', user.id).single(),
                supabase.from('user_roles').select('role').eq('user_id', user.id).single()
            ]);

            if (empRes.data) {
                userContext = `Current User Employee ID: ${empRes.data.e_id}, Name: ${empRes.data.f_name}, Role: ${roleRes.data?.role || 'warehouse_staff'}`;
            }
        }

        const { billUrl } = body;
        if (billUrl) {
            userContext += `\nAttached Bill URL: ${billUrl}`;
        }

        // Fetch meta-data for AI to resolve IDs
        const [products, warehouses, suppliers, orders] = await Promise.all([
            supabase.from('products').select('pid, p_name').limit(100),
            supabase.from('warehouses').select('w_id, w_name').limit(20),
            supabase.from('suppliers').select('sup_id, s_name').limit(20),
            supabase.from('orders')
                .select(`po_id, quantity, received_quantity, status, products(p_name), suppliers(s_name)`)
                .neq('status', 'received')
                .limit(50)
        ]);

        const metaContext = `
Available Products: ${JSON.stringify(products.data || [])}
Available Warehouses: ${JSON.stringify(warehouses.data || [])}
Available Suppliers: ${JSON.stringify(suppliers.data || [])}
Active Orders (Partial/Pending): ${JSON.stringify(orders.data || [])}
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