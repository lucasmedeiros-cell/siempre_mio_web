require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Verificando conexión a:', supabaseUrl);
  
  const { data: animales, error: err1 } = await supabase.from('animales').select('*').limit(5);
  console.log('\n--- Animales (Top 5) ---');
  if (err1) console.error('Error al leer animales:', err1);
  else console.log(animales.length > 0 ? animales : 'No hay animales en la base de datos.');

  const { data: lotes, error: err2 } = await supabase.from('lotes').select('*').limit(5);
  console.log('\n--- Lotes (Top 5) ---');
  if (err2) console.error('Error al leer lotes:', err2);
  else console.log(lotes.length > 0 ? lotes : 'No hay lotes en la base de datos.');

  const { data: potreros, error: err3 } = await supabase.from('potreros').select('*').limit(5);
  console.log('\n--- Potreros (Top 5) ---');
  if (err3) console.error('Error al leer potreros:', err3);
  else console.log(potreros.length > 0 ? potreros : 'No hay potreros en la base de datos.');
  
  const { data: produccion, error: err4 } = await supabase.from('registros_leche').select('*').limit(5);
  console.log('\n--- Registros de Leche (Top 5) ---');
  if (err4) console.error('Error al leer registros de leche:', err4);
  else console.log(produccion.length > 0 ? produccion : 'No hay registros de leche en la base de datos.');
}

check();
