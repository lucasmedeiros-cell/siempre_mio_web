const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Note: We need service role key or we can query using anon key, but wait, anon key has RLS enabled
// on public.fincas so we only see our own fincas, but let's see if we can read them
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching fincas using anon key...');
  const { data: fincas, error: fincasError } = await supabase.from('fincas').select('*');
  console.log('Fincas:', fincasError ? fincasError.message : fincas);

  console.log('\nFetching animales using anon key...');
  const { data: animales, error: animalesError } = await supabase.from('animales').select('uuid, codigo, propietario_id').limit(10);
  console.log('Animales count:', animales ? animales.length : 0);
  console.log('Sample animales:', animalesError ? animalesError.message : animales);
}

run();
