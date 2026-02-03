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

async function findEmpId() {
    console.log('Searching for any column named emp_id or e_id in user_roles...');

    // Try to query user_roles and see what columns come back in an error if we guess wrong,
    // or just get everything.
    const { data, error } = await supabase.from('user_roles').select('*').limit(1);

    if (error) {
        console.log('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns in user_roles:', Object.keys(data[0]));
    } else {
        console.log('No data in user_roles to check columns.');

        // Try to force an error to see column list? 
        // Usually Supabase error messages don't list columns.
    }
}

findEmpId();
