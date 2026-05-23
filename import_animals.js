const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const rawInput = `
001-A: Nelore | macho | 2024-09-10 | BLANCO | activo | torete
001-R: Nelore | hembra | 2024-07-10 | BLANCA | activo | novilla
002-A: Nelore | macho | 2024-09-10 | BLANCO | activo | torete
002-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
003-A: Nelore | macho | 2025-08-10 | BLANCO | activo | ternero
003-R: Mestizo | hembra | 2024-09-10 | activo | novilla
004-A: Mestizo | macho | 2024-09-10 | activo | torete
004-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
005-A: Mestizo | macho | 2024-09-10 | activo | torete
005-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
006-A: ANELORADA | macho | 2025-03-10 | activo | torete
006-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
007-A (jame bond): Nelore | macho | 2025-03-10 | BLANCO | activo | torete
007-R: Mestizo | hembra | 2024-09-10 | activo | novilla
008-A: Mestizo | macho | 2024-09-10 | activo | torete
008-R: Mestizo | hembra | 2024-09-10 | activo | novilla
009-A: Mestizo | macho | 2024-07-10 | activo | torete
009-R: ANELORAU | hembra | 2024-03-10 | activo | novilla
010-A: Mestizo | hembra | 2025-03-10 | activo | novilla
010-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
011-A: Mestizo | macho | 2024-09-10 | activo | torete
011-R: Mestizo | hembra | 2024-09-10 | activo | novilla
012-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
012-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
013-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
013-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
014-A: Nelore | macho | 2024-03-10 | BLANCO | activo | torete
014-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
015-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
015-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
016-A: Mestizo | hembra | 2025-06-10 | activo | ternera
016-R: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
017-A: Nelore | hembra | 2025-11-10 | BLANCO | activo | ternera
017-R: ANELORAU | hembra | 2025-03-10 | activo | novilla
018-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
018-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
019-A: Mestizo | hembra | 2024-03-10 | activo | novilla
019-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
020-A: Mestizo | hembra | 2024-03-10 | activo | novilla
020-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
022-A: Nelore | macho | 2024-09-10 | BLANCO | activo | torete
022-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
023-A: Nelore | macho | 2025-06-10 | BLANCO | activo | ternero
023-R: Mestizo | hembra | 2023-09-10 | activo | novilla
024-A: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
024-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
025-A: Nelore | macho | BLANCO | activo | torete
025-R: Gyr | hembra | 2024-09-10 | activo | novilla
026-A: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
026-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
027-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
027-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
028-A: Mestizo | hembra | 2024-03-10 | activo | novilla
028-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
029-A: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
029-R: Mestizo | hembra | BLANCO | activo | novilla
030-A: Nelore | hembra | 2023-09-10 | activo | novilla
030-R: ANELORADA | hembra | 2025-03-10 | activo | novilla
031-A: ANELORADA | macho | 2024-03-10 | activo | torete
031-R: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
032-A: Nelore | macho | 2024-03-10 | activo | torete
032-R: Nelore | hembra | 2025-03-10 | activo | novilla
033-A: Mestizo | macho | 2024-09-10 | activo | torete
033-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
034-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
034-R: Mestizo | hembra | 2023-09-10 | activo | novilla
035-A: Nelore | macho | 2024-09-10 | BLANCO | activo | torete
035-R: Mestizo | hembra | 2023-09-10 | activo | novilla
036-A: Mestizo | macho | 2024-03-10 | activo | torete
036-R: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
037-A: Mestizo | hembra | 2025-03-10 | activo | novilla
037-R: Mestizo | hembra | 2023-09-10 | activo | novilla
038-A: Mestizo | hembra | 2025-06-10 | activo | ternera
039-A: Mestizo | macho | 2025-07-10 | activo | ternero
039-R: Nelore | hembra | 2023-09-10 | BLANCO | activo | novilla
040-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
040-R: Nelore | hembra | 2023-09-10 | BLANCO | activo | novilla
041-A: Mestizo | macho | 2024-09-10 | activo | torete
041-R: Nelore | hembra | 2023-09-10 | BLANCO | activo | novilla
042-A: Mestizo | macho | 2023-09-10 | activo | torete
042-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
043-A: Mestizo | hembra | 2025-03-10 | activo | novilla
043-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
044-A: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
044-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
045-A: Mestizo | macho | 2025-03-10 | activo | torete
045-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
046-A: Nelore | macho | 2025-03-10 | BLANCO | activo | torete
047-A: Mestizo | macho | 2025-10-10 | activo | ternero
047-R: Mestizo | hembra | 2023-09-10 | activo | novilla
048-A: Mestizo | macho | 2023-09-10 | activo | torete
048-R: Nelore | hembra | 2024-09-10 | BLANCO | activo | novilla
049-A: Nelore | hembra | 2025-03-10 | BLANCO | activo | novilla
049-R: Mestizo | hembra | 2025-03-10 | activo | novilla
050-A: Mestizo | hembra | 2025-01-10 | activo | novilla
050-R: Nelore | hembra | 2024-03-10 | BLANCO | activo | novilla
051-A: Mestizo | hembra | 2025-10-10 | activo | ternera
052-A: Mestizo | hembra | 2023-03-10 | activo | vaca_produccion
053-A: Mestizo | macho | 2023-03-10 | activo | toro
054-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
055-N: Nelore | macho | 2022-09-10 | BLANCO | activo | toro
056-A: Mestizo | hembra | 2025-10-10 | activo | ternera
057-A: Nelore | hembra | 2022-03-10 | BLANCO | activo | vaca_produccion
058-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
059-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
060-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
061-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
062-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
063-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
064-A: Mestizo | hembra | 2025-08-10 | activo | ternera
065-A: Mestizo | hembra | 2025-09-10 | activo | ternera
066-A: Mestizo | hembra | 2025-11-10 | activo | ternera
067-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
068-A: Mestizo | macho | 2025-11-10 | activo | ternero
069-A: Mestizo | hembra | 2025-11-10 | activo | ternera
070-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
071-N: Mestizo | macho | 2022-03-10 | activo | toro
072-N: Mestizo | hembra | 2021-03-10 | PARDA | activo | vaca_produccion
073-N: Mestizo | macho | 2025-11-10 | COLORADO | activo | ternero
074-N: Mestizo | macho | 2024-03-10 | activo | torete
075-N (CHUTUTUBI): Mestizo | macho | 2025-11-10 | activo | ternero
077-N: Nelore | macho | 2021-03-10 | BLANCO | activo | toro
081-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
082-A: Mestizo | hembra | 2025-09-10 | activo | ternera
083-A: Mestizo | macho | 2025-09-10 | activo | ternero
084-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
085-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
086-A: Mestizo | hembra | 2025-09-10 | activo | ternera
087-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
088-A: Mestizo | macho | 2025-09-10 | activo | ternero
089-A: Mestizo | macho | 2025-09-10 | activo | ternero
090-A: Mestizo | macho | 2025-09-10 | activo | ternero
091-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
092-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
093-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
094-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
095-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
096-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
097-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
098-A: Mestizo | macho | 2025-08-10 | activo | ternero
099-A: Mestizo | hembra | 2025-03-10 | activo | novilla
100-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
101-A: Mestizo | hembra | 2021-06-10 | activo | vaca_produccion
102-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
103-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
104-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
105-A: Mestizo | hembra | 2025-11-10 | activo | ternera
106-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
107-A: Holstein | hembra | 2021-03-10 | OVERA | activo | vaca_produccion
108-A: Mestizo | macho | 2025-08-10 | activo | ternero
109-A: Mestizo | macho | 2025-09-10 | activo | ternero
110-A: Mestizo | macho | 2025-10-10 | activo | ternero
111-A: Nelore | macho | 2025-05-10 | BLANCO | activo | ternero
112-A: Mestizo | hembra | 2022-03-10 | activo | vaca_produccion
113-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
114-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
115-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
116-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
117-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
118-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
119-A: Gyr | hembra | 2021-03-10 | activo | vaca_produccion
120-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
121-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
122-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
123-A: Mestizo | hembra | 2025-10-10 | activo | ternera
124-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
126-A: Mestizo | hembra | 2021-03-10 | activo | vaca_produccion
127-A: SENEPOL | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
128-A: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
129-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
130-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
131-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
132-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
133-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
134-A: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
135-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
136-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
137-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
138-A: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
140-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
141-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
142-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
143-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
144-A: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
145-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
146-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
147-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
148-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
149-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
150-A: Mestizo | hembra | 2021-03-10 | CREMITA | activo | vaca_produccion
151-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
152-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
153-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
154-A: Nelore | hembra | 2021-03-10 | BLANCA | activo | vaca_produccion
155-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
156-A: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
157-A: Mestizo | hembra | 2021-03-10 | NEGRA | activo | vaca_produccion
159-A: Nelore | hembra | 2021-03-10 | BLANCO | activo | vaca_produccion
SA-001 (se canso el jefe): Mestizo | macho | 2026-01-01 | marron | transferido | ternero
SA-23: Mestizo | hembra | 2021-03-10 | COLORADA | activo | vaca_produccion
SA-36: Mestizo | hembra | 2021-03-10 | PARDA | activo | vaca_produccion
SA-37: Mestizo | macho | 2025-12-10 | PARDO | activo | ternero
SA-40 (POR DEFINIR 2): Mestizo | macho | 2025-11-10 | activo | ternero
`;

