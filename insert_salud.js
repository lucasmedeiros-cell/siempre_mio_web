require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Mapeo de tipo_evento del texto al valor del sistema
function mapTipo(tipo) {
  const t = tipo.toLowerCase();
  if (t === 'control') return 'Control Clínico';
  if (t === 'tratamiento') return 'Tratamiento';
  if (t === 'desparasitacion' || t === 'desparasitación') return 'Desparasitación';
  if (t === 'enfermedad') return 'Tratamiento';
  return 'Tratamiento';
}

// Fecha segura - solo acepta fechas válidas (año > 1900)
function safeDate(str) {
  if (!str) return null;
  str = str.trim();
  if (!str || str === '') return null;
  const y = parseInt(str.split('-')[0]);
  if (isNaN(y) || y < 1900 || y > 2100) return null;
  return str;
}

async function run() {
  // 1. Obtener todos los animales para hacer el mapeo código -> uuid
  const { data: animales, error: animError } = await supabase
    .from('animales')
    .select('uuid, codigo')
    .eq('deleted', false);

  if (animError) {
    console.error('Error fetching animals:', animError);
    return;
  }

  // Mapa codigo -> uuid (normalizado a uppercase y sin espacios extra)
  const animalMap = {};
  animales.forEach(a => {
    animalMap[a.codigo.trim().toUpperCase()] = a.uuid;
  });

  console.log(`Animales cargados: ${animales.length}`);

  // Registros parseados del texto del usuario
  // Formato: { codigo, tipo, diagnostico, medicamento, dosis, via, fecha, proximaFecha, veterinario, notas }
  const raw = [
    { codigo: '147-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '135-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '142-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '159-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '157-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '155-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '148-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '156-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '144-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '72-N',  tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '150-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '151-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '149-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '141-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: null, via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '145-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '138-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '137-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '134-A', tipo: 'control', diagnostico: 'CALCIO (NO GANA PESO)', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'oral', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '133-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '152-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-17', proximaFecha: null, veterinario: null, notas: null },
    { codigo: '136-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-17', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '131-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: 'SA-31' },
    { codigo: '129-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '118-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO ENGORDA)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '128-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO ENGORDA)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '115-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '112-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (SIN SUBIR PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '119-A', tipo: 'tratamiento', diagnostico: 'POR ABORTO', medicamento: 'PENTAGAL', dosis: '1/50', via: 'inyectable', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '119-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (POR MAL PARIR)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '042-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO SUBEN DE PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '033-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO SUBE DE PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '022-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO SUBEN PESO)', medicamento: '5X11/30', dosis: '5 x11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    // (Varios) - sin animal específico
    { codigo: 'VARIOS', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO SUBEN DE PESO)', medicamento: '5X11/30', dosis: '5x11/30 ml/kg', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: 'Tratamiento más vitaminado. Aplicado a varios animales.' },
    { codigo: 'VARIOS', tipo: 'desparasitacion', diagnostico: 'DESPARASITADA', medicamento: 'IVERMIN', dosis: '1/50 KG', via: 'inyectable', fecha: '2026-03-08', proximaFecha: '2026-09-08', veterinario: 'MACO', notas: 'Aplicado a varios animales.' },
    { codigo: 'VARIOS', tipo: 'control', diagnostico: 'VITAMINADA', medicamento: 'OLIVITAMIN', dosis: '1ML/50KG', via: 'inyectable', fecha: '2026-03-08', proximaFecha: '2026-09-08', veterinario: 'MACO', notas: 'Aplicado a varios animales.' },
    { codigo: 'VARIOS', tipo: 'tratamiento', diagnostico: 'HASTA QUEBRADA (SE QUEBRO EL ASTA EN EL ARETEAJE)', medicamento: 'CURAVICHERA', dosis: 'UNA AL DIA', via: 'topica', fecha: '2026-03-08', proximaFecha: '2026-03-13', veterinario: 'MACO', notas: 'Aplicado a varios animales.' },
    { codigo: '037-A', tipo: 'enfermedad', diagnostico: 'QUIRICHI', medicamento: 'VERRUGOL', dosis: 'DEFINIR', via: 'inyectable', fecha: '2026-03-08', proximaFecha: '2026-03-15', veterinario: 'MACO', notas: null },
    { codigo: '136-A', tipo: 'tratamiento', diagnostico: 'PLACENTA (NO VOTO LA PLACENTA)', medicamento: 'PENTAGAL', dosis: 'ESPECIFICAR', via: 'inyectable', fecha: '2026-03-08', proximaFecha: '2026-03-15', veterinario: 'MACO', notas: 'YA SE RETIRO LO QUE QUEDABA DE LA PLACENTA' },
    { codigo: '86-A',  tipo: 'tratamiento', diagnostico: 'HERIDA EN EL OJO', medicamento: 'CURAVICHERA', dosis: 'CADA DIA', via: 'topica', fecha: '2026-03-08', proximaFecha: '2026-03-14', veterinario: 'MACO', notas: null },
    // Refuerzos 2026-03-23
    { codigo: '033-A', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '030-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '029-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '026-A', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '026-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '024-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '022-A', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '022-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '020-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-23', proximaFecha: null, veterinario: 'MACO', notas: null },
    // Refuerzos 2026-03-28
    { codigo: '019-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-28', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '018-R', tipo: 'tratamiento', diagnostico: 'REFUERZO FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-28', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '136-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA REFUERZO (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-28', proximaFecha: null, veterinario: 'MACO', notas: null },
    // Adicionales 2026-03-16
    { codigo: '055-N', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '146-A', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '050-R', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '048-R', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '1/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: null, notas: null },
    { codigo: '044-R', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '040-R', tipo: 'tratamiento', diagnostico: 'FASCIOLA (NO GANA PESO)', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '024-R', tipo: 'tratamiento', diagnostico: 'FASCIOLA', medicamento: '5X11/30', dosis: '5X11/30', via: 'oral', fecha: '2026-03-16', proximaFecha: '2026-03-23', veterinario: 'MACO', notas: null },
    { codigo: '132-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '154-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
    { codigo: '153-A', tipo: 'control', diagnostico: 'CALCIO', medicamento: 'YODO CALCIO', dosis: '5 ML', via: 'inyectable', fecha: '2026-03-16', proximaFecha: null, veterinario: 'MACO', notas: null },
  ];

  // Construir los payloads
  const notFound = [];
  const payloads = raw.map(r => {
    let animalId = null;
    const codeKey = r.codigo.trim().toUpperCase();

    if (codeKey !== 'VARIOS') {
      // Intentar con el código exacto primero
      animalId = animalMap[codeKey];

      // Algunos códigos pueden estar con 0 a la izquierda o sin él
      if (!animalId) {
        // Prueba sin cero a la izquierda (e.g. 042-A -> 42-A)
        const noLeadZero = codeKey.replace(/^0+/, '');
        animalId = animalMap[noLeadZero];
      }
      if (!animalId) {
        // Prueba con cero a la izquierda (e.g. 86-A -> 086-A)
        const withLeadZero = codeKey.replace(/^(\d+)/, (m) => m.padStart(3, '0'));
        animalId = animalMap[withLeadZero];
      }

      if (!animalId) {
        notFound.push(r.codigo);
      }
    }

    const obsPartes = [
      r.diagnostico,
      r.via ? `Vía: ${r.via}` : null,
      r.veterinario ? `Vet: ${r.veterinario}` : null,
      r.notas || null
    ].filter(Boolean);

    return {
      uuid: randomUUID(),
      animal_id: animalId || null,
      tipo_evento: mapTipo(r.tipo),
      fecha: r.fecha,
      medicamento: r.medicamento || null,
      dosis: r.dosis || null,
      costo_bob: null,
      fecha_proxima_aplicacion: safeDate(r.proximaFecha),
      observacion: obsPartes.join(' | '),
      deleted: false,
      synced: true,
      updated_at: new Date().toISOString()
    };
  });

  console.log(`\nTotal registros a insertar: ${payloads.length}`);
  if (notFound.length > 0) {
    console.warn(`\n⚠️  Códigos NO encontrados en animales (se insertarán con animal_id=null):\n  ${[...new Set(notFound)].join(', ')}`);
  }

  // Insertar en lotes de 20
  const BATCH = 20;
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < payloads.length; i += BATCH) {
    const batch = payloads.slice(i, i + BATCH);
    const { error } = await supabase.from('eventos_salud').insert(batch);
    if (error) {
      console.error(`Error en lote ${i}-${i+BATCH}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`✓ Lote ${Math.floor(i/BATCH)+1}: ${batch.length} registros insertados`);
    }
  }

  console.log(`\n✅ Completado: ${inserted} insertados, ${errors} fallidos`);
}

run().catch(console.error);
