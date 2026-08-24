// Agenda de Vitoria-Gasteiz — no hay dataset de datos abiertos ni RSS
// público para esto: es la API AJAX interna que usa el propio widget de
// calendario del ayuntamiento (CalendarioServlet), localizada leyendo su JS
// (agenda.js) porque las URLs de RSS que documentan en otras páginas están
// muertas. El campo "destinatario" es el filtro de público, tan fiable como
// el de Zaragoza.
import { now, horizon, sameLocalDay, geocodeAddress } from '../core.mjs';

const VITORIA_ENDPOINT = 'https://www.vitoria-gasteiz.org/wb021/was/CalendarioServlet';

const VITORIA_AGES = {
  Infantil: { age_min: 0, age_max: 12 },
  Juvenil: { age_min: 12, age_max: 17 },
};

function parseVitoriaDate(yyyymmdd, hhmm) {
  if (!/^\d{8}$/.test(yyyymmdd ?? '')) return null;
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const [h, m] = (hhmm ?? '00:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, h || 0, m || 0);
  return isNaN(d.getTime()) ? null : d;
}

export async function fetchVitoriaEvents() {
  const filter = encodeURIComponent(JSON.stringify({ dest: ['infantil', 'juvenil'] }));
  const params =
    `accion=buscar&idioma=es&claveArea=&claveTema=&calendariosID=196&t=` +
    `&fd=${now.getTime()}&fh=${horizon.getTime()}&deCM=false&f=${filter}`;
  const response = await fetch(`${VITORIA_ENDPOINT}?${params}`, {
    method: 'POST',
    headers: { 'User-Agent': 'peque-eventos-importer/1.0' },
  });
  if (!response.ok) throw new Error(`Agenda Vitoria-Gasteiz HTTP ${response.status}`);
  const data = await response.json();
  const items = data.actividades?.resultados ?? [];
  const rows = [];

  for (const item of items) {
    if (item.isCancelado) continue;
    const ages = VITORIA_AGES[item.destinatario];
    if (!ages) continue; // por si el servidor devolviera algo fuera de infantil/juvenil

    const start = parseVitoriaDate(item.fechaInicio, item.horaInicio);
    const end = parseVitoriaDate(item.fechaFin, item.horaFin) ?? start;
    if (!start) continue;
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const coords = item.localizacion ? await geocodeAddress(item.localizacion, 'Vitoria-Gasteiz') : null;
    const id = item.url?.match(/uid=([a-zA-Z0-9_]+)/)?.[1];

    rows.push({
      external_id: `vitoria:${id ?? `${item.titulo}-${item.fechaInicio}`}`,
      source: 'vitoria_gasteiz',
      status: 'draft',
      title: (item.titulo ?? '').trim(),
      description: null, // no viene en el listado; habría que scrapear cada ficha aparte
      category: 'otros', // el feed no da una categoría fiable; el admin la ajusta al revisar
      ...ages,
      date_mode: sameLocalDay(start, end) ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
      extra_dates: [],
      venue_name: item.localizacion || null,
      address: item.localizacion || null,
      city: 'Vitoria-Gasteiz',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      price_eur: 0, // el listado no trae precio
      source_url: item.url ?? null,
      image_url: item.imagen ? `https://www.vitoria-gasteiz.org${item.imagen}` : null,
    });
  }
  return rows;
}
