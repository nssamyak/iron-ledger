const { createClient } = require("@supabase/supabase-js");

// We'll pass the env vars via command line or use process.env directly if loaded by Node
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixWarehouseCapacities() {
    console.log("Starting warehouse capacity optimization...");

    const { data: warehouses, error: whError } = await supabase
        .from("warehouses")
        .select("w_id, w_name, capacity");

    if (whError) {
        console.error("Error fetching warehouses:", whError);
        return;
    }

    const { data: stocks, error: stockError } = await supabase
        .from("product_warehouse")
        .select("w_id, stock");

    if (stockError) {
        console.error("Error fetching stocks:", stockError);
        return;
    }

    const report = [];

    for (const wh of warehouses) {
        const totalStock = stocks
            .filter((s) => s.w_id === wh.w_id)
            .reduce((acc, curr) => acc + (curr.stock || 0), 0);

        // Generate a variable margin: 10% to 150%
        const marginFactor = Math.random() * 1.4 + 0.1;
        const margin = Math.floor(totalStock * marginFactor) + 100;
        const newCapacity = totalStock + margin;

        const { error: updateError } = await supabase
            .from("warehouses")
            .update({ capacity: newCapacity })
            .eq("w_id", wh.w_id);

        if (updateError) {
            console.error(`Error updating warehouse ${wh.w_name}:`, updateError);
        } else {
            const occupancy = ((totalStock / newCapacity) * 100).toFixed(1);
            report.push({
                Name: wh.w_name,
                OldCap: wh.capacity,
                NewCap: newCapacity,
                Stock: totalStock,
                Occupancy: occupancy + "%"
            });
        }
    }

    if (report.length > 0) {
        console.table(report);
    } else {
        console.log("No warehouses updated. Check if tables are empty or RLS is blocking.");
    }

    console.log("Capacity optimization complete.");
}

fixWarehouseCapacities();
