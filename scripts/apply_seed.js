const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = 'https://sgvuwilskrfmxchuvfab.supabase.co';
const key = 'sb_publishable_Pcy1M9xaeSTtyFquFo1FsQ_LIHyLIUP';
const supabase = createClient(url, key);

async function run() {
    console.log("Reading seed.sql...");
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log("Executing seed script via exec_sql RPC...");
    // Wrapping in DO block just in case to handle multiple statements if needed, 
    // but the seed.sql is actually a mix of statements.
    // Actually, let's just send the whole string.

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        console.error("Error applying seed:", error.message);
        if (error.details) console.error("Details:", error.details);
    } else {
        console.log("Seed applied successfully!", data);
    }
}

run();
