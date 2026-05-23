require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Verificando conexion con Supabase...');
  
  try {
    const res = await fetch(`${url}/rest/v1/animales?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await res.json();
    console.log(`\nAnimales (${data.length || 0}):`, data.slice(0, 3));

    const res2 = await fetch(`${url}/rest/v1/potreros?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data2 = await res2.json();
    console.log(`\nPotreros (${data2.length || 0}):`, data2.slice(0, 3));

    const res3 = await fetch(`${url}/rest/v1/lotes?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data3 = await res3.json();
    console.log(`\nLotes (${data3.length || 0}):`, data3.slice(0, 3));

    const resSalud = await fetch(`${url}/rest/v1/eventos_salud?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const dataSalud = await resSalud.json();
    console.log(`\nEventos Salud (${dataSalud.length || 0}):`, dataSalud);

    const resLeche = await fetch(`${url}/rest/v1/registros_leche?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const dataLeche = await resLeche.json();
    console.log(`\nRegistros Leche (${dataLeche.length || 0}):`, dataLeche);

  } catch(e) {
    console.error('Error fetching data:', e);
  }
}
run();
