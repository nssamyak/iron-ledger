import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function seed() {
    console.log('Seeding command history...')
    const { data, error } = await supabase.rpc('seed_command_history')
    if (error) {
        console.error('Error seeding:', error)
    } else {
        console.log('Success:', data)
    }
}

seed()
