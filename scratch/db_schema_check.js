const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error reading table ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Table ${tableName} columns:`, Object.keys(data[0]));
  } else {
    // If table is empty, select from pg_attribute if possible, or just print empty
    console.log(`Table ${tableName} is empty or has no rows.`);
  }
}

async function run() {
  const tables = [
    'animales',
    'lotes',
    'potreros',
    'ocupaciones_potrero',
    'registros_leche',
    'transacciones',
    'inventarios',
    'recetas_info',
    'eventos_salud',
    'tareas',
    'eventos_reproductivos'
  ];
  for (const table of tables) {
    await inspectTable(table);
  }
}

run();
