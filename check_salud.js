const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  });
} catch (err) {
  console.error("Could not read .env.local file:", err);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing join select on registros_leche...");
  const { data: dataLeche, error: errorLeche } = await supabase
    .from('registros_leche')
    .select('uuid, litros, animales(codigo)')
    .limit(1);

  if (errorLeche) {
    console.error("registros_leche plural join failed:", errorLeche);
    const { data: dataLecheS, error: errorLecheS } = await supabase
      .from('registros_leche')
      .select('uuid, litros, animal(codigo)')
      .limit(1);
    if (errorLecheS) {
      console.error("registros_leche singular join failed too:", errorLecheS);
    } else {
      console.log("registros_leche success with singular relation!", dataLecheS);
    }
  } else {
    console.log("registros_leche success with plural relation!", dataLeche);
  }
}

test();
