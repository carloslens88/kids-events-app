// Importador diario de eventos infantiles → Supabase (como BORRADORES).
// Fuentes:
//   1. datos.madrid.es — agenda municipal (filtrada por audiencia Niños/Familias)
//   2. Eventbrite — eventos de organizadores concretos (lista en env), opcional
//   3. Open Data BCN — agenda diaria de Barcelona (filtrada por clasificación infantil)
//   4. Datos Abiertos Málaga — agenda cultural en CSV (filtrada por destinatarios)
//
// Los eventos entran con status='draft' y NO aparecen en la app hasta que el
// admin los revisa y publica desde el panel. Los reimportes no duplican ni
// pisan lo ya editado (conflicto por external_id → se ignora).
//
// Variables de entorno:
//   SUPABASE_URL                p. ej. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   clave service_role (¡solo en secretos de CI!)
//   EVENTBRITE_TOKEN            (opcional) token privado de la API de Eventbrite
//   EVENTBRITE_ORGANIZER_IDS    (opcional) ids de organizadores separados por comas

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1'; // solo mostrar, sin escribir en BD
const HORIZON_DAYS = 90; // vista de 3 meses
const CITY = 'Madrid';

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const now = new Date();
const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 3600 * 1000);
const sameLocalDay = (a, b) => a.toDateString() === b.toDateString();

// ---------- datos.madrid.es ----------

const MADRID_FEED =
  'https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json';

const CATEGORY_RULES = [
  ['teatro', ['teatroperformance', 'danzabaile', 'circo']],
  ['musica', ['musica', 'concierto', 'flamenco']],
  ['cuentacuentos', ['cuentacuentos', 'titeres', 'marionetas', 'lectura']],
  ['taller', ['cursostalleres', 'taller']],
  ['museo', ['exposiciones', 'museo', 'cine']],
  ['deporte', ['deporte', 'actividadesfisicas']],
  ['aire_libre', ['itinerarios', 'ambientales', 'parquesjardines', 'excursiones']],
];

function mapCategory(typeUri = '') {
  const t = typeUri.toLowerCase();
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => t.includes(k))) return category;
  }
  return 'otros';
}

// Audiencia del feed → rango de edad. Solo importamos lo claramente infantil
// o familiar (0-17 / todo público con niños).
function mapAges(audience = '') {
  const a = audience.toLowerCase();
  const hasKids = a.includes('niñ');
  const hasFamily = a.includes('famili');
  if (!hasKids && !hasFamily) return null; // fuera del público objetivo
  let min = 99;
  let max = 0;
  if (hasKids) { min = Math.min(min, 0); max = Math.max(max, 12); }
  if (hasFamily) { min = Math.min(min, 0); max = Math.max(max, 17); }
  if (a.includes('joven')) { min = Math.min(min, 12); max = Math.max(max, 17); }
  return { age_min: min, age_max: max };
}

function parseFeedDate(value) {
  // El feed usa "2026-08-21 22:00:00.0" en hora de Madrid.
  if (!value) return null;
  const d = new Date(value.replace(' ', 'T').replace(/\.\d$/, ''));
  return isNaN(d.getTime()) ? null : d;
}

async function fetchMadridEvents() {
  const response = await fetch(MADRID_FEED, { redirect: 'follow' });
  if (!response.ok) throw new Error(`datos.madrid.es HTTP ${response.status}`);
  const data = await response.json();
  const rows = [];

  for (const item of data['@graph'] ?? []) {
    const ages = mapAges(item.audience);
    if (!ages) continue;

    const start = parseFeedDate(item.dtstart);
    const end = parseFeedDate(item.dtend);
    if (!start) continue;
    // Ventana de 3 meses: empieza dentro del horizonte y no ha terminado ya.
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const sameDay = !end || start.toDateString() === end.toDateString();
    let priceEur = 0;
    let description = (item.description ?? '').trim() || null;
    if (item.free !== 1 && item.price) {
      const match = String(item.price).replace(',', '.').match(/\d+(\.\d+)?/);
      if (match) priceEur = parseFloat(match[0]);
      else description = [description, `Precio: ${item.price}`].filter(Boolean).join('\n\n');
    }

    rows.push({
      external_id: `madrid:${item.id ?? item.uid}`,
      source: 'madrid_opendata',
      status: 'draft',
      title: (item.title ?? '').trim(),
      description,
      category: mapCategory(item['@type']),
      ...ages,
      date_mode: sameDay ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameDay ? null : end.toISOString(),
      extra_dates: [],
      venue_name: item['event-location'] || null,
      address: item.address?.area?.['street-address'] || null,
      city: CITY,
      lat: item.location?.latitude ?? null,
      lng: item.location?.longitude ?? null,
      price_eur: priceEur,
      source_url: item.link || null,
      image_url: null,
    });
  }
  return rows;
}

