// Fotos genéricas de Pexels para eventos sin imagen propia, agrupadas por
// categoría. Antes se guardaba una única foto por categoría y se repetía en
// todos los eventos de esa categoría — con ~8 categorías y miles de eventos
// eso se notaba muchísimo. Ahora se pide un pool de varias búsquedas por
// categoría, se mezcla, y se reparte en round-robin: no se repite ninguna
// hasta agotar el pool, y al agotarlo se vuelve a barajar en vez de repetir
// siempre en el mismo orden.

// Variantes deliberadamente distintas entre sí (no solo sinónimos del mismo
// encuadre), para que Pexels devuelva fotos realmente diferentes y no la
// misma sesión de fotos una y otra vez bajo términos parecidos.
const PEXELS_QUERIES = {
  teatro: [
    'children theater performance stage',
    'kids drama play',
    'children puppet show',
    'kids costume performance',
    'children circus act',
  ],
  musica: [
    'kids music concert',
    'children singing choir',
    'kids playing instruments',
    'children dance class',
    'kids band rehearsal',
  ],
  taller: [
    'kids art craft workshop',
    'children painting workshop',
    'kids making crafts',
    'children clay pottery workshop',
    'kids science experiment class',
    'children cooking workshop',
  ],
  aire_libre: [
    'children playing outdoor park',
    'kids nature adventure',
    'children playground outdoors',
    'kids hiking forest',
    'children picnic outdoors',
  ],
  deporte: [
    'kids sports activity',
    'children playing football',
    'kids gymnastics class',
    'children swimming pool',
    'kids basketball court',
  ],
  museo: [
    'children museum exhibition',
    'kids science museum',
    'children art gallery visit',
    'kids planetarium space',
    'children history museum tour',
  ],
  cuentacuentos: [
    'kids storytelling reading book',
    'children library reading',
    'kids bedtime story',
    'children book club',
    'kids puppet storytelling',
  ],
  otros: [
    'family kids fun activity',
    'children having fun together',
    'kids birthday party fun',
    'family day out',
    'children festival celebration',
    'kids amusement park',
  ],
};

const PER_QUERY_RESULTS = 80; // el máximo que admite la API de Pexels

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function searchPexels(query, apiKey) {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_QUERY_RESULTS}&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );
    if (!response.ok) {
      console.error(`Pexels HTTP ${response.status} buscando "${query}"`);
      return [];
    }
    const data = await response.json();
    return (data.photos ?? []).map((p) => p.src?.large).filter(Boolean);
  } catch (error) {
    console.error(`Pexels falló buscando "${query}": ${error.message}`);
    return [];
  }
}

const pools = new Map(); // category -> string[] (pool ya barajado)
const cursors = new Map(); // category -> siguiente índice a repartir

// Una sola vez por categoría (y por proceso): junta los resultados de varias
// búsquedas relacionadas para tener más variedad que con una sola query.
async function buildPool(category, apiKey) {
  const queries = PEXELS_QUERIES[category] ?? PEXELS_QUERIES.otros;
  const results = await Promise.all(queries.map((q) => searchPexels(q, apiKey)));
  const unique = [...new Set(results.flat())];
  return shuffle(unique);
}

export async function nextPexelsImage(category, apiKey) {
  if (!pools.has(category)) {
    pools.set(category, await buildPool(category, apiKey));
    cursors.set(category, 0);
  }
  const pool = pools.get(category);
  if (pool.length === 0) return null; // Pexels no devolvió nada para ninguna variante

  let cursor = cursors.get(category);
  if (cursor >= pool.length) {
    pools.set(category, shuffle(pool)); // se agotó: rebaraja en vez de repetir siempre el mismo orden
    cursor = 0;
  }
  const image = pools.get(category)[cursor];
  cursors.set(category, cursor + 1);
  return image;
}
