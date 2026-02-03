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

async function checkBatmanManually() {
    console.log('Checking Batman role sequence...');

    // Try to find batman user first
    // Since we can't search auth.users, we check employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .ilike('f_name', '%batman%');

    console.log('Employees search result:', JSON.stringify(employees, null, 2));

    // Try to query user_roles with emp_id
    const { data: userRoles, error: urError } = await supabase
        .from('user_roles')
        .select('*');

    console.log('All User Roles:', JSON.stringify(userRoles, null, 2));
}

checkBatmanManually();
