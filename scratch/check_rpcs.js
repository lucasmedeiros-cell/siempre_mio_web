require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Querying pg_proc through RPC is usually not possible unless there is a generic function.
  // Let's try calling a random name to see if it lists or errors.
  const { data, error } = await supabase.rpc('get_rpcs');
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
