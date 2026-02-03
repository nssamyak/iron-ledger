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

async function debugRole() {
    console.log('🔍 Debugging Role Issue for batman@gmail.com\n');
    console.log('='.repeat(60));

    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ Not logged in or auth error:', authError?.message);
            return;
        }

        console.log(`\n✅ Logged in as: ${user.email}`);
        console.log(`   User ID: ${user.id}\n`);
        console.log('='.repeat(60));

        // Check employees table
        console.log('\n📋 EMPLOYEES TABLE:');
        const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (empError) {
            console.error('❌ Error fetching employee:', empError.message);
        } else if (!empData) {
            console.log('❌ No employee record found!');
        } else {
            console.log('✅ Employee found:');
            console.log('   e_id:', empData.e_id);
            console.log('   f_name:', empData.f_name);
            console.log('   l_name:', empData.l_name);
            console.log('   role_id:', empData.role_id);
            console.log('   d_id:', empData.d_id);
        }

        // Check roles table
        console.log('\n📋 ROLES TABLE (all roles):');
        const { data: allRoles, error: rolesError } = await supabase
            .from('roles')
            .select('*');

        if (rolesError) {
            console.error('❌ Error fetching roles:', rolesError.message);
        } else {
            console.log(JSON.stringify(allRoles, null, 2));
        }

        // Check the specific role for this employee
        if (empData?.role_id) {
            console.log('\n📋 YOUR SPECIFIC ROLE:');
            const { data: yourRole, error: yourRoleError } = await supabase
                .from('roles')
                .select('*')
                .eq('role_id', empData.role_id)
                .single();

            if (yourRoleError) {
                console.error('❌ Error fetching your role:', yourRoleError.message);
            } else {
                console.log('✅ Your role:');
                console.log(JSON.stringify(yourRole, null, 2));
            }
        }

        // Try the join query
        console.log('\n📋 JOIN QUERY (employees + roles):');
        const { data: joinData, error: joinError } = await supabase
            .from('employees')
            .select('e_id, f_name, l_name, role_id, roles!inner(role_id, role_name)')
            .eq('user_id', user.id)
            .single();

        if (joinError) {
            console.error('❌ Error with join query:', joinError.message);
        } else {
            console.log('✅ Join result:');
            console.log(JSON.stringify(joinData, null, 2));
        }

        // Check user_roles table (old way)
        console.log('\n📋 USER_ROLES TABLE (old way):');
        const { data: userRolesData, error: userRolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id);

        if (userRolesError) {
            console.error('❌ Error fetching user_roles:', userRolesError.message);
        } else {
            console.log(JSON.stringify(userRolesData, null, 2));
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n💡 DIAGNOSIS:');
        console.log('   The role shown in the app comes from: employees.role_id → roles.role_name');
        console.log('   Check the role_name in the ROLES table above.');
        console.log('   If it says "Warehouse Manager" or similar, that\'s what will show.');
        console.log('\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

debugRole();
