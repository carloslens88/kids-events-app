// Agenda de Zaragoza — scraping de tarjetas, no hay feed real.
//
// El recurso "oficial" de datos abiertos (cultura.json/csv/xml, catálogo 282)
// no es la agenda: es el widget de destacados de portada, siempre 6 eventos +
// 6 programas, ignora paginación. La agenda completa (~1200 actividades) solo
// existe como HTML paginado en /sede/servicio/cultura/evento?start=N. Cada
// tarjeta lleva marcado RDFa/schema.org con fecha, coordenadas ya en WGS84 y
// una etiqueta de público oculta para accesibilidad (Infancia/Jóvenes/
// Adultos/Mujeres/Población en general) que usamos como filtro de edad, tan
// fiable como el campo "audience" de Madrid pero sin descripción disponible.
import { now, horizon, sameLocalDay, mapWithConcurrency } from '../core.mjs';

const ZARAGOZA_LISTING = 'https://www.zaragoza.es/sede/servicio/cultura/evento';
const ZARAGOZA_MAX_PAGES = 60; // margen sobre las ~25 páginas reales (50/página)

const ZARAGOZA_AGES = {
  Infancia: { age_min: 0, age_max: 12 },
  Jóvenes: { age_min: 12, age_max: 17 },
};

const ZARAGOZA_CATEGORY_RULES = [
  ['teatro', ['teatro', 'danza', 'circo']],
  ['musica', ['musica']],
  ['cuentacuentos', ['cuentacuentos', 'narracion', 'lectura']],
  ['taller', ['artes-plasticas', 'formacion', 'idiomas', 'manualidades']],
  ['museo', ['exposiciones', 'museo', 'cine', 'patrimonio']],
  ['deporte', ['deporte']],
  ['aire_libre', ['naturaleza', 'medioambiente', 'parque']],
];

function mapZaragozaCategory(icon = '') {
  const i = icon.toLowerCase();
  for (const [category, keywords] of ZARAGOZA_CATEGORY_RULES) {
    if (keywords.some((k) => i.includes(k))) return category;
  }
  return 'otros';
}

const ZARAGOZA_MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// El listado marca las fechas como "Mon Sep 07 00:00:00 CEST 2026": el
// nombre de la zona horaria (CEST/CET) no lo entiende el parser de Date de
// Node ("Invalid Date"), así que reconstruimos a mano en hora local, igual
// que ya hace el resto del script con feeds sin offset explícito.
function parseZaragozaDate(value) {
  const m = (value ?? '').match(/^\w+ (\w+) (\d{2}) (\d{2}):(\d{2}):(\d{2}) \w+ (\d{4})$/);
  if (!m) return null;
  const [, monthName, day, hour, minute, second, year] = m;
  const month = ZARAGOZA_MONTHS[monthName];
  if (month === undefined) return null;
  const d = new Date(Number(year), month, Number(day), Number(hour), Number(minute), Number(second));
  return isNaN(d.getTime()) ? null : d;
}

