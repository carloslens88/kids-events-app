// Importador diario de eventos infantiles → Supabase (como BORRADORES).
// Cada fuente vive en su propio módulo bajo scripts/import-lib/sources/;
// este archivo solo orquesta: las llama, junta lo que traen, deduplica e
// inserta. Ver scripts/import-lib/core.mjs para lo compartido (horizonte de
// fechas, geocodificación, deduplicado, inserción).
//
// Los eventos entran con status='draft' y NO aparecen en la app hasta que el
// admin los revisa y publica desde el panel. Los reimportes no duplican ni
// pisan lo ya editado (conflicto por external_id → se ignora).
//
// Uso:
//   node scripts/import-events.mjs                 → todas las fuentes
//   node scripts/import-events.mjs zaragoza         → solo esa fuente
//   node scripts/import-events.mjs --city=Bilbao    → solo esa ciudad
//                                                      (por si alguna vez una
//                                                      ciudad tiene más de una
//                                                      fuente, como Madrid +
//                                                      Eventbrite)
//
// Variables de entorno:
//   SUPABASE_URL                p. ej. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   clave service_role (¡solo en secretos de CI!)
//   EVENTBRITE_TOKEN            (opcional) token privado de la API de Eventbrite
//   EVENTBRITE_ORGANIZER_IDS    (opcional) ids de organizadores separados por comas
//   DRY_RUN=1                   solo mostrar qué se importaría, sin escribir en BD

import { SUPABASE_URL, SERVICE_KEY, HORIZON_DAYS, fetchSafely, dedupeAgainstExisting, insertDrafts } from './import-lib/core.mjs';
import { fetchMadridEvents } from './import-lib/sources/madrid.mjs';
import { fetchBarcelonaEvents } from './import-lib/sources/barcelona.mjs';
import { fetchMalagaEvents } from './import-lib/sources/malaga.mjs';
import { fetchZaragozaEvents } from './import-lib/sources/zaragoza.mjs';
import { fetchBilbaoEvents } from './import-lib/sources/bilbao.mjs';
import { fetchVitoriaEvents } from './import-lib/sources/vitoria.mjs';
import { fetchVigoEvents } from './import-lib/sources/vigo.mjs';
import { fetchEventbriteEvents } from './import-lib/sources/eventbrite.mjs';

const DRY_RUN = process.env.DRY_RUN === '1';

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Cada entrada es una fuente concreta; varias fuentes pueden compartir
// ciudad (hoy solo pasa con Madrid + Eventbrite).
const SOURCES = [
  { key: 'madrid', city: 'Madrid', label: 'datos.madrid.es', fetch: fetchMadridEvents },
  { key: 'eventbrite', city: 'Madrid', label: 'Eventbrite', fetch: fetchEventbriteEvents },
  { key: 'barcelona', city: 'Barcelona', label: 'Open Data BCN', fetch: fetchBarcelonaEvents },
  { key: 'malaga', city: 'Málaga', label: 'Datos Abiertos Málaga', fetch: fetchMalagaEvents },
  { key: 'zaragoza', city: 'Zaragoza', label: 'Agenda de Zaragoza', fetch: fetchZaragozaEvents },
  { key: 'bilbao', city: 'Bilbao', label: 'Agenda de Bilbao', fetch: fetchBilbaoEvents },
  { key: 'vitoria', city: 'Vitoria-Gasteiz', label: 'Agenda de Vitoria-Gasteiz', fetch: fetchVitoriaEvents },
  { key: 'vigo', city: 'Vigo', label: 'Agenda de Vigo', fetch: fetchVigoEvents },
];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Filtro opcional por CLI: un argumento posicional (clave de fuente) o
// --city=Nombre (todas las fuentes de esa ciudad). Sin argumentos, todas.
function selectSources(argv) {
  const cityArg = argv.find((a) => a.startsWith('--city='))?.slice('--city='.length);
  const sourceArg = argv.find((a) => !a.startsWith('--'));

  if (cityArg) {
    const wanted = normalize(cityArg);
    const matches = SOURCES.filter((s) => normalize(s.city) === wanted);
    if (matches.length === 0) throw new Error(`Ninguna fuente coincide con --city=${cityArg}`);
    return matches;
  }
  if (sourceArg) {
    const match = SOURCES.find((s) => s.key === sourceArg);
    if (!match) {
      const disponibles = SOURCES.map((s) => s.key).join(', ');
      throw new Error(`Fuente desconocida "${sourceArg}". Disponibles: ${disponibles}`);
    }
    return [match];
  }
  return SOURCES;
}

const selected = selectSources(process.argv.slice(2));

const results = [];
for (const source of selected) {
  const rows = await fetchSafely(source.label, source.fetch);
  console.log(`${source.label}: ${rows.length} eventos en ventana de ${HORIZON_DAYS} días`);
  results.push({ ...source, rows });
}

const allRows = results.flatMap((r) => r.rows);

if (DRY_RUN) {
  for (const { label, rows } of results) {
    if (rows.length === 0) continue;
    const byCategory = {};
    for (const row of rows) byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    const withCoords = rows.filter((r) => r.lat != null).length;
    console.log(`${label} por categoría:`, byCategory, `| con coordenadas: ${withCoords}/${rows.length}`);
    console.log(`${label} muestra:`, JSON.stringify(rows[0], null, 2));
  }
} else {
  const deduped = await dedupeAgainstExisting(allRows);
  const total = await insertDrafts(deduped);
  console.log(`Nuevos borradores insertados: ${total} (el resto ya existía)`);
}
