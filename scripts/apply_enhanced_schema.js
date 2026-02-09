const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Mock a simple env loader
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function applyEnhancedSchema() {
    const sql = fs.readFileSync('supabase/enhanced_system_checks.sql', 'utf8');
    console.log('Applying enhanced_system_checks.sql...');

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        console.error('Error applying schema:', error);
    } else {
        console.log('Success:', data);
    }
}

applyEnhancedSchema();
