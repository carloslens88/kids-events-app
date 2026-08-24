// Agenda de Vigo — única fuente real confirmada tras revisar a fondo el
// catálogo CKAN de Vigo (datos-ckan.vigo.org) y la web pública de agenda
// (esta última resultó ser una página residual sin API real detrás).
// Limitaciones aceptadas conscientemente:
//   - Es el snapshot de "hoy", no una ventana de 90 días como las demás
//     fuentes: solo acumula valor real ejecutándose a diario vía cron.
//   - Sin campo de público/edad: solo un código numérico "subcategoria" sin
//     diccionario público, así que filtramos por palabras clave en el título
//     (infantil/nen@/famil, en castellano y gallego).
//   - Sin coordenadas: geocodificamos con dirección o, si no hay, con el
//     propio título (para atracciones permanentes tipo museos).
//   - El campo "imagen" es un nombre de fichero suelto sin URL base
//     verificable, así que se deja sin imagen.
import { now, horizon, sameLocalDay, geocodeAddress } from '../core.mjs';

const VIGO_FEED = 'https://datos.vigo.org/data/axenda/agenda-hoy.json';

const KIDS_KEYWORDS = /infantil|nen[oa@]s?|neno|nena|famil/i;

function parseVigoDate(value) {
  const m = (value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return isNaN(d.getTime()) ? null : d;
}

export async function fetchVigoEvents() {
  const response = await fetch(VIGO_FEED, { headers: { 'User-Agent': 'peque-eventos-importer/1.0' } });
  if (!response.ok) throw new Error(`Agenda Vigo HTTP ${response.status}`);
  const items = await response.json();
  const rows = [];

  for (const item of items) {
    if (!KIDS_KEYWORDS.test(item.titulo ?? '')) continue;

    const start = parseVigoDate(item.fecha_inicio);
    const end = parseVigoDate(item.fecha_fin) ?? start;
    if (!start) continue; // sin fecha (atracciones permanentes) no encaja en el modelo de "evento"
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const geocodeQuery = item.direccion || item.titulo;
    const coords = geocodeQuery ? await geocodeAddress(geocodeQuery, 'Vigo') : null;

    rows.push({
      external_id: `vigo:${item.id}`,
      source: 'vigo_opendata',
      status: 'draft',
      title: (item.titulo ?? '').trim(),
      description: null, // el feed no trae descripción
      category: 'otros', // sin campo de categoría fiable (solo códigos sin diccionario); el admin la ajusta
      age_min: 0,
      age_max: 12,
      date_mode: sameLocalDay(start, end) ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
      extra_dates: [],
      venue_name: item.direccion ? item.titulo : null,
      address: item.direccion || null,
      city: 'Vigo',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      price_eur: 0, // el feed no trae precio
      source_url: null,
      image_url: null,
    });
  }
  return rows;
}