function decodeZaragozaEntities(text = '') {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// No hay JSON de por medio: cada tarjeta es un bloque RDFa suelto en el HTML.
// La anclamos por el <meta property="title">, miramos un poco hacia atrás
// (ahí vive el icono de categoría) y varios miles de caracteres hacia
// adelante (ahí vienen fechas, público, geo, precio y el enlace).
function parseZaragozaCards(html) {
  const cards = [];
  const titleRe = /<meta property="title" content="([^"]*)" \/>/g;
  let match;
  while ((match = titleRe.exec(html))) {
    const title = decodeZaragozaEntities(match[1]).trim();
    const before = html.slice(Math.max(0, match.index - 800), match.index);
    const after = html.slice(match.index, match.index + 3000);

    const linkHref = after.match(/property="link"[^>]*href="([^"]*)"/)?.[1];
    const id = linkHref?.match(/\/evento\/(\d+)/)?.[1];
    if (!id) continue;

    const venue = after.match(/property="name">([^<]*)</)?.[1];
    const address = after.match(/property="address" class="oculto">([^<]*)</)?.[1];
    const priceBlock = after.match(/typeof="Offer">([\s\S]*?)<\/div>/)?.[1];

    // La tarjeta solo muestra una cosa u otra: el icono genérico de categoría
    // (carpeta /icon/) cuando el evento no tiene foto propia, o la foto real
    // (carpeta /imagen/) cuando sí la tiene. De ahí sacamos icon o image,
    // nunca los dos a la vez.
    const imgSrc = before.match(/<img[^>]*\bsrc="([^"]*)"/)?.[1];
    const icon = imgSrc?.includes('/icon/') ? imgSrc.match(/icon\/([a-zA-Z0-9_-]+)\.png/)?.[1] : null;
    const image = imgSrc?.includes('/imagen/')
      ? (imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc)
      : null;

    cards.push({
      id,
      title,
      icon: icon ?? '',
      image,
      venue: venue ? decodeZaragozaEntities(venue) : null,
      address: address ? decodeZaragozaEntities(address) : null,
      startRaw: after.match(/property="startDate" content="([^"]*)"/)?.[1],
      endRaw: after.match(/property="endDate" content="([^"]*)"/)?.[1],
      label: after.match(/class="label label-info oculto">([^<]*)</)?.[1],
      lat: after.match(/property="latitude" content="([^"]*)"/)?.[1],
      lng: after.match(/property="longitude" content="([^"]*)"/)?.[1],
      priceText: priceBlock ? priceBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null,
      url: linkHref,
    });
  }
  return cards;
}

// El listado no trae descripción, solo la ficha individual (dentro de su
// JSON-LD schema.org). Se pide aparte y solo para los eventos que ya
// pasaron el filtro de público infantil/juvenil, no para las ~1200
// actividades del listado completo.
async function fetchZaragozaDescription(url) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'peque-eventos-importer/1.0' } });
    if (!response.ok) return null;
    const jsonLd = (await response.text()).match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    )?.[1];
    if (!jsonLd) return null;
    return JSON.parse(jsonLd).description?.trim() || null;
  } catch {
    return null; // fallo puntual de red: se deja sin descripción, no bloquea el resto
  }
}

export async function fetchZaragozaEvents() {
  const rows = [];
  const seenIds = new Set();

  for (let page = 0; page < ZARAGOZA_MAX_PAGES; page++) {
    const offset = page * 50;
    const response = await fetch(`${ZARAGOZA_LISTING}?start=${offset}`, {
      headers: { 'User-Agent': 'peque-eventos-importer/1.0' },
    });
    if (!response.ok) throw new Error(`Agenda Zaragoza HTTP ${response.status} (start=${offset})`);
    const cards = parseZaragozaCards(await response.text());
    if (cards.length === 0) break; // fin del listado

    for (const card of cards) {
      const ages = ZARAGOZA_AGES[card.label];
      if (!ages) continue; // solo Infancia / Jóvenes; el resto no es nuestro público
      if (seenIds.has(card.id)) continue;

      const start = parseZaragozaDate(card.startRaw);
      const end = parseZaragozaDate(card.endRaw) ?? start;
      if (!start) continue;
      if (start > horizon) continue;
      if ((end ?? start) < now) continue;

      seenIds.add(card.id);

      let priceEur = 0;
      if (card.priceText && card.priceText !== 'Gratuita') {
        const priceMatch = card.priceText.replace(',', '.').match(/\d+(\.\d+)?/);
        if (priceMatch) priceEur = parseFloat(priceMatch[0]);
      }

      rows.push({
        external_id: `zaragoza:${card.id}`,
        source: 'zaragoza_scraping',
        status: 'draft',
        title: card.title,
        description: null, // se rellena después, en batch, ver más abajo
        category: mapZaragozaCategory(card.icon),
        ...ages,
        date_mode: sameLocalDay(start, end) ? 'single' : 'range',
        starts_at: start.toISOString(),
        ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
        extra_dates: [],
        venue_name: card.venue,
        address: card.address,
        city: 'Zaragoza',
        lat: card.lat ? parseFloat(card.lat) : null,
        lng: card.lng ? parseFloat(card.lng) : null,
        price_eur: priceEur,
        source_url: card.url,
        image_url: card.image,
      });
    }
  }

  const descriptions = await mapWithConcurrency(rows, 5, (row) => fetchZaragozaDescription(row.source_url));
  rows.forEach((row, i) => { row.description = descriptions[i]; });

  return rows;
}
