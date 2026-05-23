require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("--- STARTING DATA SIMULATION ---");

  // 1. Clean up previous simulated calves and reproductive events (Idempotency)
  console.log('Cleaning up previous simulated calves and reproductive events...');
  
  // Find previously simulated calves (codes starting with 'C-')
  const { data: oldCalves, error: oldCalvesErr } = await supabase
    .from('animales')
    .select('uuid')
    .like('codigo', 'C-%')
    .eq('procedencia', 'Nacimiento');

  if (oldCalves && oldCalves.length > 0) {
    const oldCalfUuids = oldCalves.map(c => c.uuid);
    console.log(`Found ${oldCalfUuids.length} previously simulated calves. Cleaning up...`);
    
    // Delete their reproductive events
    await supabase.from('eventos_reproductivos').delete().in('cria_id', oldCalfUuids);
    
    // Delete the animals
    const { error: delCalvesErr } = await supabase.from('animales').delete().in('uuid', oldCalfUuids);
    if (delCalvesErr) console.error("Error deleting old calves:", delCalvesErr);
  }

  // Delete previously simulated service events
  console.log('Cleaning up previous simulated service reproductive events...');
  await supabase.from('eventos_reproductivos').delete().eq('observacion', 'Servicio de monta natural registrado');

  // Delete all existing weight records to start with a fresh, clean, consistent history
  console.log('Cleaning up all existing weight records (registros_peso)...');
  const { error: deleteWeightError } = await supabase
    .from('registros_peso')
    .delete()
    .neq('uuid', '00000000-0000-0000-0000-000000000000');
  if (deleteWeightError) {
    console.error('Error deleting weight records:', deleteWeightError);
  }

  // 2. Fetch current animals
  const { data: animals, error: animError } = await supabase
    .from('animales')
    .select('*')
    .eq('deleted', false);

  if (animError) {
    console.error("Error fetching animals:", animError);
    return;
  }
  console.log(`Loaded ${animals.length} existing base animals.`);

  const propietarioId = '74381cfb-f5d3-461d-aae4-a9dc73d03ade';

  // Find all productive cows (categoria = 'Vaca en producción')
  const cows = animals.filter(a => a.categoria === 'Vaca en producción');
  console.log(`Found ${cows.length} productive cows in the hato.`);

  // Find all bulls (categoria = 'Toro')
  const bulls = animals.filter(a => a.categoria === 'Toro');
  console.log(`Found ${bulls.length} bulls in the hato.`);
  const bullUuids = bulls.map(b => b.uuid);

  // 3. Generate exactly 67 calves (C-001 to C-067)
  const numCalves = 67;
  console.log(`Generating ${numCalves} calves born between 2025-08-10 and 2026-05-23...`);

  // Choose 67 unique mother cows
  const shuffledCows = [...cows].sort(() => Math.random() - 0.5);
  const motherCows = shuffledCows.slice(0, numCalves);

  // Date range for births
  const startDate = new Date('2025-08-10').getTime();
  const endDate = new Date('2026-05-23').getTime();

  const newAnimals = [];
  const repEvents = [];

  for (let i = 0; i < numCalves; i++) {
    const mother = motherCows[i];
    const motherUuid = mother.uuid;

    // Random birth date in range
    const birthTime = startDate + Math.random() * (endDate - startDate);
    const birthDateStr = new Date(birthTime).toISOString().split('T')[0];

    const calfUuid = randomUUID();
    const isMacho = Math.random() < 0.5;
    const sexo = isMacho ? 'Macho' : 'Hembra';
    const categoria = isMacho ? 'Ternero' : 'Ternera';
    const codigo = `C-${(i + 1).toString().padStart(3, '0')}`;
    const raza = mother.raza || 'Mestizo';
    const pesoNacimiento = parseFloat((30 + Math.random() * 4).toFixed(1)); // 30 - 34 kg

    // Calculate current weight as of May 23, 2026
    const ageDays = Math.max(0, Math.floor((endDate - birthTime) / (1000 * 60 * 60 * 24)));
    const adg = isMacho ? 0.700 : 0.500;
    const pesoActual = parseFloat((pesoNacimiento + ageDays * adg).toFixed(1));

    const calfPayload = {
      uuid: calfUuid,
      codigo,
      nombre: `Cría ${codigo}`,
      raza,
      sexo,
      categoria,
      propietario_id: propietarioId,
      procedencia: 'Nacimiento',
      fecha_nacimiento: birthDateStr,
      peso_nacimiento: pesoNacimiento,
      peso_actual: pesoActual,
      precio_compra_bob: null,
      estado: 'Activo',
      lote_id: null,
      madre_id: motherUuid,
      synced: true,
      deleted: false,
      updated_at: new Date().toISOString()
    };

    newAnimals.push(calfPayload);

    // Create 'Parto' reproductive event for the mother
    const partoEvent = {
      uuid: randomUUID(),
      animal_id: motherUuid,
      tipo_evento: 'Parto',
      fecha_evento: birthDateStr,
      toro_id: bullUuids.length > 0 ? bullUuids[Math.floor(Math.random() * bullUuids.length)] : null,
      cria_id: calfUuid,
      observacion: `Parto exitoso - Cría código: ${codigo}`,
      diagnostico: 'Normal',
      synced: true,
      deleted: false,
      updated_at: new Date().toISOString()
    };

    repEvents.push(partoEvent);
  }

  // 4. Create service events for 35% of cows (served by March 8, 2026)
  // 35% of 78 cows = 27 cows
  const numServed = 27;
  console.log(`Generating service events for ${numServed} cows served by March 8, 2026...`);
  const servedCows = [...cows].sort(() => Math.random() - 0.5).slice(0, numServed);

  // Service dates between Nov 1, 2025 and Mar 8, 2026
  const servedStartDate = new Date('2025-11-01').getTime();
  const servedEndDate = new Date('2026-03-08').getTime();

  for (let i = 0; i < numServed; i++) {
    const cow = servedCows[i];
    const serviceTime = servedStartDate + Math.random() * (servedEndDate - servedStartDate);
    const serviceDateStr = new Date(serviceTime).toISOString().split('T')[0];

    const serviceEvent = {
      uuid: randomUUID(),
      animal_id: cow.uuid,
      tipo_evento: 'Servicio',
      fecha_evento: serviceDateStr,
      toro_id: bullUuids.length > 0 ? bullUuids[Math.floor(Math.random() * bullUuids.length)] : null,
      cria_id: null,
      observacion: 'Servicio de monta natural registrado',
      diagnostico: 'Preñada',
      synced: true,
      deleted: false,
      updated_at: new Date().toISOString()
    };

    repEvents.push(serviceEvent);
  }

  // 5. Insert calves and reproductive events in batches
  console.log(`Uploading ${newAnimals.length} new calves to Supabase...`);
  const BATCH = 20;
  for (let i = 0; i < newAnimals.length; i += BATCH) {
    const batch = newAnimals.slice(i, i + BATCH);
    const { error } = await supabase.from('animales').insert(batch);
    if (error) {
      console.error(`Error inserting calves batch:`, error);
      return;
    }
  }
  console.log("Calves created successfully!");

  console.log(`Uploading ${repEvents.length} reproductive events to Supabase...`);
  for (let i = 0; i < repEvents.length; i += BATCH) {
    const batch = repEvents.slice(i, i + BATCH);
    const { error } = await supabase.from('eventos_reproductivos').insert(batch);
    if (error) {
      console.error(`Error inserting reproductive events batch:`, error);
      return;
    }
  }
  console.log("Reproductive events created successfully!");

  // Combine original animals + new calves for systematic weight history
  const allAnimals = [...animals, ...newAnimals];
  console.log(`Total animals for weight history generation: ${allAnimals.length}`);

  // 6. Systematic weighing dates every 3 months starting from or containing March 8th
  const systematicDates = [
    '2024-03-08', '2024-06-08', '2024-09-08', '2024-12-08',
    '2025-03-08', '2025-06-08', '2025-09-08', '2025-12-08',
    '2026-03-08'
  ];

  const weighings = [];
  const updateWeightPayloads = [];

  for (const animal of allAnimals) {
    const birthDate = animal.fecha_nacimiento ? new Date(animal.fecha_nacimiento) : null;
    if (!birthDate) continue;

    const baseWeight = animal.peso_nacimiento || (animal.sexo === 'Macho' ? 32 : 30);
    let latestWeighingWeight = null;

    for (const dateStr of systematicDates) {
      const weighDate = new Date(dateStr);
      if (weighDate < birthDate) continue; // Animal not born yet

      const ageDays = Math.floor((weighDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      const ageMonths = ageDays / 30.4375;

      if (ageMonths >= 9) {
        if (animal.sexo === 'Macho') {
          // average daily gain of 700 grams (0.7 kg)
          let w = baseWeight + (ageDays * 0.700);
          w = Math.min(w, 850); // Cap weight of mature bulls realistically
          w = parseFloat(w.toFixed(1));

          weighings.push({
            uuid: randomUUID(),
            animal_id: animal.uuid,
            fecha_pesaje: `${dateStr}T12:00:00+00:00`,
            peso: w,
            observacion: `Pesaje sistemático trimestral - ${Math.round(ageMonths)} meses`,
            synced: true,
            deleted: false,
            updated_at: new Date().toISOString()
          });
          latestWeighingWeight = w;
        } else { // Hembra
          // average daily gain of 500 grams (0.5 kg)
          let w = baseWeight + (ageDays * 0.500);
          w = Math.min(w, 550); // Cap weight of mature cows realistically
          w = parseFloat(w.toFixed(1));

          // Only weigh female from weaning (9m) up to 24 months or 300 kg
          if (ageMonths <= 24 || w <= 300) {
            weighings.push({
              uuid: randomUUID(),
              animal_id: animal.uuid,
              fecha_pesaje: `${dateStr}T12:00:00+00:00`,
              peso: w,
              observacion: `Pesaje sistemático trimestral - ${Math.round(ageMonths)} meses`,
              synced: true,
              deleted: false,
              updated_at: new Date().toISOString()
            });
            latestWeighingWeight = w;
          }
        }
      }
    }

    // If we recorded at least one weighing, we will update the animal's peso_actual
    if (latestWeighingWeight !== null) {
      updateWeightPayloads.push({
        uuid: animal.uuid,
        peso_actual: latestWeighingWeight
      });
    }
  }

  console.log(`Uploading ${weighings.length} systematic weighing records to Supabase...`);
  for (let i = 0; i < weighings.length; i += BATCH) {
    const batch = weighings.slice(i, i + BATCH);
    const { error } = await supabase.from('registros_peso').insert(batch);
    if (error) {
      console.error(`Error inserting weight records batch:`, error);
      return;
    }
  }
  console.log("Weight history created successfully!");

  // 7. Update current weights (peso_actual) for all weighed animals
  console.log(`Updating current weights (peso_actual) for ${updateWeightPayloads.length} animals...`);
  for (const item of updateWeightPayloads) {
    const { error } = await supabase
      .from('animales')
      .update({ peso_actual: item.peso_actual })
      .eq('uuid', item.uuid);
    if (error) {
      console.error(`Error updating current weight for ${item.uuid}:`, error);
    }
  }
  console.log("Current weights updated successfully!");

  console.log("--- DATA SIMULATION SUCCESSFULLY COMPLETED ---");
}

run().catch(console.error);
