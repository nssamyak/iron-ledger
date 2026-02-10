const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.+)$/);
            if (match) envVars[match[1].trim()] = match[2].trim();
        });

        const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

        console.log('--- Roles ---');
        const { data: roles } = await supabase.from('roles').select('*');
        console.log(roles);

        console.log('\n--- Employees ---');
        const { data: employees } = await supabase.from('employees').select('e_id, e_name, role_id, user_id');
        console.log(employees);

        console.log('\n--- Employee Role Names ---');
        for (const emp of employees || []) {
            if (emp.role_id) {
                const { data: role } = await supabase.from('roles').select('role_name').eq('role_id', emp.role_id).single();
                console.log(`Emp: ${emp.e_name} (${emp.e_id}), Role: ${role?.role_name || 'N/A'}`);
            } else {
                console.log(`Emp: ${emp.e_name} (${emp.e_id}), Role: [NO ROLE ID]`);
            }
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

run();