// ---------- Open Data BCN (Barcelona) ----------

// Agenda diaria completa del ayuntamiento (~190 MB, ~5000 actividades de toda
// la ciudad). La filtramos por clasificación: solo lo que la propia agenda
// etiqueta explícitamente como infantil/familiar o con una edad concreta.
const BARCELONA_FEED =
  'https://opendata-ajuntament.barcelona.cat/data/dataset/a25e60cd-3083-4252-9fce-81f733871cb1/resource/da9e71de-0f8e-417d-928a-56380bfd0231/download';

const BCN_CATEGORY_RULES = [
  ['teatro', ['teatre', 'dansa', 'circ']],
  ['musica', ['música', 'musica', 'concert']],
  ['cuentacuentos', ['conte', 'titelles', 'narrac']],
  ['taller', ['casals', 'colòni', 'coloni', 'taller']],
  ['museo', ['exposici', 'museu', 'cinema']],
  ['deporte', ['esport']],
  ['aire_libre', ['itinerari', 'natura', 'parc', 'jardí', 'jardi']],
];

function mapBcnCategory(fullPaths) {
  const t = fullPaths.join(' ').toLowerCase();
  for (const [category, keywords] of BCN_CATEGORY_RULES) {
    if (keywords.some((k) => t.includes(k))) return category;
  }
  return 'otros';
}

// Busca "NN anys" en las clasificaciones para acotar la edad exacta; si solo
// hay una marca genérica de "infants"/"nens", usamos un rango amplio 0-12.
function mapBcnAges(fullPaths) {
  const text = fullPaths.join(' ').toLowerCase();
  const isKids = /infant|nens|nenes|per edat|casals|colòni|coloni/.test(text);
  if (!isKids) return null;

  const ageMatches = [...text.matchAll(/\b(\d{2})\s*anys\b/g)].map((m) => parseInt(m[1], 10));
  if (ageMatches.length > 0) {
    return { age_min: Math.min(...ageMatches), age_max: Math.max(...ageMatches) };
  }
  return { age_min: 0, age_max: 12 };
}

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

async function fetchBarcelonaEvents() {
  const response = await fetch(BARCELONA_FEED, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Open Data BCN HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    // El portal sirve una página de verificación anti-bots (BunkerWeb/hCaptcha)
    // ante tráfico de centros de datos como GitHub Actions, en vez del JSON.
    throw new Error(
      `respuesta no-JSON (${contentType || 'sin content-type'}); probable bloqueo anti-bots por IP`
    );
  }
  const data = await response.json();
  const rows = [];

  for (const item of data ?? []) {
    const start = item.start_date ? new Date(item.start_date) : null;
    const end = item.end_date ? new Date(item.end_date) : start;
    if (!start || isNaN(start.getTime())) continue;
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const fullPaths = [...(item.classifications_data ?? []), ...(item.secondary_filters_data ?? [])].map(
      (c) => c.full_path ?? c.name ?? ''
    );
    const ages = mapBcnAges(fullPaths);
    if (!ages) continue;

    const address = (item.addresses ?? []).find((a) => a.main_address) ?? item.addresses?.[0];
    const coords = address?.location_4326_latlon?.geometries?.[0]?.coordinates; // [lng, lat]

    rows.push({
      external_id: `barcelona:${item.register_id}`,
      source: 'barcelona_opendata',
      status: 'draft',
      title: (item.name ?? '').trim(),
      description: stripHtml(item.body),
      category: mapBcnCategory(fullPaths),
      ...ages,
      date_mode: sameLocalDay(start, end) ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
      extra_dates: [],
      venue_name: address?.address_name ?? null,
      address: address?.address_name ?? null,
      city: 'Barcelona',
      lat: coords ? coords[1] : null,
      lng: coords ? coords[0] : null,
      price_eur: 0, // no viene en el feed de forma fiable; el admin lo ajusta al revisar
      source_url: null,
      image_url: null,
    });
  }
  return rows;
}

