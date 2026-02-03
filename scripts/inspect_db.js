const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectTables() {
    console.log('Inspecting user_roles and employees data...');

    // Try to get one row from user_roles
    const { data: ur, error: urErr } = await supabase.from('user_roles').select('*').limit(1);
    if (urErr) console.log('user_roles error:', urErr.message);
    else console.log('user_roles row:', ur);

    // Try to get one row from employees
    const { data: emp, error: empErr } = await supabase.from('employees').select('*').limit(1);
    if (empErr) console.log('employees error:', empErr.message);
    else console.log('employees row:', emp);

    // Try to find any row in user_roles for batman
    const { data: batmanUR, error: berr } = await supabase.from('user_roles').select('*');
    console.log('All user_roles:', batmanUR);
}

inspectTables();
