
const { createClient } = require('@supabase/supabase-js');

async function initRiskAlerts() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing environment variables.");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Initializing Risk Alert Infrastructure...");

    const { error: tableError } = await supabase.rpc('exec_sql', {
        sql_string: `
            CREATE TABLE IF NOT EXISTS risk_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                trigger_message TEXT,
                risk_score NUMERIC,
                reason TEXT,
                metadata JSONB,
                is_resolved BOOLEAN DEFAULT false,
                resolved_by UUID REFERENCES employees(e_id),
                status VARCHAR DEFAULT 'new'
            );
            ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
            CREATE POLICY \"Admins can see risk alerts\" ON risk_alerts FOR SELECT TO authenticated USING (
                EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
            );
        `
    }).catch(e => ({ error: e }));

    if (tableError) {
        // Fallback if rpc doesn't exist: attempt via direct query (some supabase setups allow this with service key)
        console.log("RPC exec_sql not found, trying multi-statement injection if possible...");
        // Actually, most supabase projects don't have exec_sql by default.
        // I'll suggest the user to run it in the SQL editor.
        console.log("Please run the following in your Supabase SQL Editor:");
        console.log(`
            CREATE TABLE IF NOT EXISTS risk_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                trigger_message TEXT,
                risk_score NUMERIC,
                reason TEXT,
                metadata JSONB,
                is_resolved BOOLEAN DEFAULT false,
                resolved_by UUID REFERENCES employees(e_id),
                status VARCHAR DEFAULT 'open'
            );
            ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Admins can see risk alerts" ON risk_alerts FOR SELECT TO authenticated USING (
                EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
            );
        `);
    } else {
        console.log("Risk Alerts table initialized successfully.");
    }
}

initRiskAlerts();
