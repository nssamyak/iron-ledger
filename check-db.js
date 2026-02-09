const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgvuwilskrfmxchuvfab.supabase.co';
const supabaseKey = 'sb_publishable_Pcy1M9xaeSTtyFquFo1FsQ_LIHyLIUP';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
    console.log('Running seed_command_history()...');
    const { data, error } = await supabase.rpc('preview_sql', { query: 'SELECT seed_command_history()' });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Seed Result:', data);
    }
}

runSeed();
