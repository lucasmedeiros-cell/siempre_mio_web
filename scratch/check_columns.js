require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('potreros').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Columns of potreros:", data ? Object.keys(data[0] || {}) : "no data");
  }
}
run();
