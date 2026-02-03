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

async function fixUserRole() {
    console.log('🔧 Fixing user role for batman@gmail.com...\n');

    try {
        // Get the user ID for batman@gmail.com
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('❌ Error getting user:', authError.message);
            console.log('\n💡 You need to be logged in. Please run this after logging in.');
            return;
        }

        console.log(`✅ Found user: ${user.email}`);
        console.log(`   User ID: ${user.id}\n`);

        // Update user_roles to admin
        const { data: updateData, error: updateError } = await supabase
            .from('user_roles')
            .update({ role: 'admin' })
            .eq('user_id', user.id)
            .select();

        if (updateError) {
            console.error('❌ Error updating role:', updateError.message);

            // Try to insert if update failed (row might not exist)
            console.log('   Trying to insert new role...');
            const { data: insertData, error: insertError } = await supabase
                .from('user_roles')
                .insert({ user_id: user.id, role: 'admin' })
                .select();

            if (insertError) {
                console.error('❌ Error inserting role:', insertError.message);
            } else {
                console.log('✅ Successfully inserted admin role!');
                console.log('   Data:', JSON.stringify(insertData, null, 2));
            }
        } else {
            console.log('✅ Successfully updated role to admin!');
            console.log('   Data:', JSON.stringify(updateData, null, 2));
        }

        // Verify the change
        const { data: verifyData, error: verifyError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id);

        if (verifyError) {
            console.error('❌ Error verifying role:', verifyError.message);
        } else {
            console.log('\n📋 Current user_roles:');
            console.log(JSON.stringify(verifyData, null, 2));
        }

        console.log('\n✅ Done! Please refresh your browser to see the changes.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixUserRole();
