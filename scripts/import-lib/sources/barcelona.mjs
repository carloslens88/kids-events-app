// Open Data BCN — agenda diaria completa del ayuntamiento (~190 MB, ~5000
// actividades de toda la ciudad). La filtramos por clasificación: solo lo
// que la propia agenda etiqueta explícitamente como infantil/familiar o con
// una edad concreta.
import { now, horizon, sameLocalDay, stripHtml } from '../core.mjs';

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

export async function fetchBarcelonaEvents() {
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
      // image_data.image es una URL absoluta ya servida por el propio
      // ayuntamiento (CDN estatics-nasia.dtibcn.cat); solo ~40% de los
      // eventos la traen, el resto se queda sin foto.
      image_url: item.image_data?.image ?? null,
    });
  }
  return rows;
}
