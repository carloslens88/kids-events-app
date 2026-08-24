// Utilidades compartidas por todas las fuentes del importador: horizonte de
// fechas, geocodificación, deduplicado e inserción en Supabase. Cada fuente
// vive en su propio archivo bajo import-lib/sources/ e importa de aquí lo
// que necesite — así una fuente nueva no obliga a tocar las demás.

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const HORIZON_DAYS = 90; // vista de 3 meses
export const now = new Date();
export const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 3600 * 1000);

export const sameLocalDay = (a, b) => a.toDateString() === b.toDateString();

export function stripHtml(html) {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

// Cada fuente es independiente: si una falla (red, cambio de formato, un
// bloqueo anti-bots, etc.) no debe impedir que las demás se importen.
export async function fetchSafely(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`⚠️  ${label} falló, se omite esta vez: ${error.message}`);
    return [];
  }
}

// No hay límite documentado en varios de estos dominios, pero tampoco tiene
// sentido lanzar cientos de peticiones a la vez: unas pocas en paralelo.
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const geocodeCache = new Map();

// Nominatim pide como máximo 1 petición/segundo; los eventos comparten mucho
// recinto, así que en la práctica son pocas direcciones únicas por ejecución.
// Compartida entre todas las fuentes sin coordenadas propias (Málaga, Bilbao,
// Vitoria-Gasteiz, Vigo): el límite de 1/s es global de Nominatim, no por
// ciudad, así que el cache y el throttle tienen que ser un único módulo.
export async function geocodeAddress(address, city, attempt = 1) {
  const key = `${address}|${city}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  const query = encodeURIComponent(`${address}, ${city}, España`);
  let coords = null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
      { headers: { 'User-Agent': 'peque-eventos-importer/1.0' }, signal: AbortSignal.timeout(8000) }
    );
    const results = response.ok ? await response.json() : [];
    if (results[0]) coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    // timeout o fallo de red puntual: se reintenta una vez más abajo
  }
  await new Promise((resolve) => setTimeout(resolve, 1100));
  if (!coords && attempt < 2) return geocodeAddress(address, city, attempt + 1);
  geocodeCache.set(key, coords);
  return coords;
}

// ---------- Deduplicado contra lo que ya hay en la base de datos ----------

// El on_conflict=external_id evita reinsertar el MISMO registro dos veces,
// pero no detecta el mismo evento real con un id distinto (p. ej. si el
// propio feed lo publica duplicado, o si aparece en dos fuentes a la vez).
// Aquí comparamos por título normalizado + fecha cercana dentro de la misma
// ciudad, igual que ya hace el aviso de duplicados del panel de admin.
function normalizeTitle(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

async function fetchExistingIndex(cities) {
  const cityFilter = cities.map((c) => `"${c}"`).join(',');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/events?select=title,starts_at,city,external_id&city=in.(${cityFilter})&limit=10000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status} leyendo existentes`);
  const existing = await response.json();

  const byCity = new Map(); // city -> [{ normalized, startsAt, externalId }]
  for (const row of existing) {
    const list = byCity.get(row.city) ?? [];
    list.push({
      normalized: normalizeTitle(row.title),
      startsAt: new Date(row.starts_at),
      externalId: row.external_id,
    });
    byCity.set(row.city, list);
  }
  return byCity;
}

// externalId distinto (o null) es lo que hace que sea un duplicado "de
// verdad": el mismo external_id ya lo resuelve on_conflict sin necesidad de
// pasar por aquí, y contarlo aquí también solo ensuciaría el log a diario.
function isDuplicate(row, byCity) {
  const normalized = normalizeTitle(row.title);
  if (normalized.length < 4) return false;
  const candidates = byCity.get(row.city) ?? [];
  const rowStart = new Date(row.starts_at);
  return candidates.some(({ normalized: other, startsAt, externalId }) => {
    if (externalId === row.external_id) return false;
    const sameTitle = other === normalized || other.includes(normalized) || normalized.includes(other);
    if (!sameTitle) return false;
    const diffDays = Math.abs(rowStart.getTime() - startsAt.getTime()) / 86400000;
    return diffDays <= 2;
  });
}

export async function dedupeAgainstExisting(rows) {
  if (rows.length === 0) return rows;
  const cities = [...new Set(rows.map((r) => r.city))];
  const byCity = await fetchExistingIndex(cities);

  const unique = [];
  let skipped = 0;
  for (const row of rows) {
    if (isDuplicate(row, byCity)) {
      skipped += 1;
      continue;
    }
    unique.push(row);
    // Para detectar también duplicados entre dos candidatos nuevos de esta
    // misma tanda (p. ej. Madrid + Eventbrite trayendo el mismo evento a la
    // vez), los añadimos al índice según se van aceptando.
    const list = byCity.get(row.city) ?? [];
    list.push({
      normalized: normalizeTitle(row.title),
      startsAt: new Date(row.starts_at),
      externalId: row.external_id,
    });
    byCity.set(row.city, list);
  }
  if (skipped > 0) console.log(`Duplicados detectados y omitidos (título + fecha ±2 días): ${skipped}`);
  return unique;
}

// ---------- Inserción en Supabase ----------

export async function insertDrafts(rows) {
  if (rows.length === 0) return 0;
  // on_conflict=external_id + ignore-duplicates: lo ya importado (y quizá
  // editado/publicado por el admin) no se toca jamás.
  const response = await fetch(`${SUPABASE_URL}/rest/v1/events?on_conflict=external_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  }
  const inserted = await response.json();
  return inserted.length;
}