// ---------- Datos Abiertos Málaga ----------

// CSV actualizado a diario con la agenda del año en curso. Trae un campo de
// destinatarios limpio (INFANTIL / JUVENIL / TODAS LAS EDADES / ADULTOS) pero
// no coordenadas: geocodificamos cada dirección única con Nominatim,
// respetando su límite de 1 petición/segundo.
const MALAGA_AGES = {
  INFANTIL: { age_min: 0, age_max: 12 },
  JUVENIL: { age_min: 12, age_max: 17 },
  'TODAS LAS EDADES': { age_min: 0, age_max: 17 },
};

const MALAGA_CATEGORY_RULES = [
  ['taller', ['cursos y talleres']],
  ['musica', ['música', 'musica']],
  ['teatro', ['espectaculos', 'espectáculos']],
  ['deporte', ['deportes']],
  ['museo', ['ferias, exposiciones y museos', 'cine']],
  ['aire_libre', ['fiestas populares']],
];

function mapMalagaCategory(categoria = '') {
  const c = categoria.toLowerCase();
  for (const [category, keywords] of MALAGA_CATEGORY_RULES) {
    if (keywords.some((k) => c.includes(k))) return category;
  }
  return 'otros';
}

// "DD/MM/YYYY HH:MM:SS" en hora de Málaga.
function parseMalagaDate(value) {
  const m = (value ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, day, month, year, hour, minute] = m;
  const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  return isNaN(d.getTime()) ? null : d;
}

// Parser CSV mínimo pero correcto: soporta campos entre comillas con comas y
// saltos de línea dentro (el CSV de Málaga los tiene, p. ej. en teléfonos).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // ignorar, el \n del CRLF cierra la fila
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const geocodeCache = new Map();

// Nominatim pide como máximo 1 petición/segundo; los eventos comparten mucho
// recinto, así que en la práctica son pocas direcciones únicas por ejecución.
async function geocodeMalaga(address, attempt = 1) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  const query = encodeURIComponent(`${address}, Málaga, España`);
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
  if (!coords && attempt < 2) return geocodeMalaga(address, attempt + 1);
  geocodeCache.set(address, coords);
  return coords;
}

async function fetchMalagaEvents() {
  const year = now.getFullYear();
  const response = await fetch(`https://datosabiertos.malaga.eu/recursos/cultura/agenda/${year}.csv`);
  if (!response.ok) throw new Error(`Datos Abiertos Málaga HTTP ${response.status}`);
  const text = await response.text();
  const [header, ...dataRows] = parseCsv(text);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];

  for (const cols of dataRows) {
    if (cols.length < header.length) continue;
    const ages = MALAGA_AGES[cols[idx.DESTINATARIOS_DESCRIPCION]];
    if (!ages) continue;

    const start = parseMalagaDate(cols[idx.F_INICIO]);
    const end = parseMalagaDate(cols[idx.F_FIN]) ?? start;
    if (!start) continue;
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const streetAddress = cols[idx.EQP_NOMBRECALLE]?.trim();
    const coords = streetAddress ? await geocodeMalaga(streetAddress) : null;

    let webUrl = cols[idx.DIRECCION_WEB]?.trim() || null;
    if (webUrl && !/^https?:\/\//i.test(webUrl)) webUrl = `https://${webUrl}`;

    let priceEur = 0;
    const priceMatch = (cols[idx.PRECIO] ?? '').replace(',', '.').match(/\d+(\.\d+)?/);
    if (priceMatch) priceEur = parseFloat(priceMatch[0]);

    rows.push({
      external_id: `malaga:${cols[idx.ID_ACTIVIDAD] || cols[idx.ID_EVENTO]}`,
      source: 'malaga_opendata',
      status: 'draft',
      title: (cols[idx.NOMBRE] || cols[idx.EVENTO] || '').trim(),
      description: cols[idx.DESCRIPCION]?.trim() || null,
      category: mapMalagaCategory(cols[idx.CATEGORIA]),
      ...ages,
      date_mode: sameLocalDay(start, end) ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
      extra_dates: [],
      venue_name: cols[idx.EQP_DESCRIPCION]?.trim() || null,
      address: streetAddress || null,
      city: 'Málaga',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      price_eur: priceEur,
      source_url: webUrl,
      image_url: null,
    });
  }
  return rows;
}

// ---------- Eventbrite (opcional, por organizador) ----------

