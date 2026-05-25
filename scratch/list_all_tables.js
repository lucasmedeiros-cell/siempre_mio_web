const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Query Postgres information_schema to get all tables in the public schema
  const { data, error } = await supabase.rpc('get_tables'); // Or try to run a direct select if we have Rpc, otherwise let's select from pg_tables
  
  if (error) {
    console.error('Error fetching tables via RPC:', error.message);
    
    // Fallback: try doing a query to pg_catalog or public tables by requesting a dummy query or using postgrest
    // Let's try to query public.fincas directly to see if it exists
    console.log('Testing if table "fincas" exists by querying it directly...');
    const { data: fincasData, error: fincasError } = await supabase.from('fincas').select('*').limit(1);
    if (fincasError) {
      console.log('Table "fincas" query failed:', fincasError.message);
    } else {
      console.log('Table "fincas" exists!');
    }
  } else {
    console.log('Tables found in database:', data);
  }
}

run();
