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

async function checkSchema() {
    console.log('Checking user_roles and employees tables data...');

    // Check user_roles columns
    const { data: userRoles, error: urError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);

    if (urError) console.error('user_roles error:', urError);
    else console.log('user_roles sample row:', JSON.stringify(userRoles, null, 2));

    // Check employees columns
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .limit(1);

    if (empError) console.error('employees error:', empError);
    else console.log('employees sample row:', JSON.stringify(employees, null, 2));
}

checkSchema();
