// Importador diario de eventos infantiles → Supabase (como BORRADORES).
// Fuentes:
//   1. datos.madrid.es — agenda municipal (filtrada por audiencia Niños/Familias)
//   2. Eventbrite — eventos de organizadores concretos (lista en env), opcional
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

const madrid = await fetchMadridEvents();
console.log(`datos.madrid.es: ${madrid.length} eventos infantiles/familiares en ventana de ${HORIZON_DAYS} días`);
const eventbrite = await fetchEventbriteEvents();
if (eventbrite.length) console.log(`Eventbrite: ${eventbrite.length} eventos en ventana`);

if (DRY_RUN) {
  const byCategory = {};
  for (const row of madrid) byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
  console.log('Por categoría:', byCategory);
  console.log('Muestra:', JSON.stringify(madrid[0], null, 2));
} else {
  const total = await insertDrafts([...madrid, ...eventbrite]);
  console.log(`Nuevos borradores insertados: ${total} (el resto ya existía)`);
}
