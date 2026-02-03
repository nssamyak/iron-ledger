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

async function checkUsers() {
    console.log('Checking existing users and roles...\n');

    // Check user_roles
    const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

    if (rolesError) {
        console.error('Error fetching user_roles:', rolesError);
    } else {
        console.log('User Roles:', JSON.stringify(userRoles, null, 2));
    }

    // Check employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*');

    if (empError) {
        console.error('Error fetching employees:', empError);
    } else {
        console.log('\nEmployees:', JSON.stringify(employees, null, 2));
    }
}

checkUsers();
