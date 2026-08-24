// datos.madrid.es — agenda municipal, filtrada por audiencia Niños/Familias.
import { now, horizon, sameLocalDay } from '../core.mjs';

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

export async function fetchMadridEvents() {
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
      city: 'Madrid',
      lat: item.location?.latitude ?? null,
      lng: item.location?.longitude ?? null,
      price_eur: priceEur,
      source_url: item.link || null,
      image_url: null,
    });
  }
  return rows;
}