// Helper to format Raza capitalized
function formatRaza(raza) {
  if (!raza) return 'Mestizo';
  const clean = raza.trim();
  if (clean.toLowerCase() === 'anelorada') return 'Anelorada';
  if (clean.toLowerCase() === 'anelorau') return 'Anelorau';
  if (clean.toUpperCase() === 'SENEPOL') return 'Senepol';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Helper to format Categoria capitalized and mapped
function formatCategoria(cat) {
  if (!cat) return 'Ternero';
  const clean = cat.trim().toLowerCase();
  if (clean === 'vaca_produccion') return 'Vaca en producción';
  if (clean === 'torete') return 'Torete';
  if (clean === 'novilla') return 'Novilla';
  if (clean === 'ternero') return 'Ternero';
  if (clean === 'ternera') return 'Ternera';
  if (clean === 'toro') return 'Toro';
  return cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1).toLowerCase();
}

// Helper to format Estado
function formatEstado(estado) {
  if (!estado) return 'Activo';
  const clean = estado.trim().toLowerCase();
  if (clean === 'activo') return 'Activo';
  if (clean === 'transferido') return 'Vendido';
  return 'Activo';
}

async function getPropietarioId() {
  console.log('Detecting propietario_id from actividades_log...');
  try {
    const { data: logs, error } = await supabase
      .from('actividades_log')
      .select('propietario_id')
      .not('propietario_id', 'is', null)
      .limit(1);
    
    if (logs && logs.length > 0 && logs[0].propietario_id) {
      console.log('Successfully detected propietario_id:', logs[0].propietario_id);
      return logs[0].propietario_id;
    }
  } catch (e) {
    console.warn('Could not read propietario_id from actividades_log:', e.message);
  }
  
  const fallback = 'b3f0a17b-d6b4-4cb0-b456-988dddadd241';
  console.log('Using fallback propietario_id:', fallback);
  return fallback;
}

