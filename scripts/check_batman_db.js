/**
 * Debugging script to check the specific user's employee record and role mapping
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBatmanData() {
    console.log('Checking Batman data...');

    // We can't query auth.users with anon key, 
    // but we can query employees and look for "batman" name
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*, roles(role_name)')
        .like('f_name', '%batman%');

    if (empError) {
        console.error('Error fetching employees:', empError);
        return;
    }

    console.log('Found employees matching "batman":', JSON.stringify(employees, null, 2));

    // Also check all employees to see what we have
    const { data: allEmployees, error: allEmpError } = await supabase
        .from('employees')
        .select('user_id, f_name, role_id, roles(role_name)');

    if (allEmpError) {
        console.error('Error fetching all employees:', allEmpError);
    } else {
        console.log('\nAll employees in DB:', JSON.stringify(allEmployees, null, 2));
    }
}

checkBatmanData();