async function fetchEventbriteEvents() {
  const token = process.env.EVENTBRITE_TOKEN;
  const organizerIds = (process.env.EVENTBRITE_ORGANIZER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!token || organizerIds.length === 0) {
    console.log('Eventbrite: sin token u organizadores configurados, se omite.');
    return [];
  }

  const rows = [];
  for (const organizerId of organizerIds) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const url =
        `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/` +
        `?status=live&order_by=start_asc&expand=venue,ticket_availability&page=${page}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        console.error(`Eventbrite organizador ${organizerId}: HTTP ${response.status}`);
        break;
      }
      const data = await response.json();

      for (const event of data.events ?? []) {
        const start = new Date(event.start?.utc);
        const end = new Date(event.end?.utc);
        if (isNaN(start.getTime()) || start > horizon || end < now) continue;
        const venueCity = (event.venue?.address?.city ?? '').toLowerCase();
        if (venueCity && venueCity !== CITY.toLowerCase()) continue;
        if (event.online_event) continue;

        const sameDay = start.toDateString() === end.toDateString();
        const minPrice = event.ticket_availability?.minimum_ticket_price;
        rows.push({
          external_id: `eventbrite:${event.id}`,
          source: 'eventbrite',
          status: 'draft',
          title: event.name?.text?.trim() ?? '',
          description: event.summary?.trim() || event.description?.text?.trim() || null,
          category: 'otros', // el admin la ajusta al revisar
          age_min: 0,
          age_max: 17,
          date_mode: sameDay ? 'single' : 'range',
          starts_at: start.toISOString(),
          ends_at: sameDay ? null : end.toISOString(),
          extra_dates: [],
          venue_name: event.venue?.name ?? null,
          address: event.venue?.address?.localized_address_display ?? null,
          city: CITY,
          lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : null,
          lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : null,
          price_eur: event.is_free ? 0 : parseFloat(minPrice?.major_value ?? '0') || 0,
          source_url: event.url ?? null,
          image_url: event.logo?.url ?? null,
        });
      }
      hasMore = Boolean(data.pagination?.has_more_items);
      page += 1;
    }
  }
  return rows;
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

async function dedupeAgainstExisting(rows) {
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

async function insertDrafts(rows) {
  if (rows.length === 0) return 0;
  // on_conflict=external_id + ignore-duplicates: lo ya importado (y quizá
  // editado/publicado por el admin) no se toca jamás.
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/events?on_conflict=external_id`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  }
  const inserted = await response.json();
  return inserted.length;
}

// Cada fuente es independiente: si una falla (red, cambio de formato, un
// bloqueo anti-bots, etc.) no debe impedir que las demás se importen.
async function fetchSafely(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`⚠️  ${label} falló, se omite esta vez: ${error.message}`);
    return [];
  }
}

const madrid = await fetchSafely('datos.madrid.es', fetchMadridEvents);
console.log(`datos.madrid.es: ${madrid.length} eventos infantiles/familiares en ventana de ${HORIZON_DAYS} días`);
const eventbrite = await fetchSafely('Eventbrite', fetchEventbriteEvents);
if (eventbrite.length) console.log(`Eventbrite: ${eventbrite.length} eventos en ventana`);
const barcelona = await fetchSafely('Open Data BCN', fetchBarcelonaEvents);
console.log(`Open Data BCN: ${barcelona.length} eventos infantiles/familiares en ventana`);
const malaga = await fetchSafely('Datos Abiertos Málaga', fetchMalagaEvents);
console.log(`Datos Abiertos Málaga: ${malaga.length} eventos infantiles/familiares en ventana`);

const allRows = [...madrid, ...eventbrite, ...barcelona, ...malaga];

if (DRY_RUN) {
  for (const [label, rows] of [
    ['Madrid', madrid],
    ['Barcelona', barcelona],
    ['Málaga', malaga],
  ]) {
    const byCategory = {};
    for (const row of rows) byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    const withCoords = rows.filter((r) => r.lat != null).length;
    console.log(`${label} por categoría:`, byCategory, `| con coordenadas: ${withCoords}/${rows.length}`);
    if (rows[0]) console.log(`${label} muestra:`, JSON.stringify(rows[0], null, 2));
  }
} else {
  const deduped = await dedupeAgainstExisting(allRows);
  const total = await insertDrafts(deduped);
  console.log(`Nuevos borradores insertados: ${total} (el resto ya existía)`);
}