async function run() {
  const propietarioId = await getPropietarioId();
  
  // Clear any existing dummy test records we created earlier
  console.log('Cleaning up temporary TEST records...');
  await supabase.from('animales').delete().eq('codigo', 'TEST-RP-1');

  const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const insertPayloads = [];

  for (const line of lines) {
    const partsColon = line.split(':');
    if (partsColon.length < 2) continue;

    const leftPart = partsColon[0].trim();
    const rightPart = partsColon[1].trim();

    // Regex to extract code and name in parenthesis
    const match = leftPart.match(/^([^\(]+)(?:\((.+)\))?$/);
    if (!match) continue;

    const codigo = match[1].trim();
    const nombre = match[2] ? match[2].trim() : '';

    const parts = rightPart.split('|').map(p => p.trim());
    if (parts.length < 2) continue;

    const razaRaw = parts[0];
    const sexoRaw = parts[1];
    const categoriaRaw = parts[parts.length - 1];
    const estadoRaw = parts[parts.length - 2];

    const raza = formatRaza(razaRaw);
    const sexo = sexoRaw.toLowerCase() === 'macho' ? 'Macho' : 'Hembra';
    const categoria = formatCategoria(categoriaRaw);
    const estado = formatEstado(estadoRaw);

    // Date detection: check parts[2]
    let fechaNacimiento = null;
    if (parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[2])) {
      fechaNacimiento = parts[2];
    }

    insertPayloads.push({
      uuid: crypto.randomUUID(),
      codigo: codigo,
      nombre: nombre || '',
      raza: raza,
      sexo: sexo,
      categoria: categoria,
      propietario_id: propietarioId,
      procedencia: 'Nacimiento',
      fecha_nacimiento: fechaNacimiento,
      peso_nacimiento: null,
      peso_actual: null,
      precio_compra_bob: null,
      estado: estado,
      lote_id: null,
      synced: true,
      deleted: false,
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Parsed ${insertPayloads.length} animals. Starting upload to Supabase...`);

  // Batch insert in chunks of 50 to prevent size limits
  const chunk = 50;
  for (let i = 0; i < insertPayloads.length; i += chunk) {
    const batch = insertPayloads.slice(i, i + chunk);
    console.log(`Uploading batch ${i / chunk + 1} (${batch.length} animals)...`);
    const { error } = await supabase.from('animales').insert(batch);
    if (error) {
      console.error('Error uploading batch:', error);
      process.exit(1);
    }
  }

  console.log('\n--- UPLOAD SUCCESSFUL ---');
  console.log(`Successfully uploaded ${insertPayloads.length} animals for owner: ${propietarioId}`);
}

run();
