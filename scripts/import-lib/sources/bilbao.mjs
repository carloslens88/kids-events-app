// Agenda de Bilbao — bilbao.eus/opendata cataloga esto como "Agenda
// Municipal de Bilbao" (JSON diario). El campo "tipo" mezcla categoría y
// público en una sola etiqueta; el valor "Infantiles" es el que usamos como
// filtro. Aviso: el JSON que sirve el propio Ayuntamiento no es válido
// estricto (trae tabuladores/saltos de línea sin escapar dentro de las
// descripciones en HTML), así que hay que sanear caracteres de control
// antes de JSON.parse.
import { now, horizon, sameLocalDay, geocodeAddress } from '../core.mjs';

const BILBAO_FEED =
  'https://www.bilbao.eus/cs/Satellite?c=Page&cid=1272990237857&pageid=1272990237857&idioma=es&pagename=Bilbaonet/Page/BIO_ListadoEventosAppInfoBilbao&todos=si';

function parseBilbaoDate(value, hora) {
  if (!value) return null;
  let d;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-').map(Number);
    const [h, m] = (hora ?? '00:00').split(':').map(Number);
    d = new Date(year, month - 1, day, h || 0, m || 0);
  } else {
    // "YYYY-MM-DD HH:MM:SS" ya trae hora propia, se ignora "hora" aparte.
    d = new Date(value.replace(' ', 'T'));
  }
  return isNaN(d.getTime()) ? null : d;
}

// El feed trae el texto en HTML con entidades con nombre (&aacute;, &ntilde;,
// etc.), no UTF-8 directo como el resto de fuentes, así que hace falta
// decodificarlas además de quitar las etiquetas.
const HTML_NAMED_ENTITIES = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º',
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
};

function stripHtmlBilbao(html) {
  return (
    (html ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (m, code) => {
        if (code[0] === '#') {
          const codePoint = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
          return String.fromCodePoint(codePoint);
        }
        return HTML_NAMED_ENTITIES[code] ?? m;
      })
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

export async function fetchBilbaoEvents() {
  const response = await fetch(BILBAO_FEED, { headers: { 'User-Agent': 'peque-eventos-importer/1.0' } });
  if (!response.ok) throw new Error(`Agenda Bilbao HTTP ${response.status}`);
  // Sanear caracteres de control sueltos (tabuladores/saltos de línea dentro
  // de campos HTML) que rompen JSON.parse estricto; los espacios son siempre
  // whitespace válido entre tokens JSON, así que este saneado no rompe nada.
  const clean = (await response.text()).replace(/[\x00-\x1f]/g, ' ');
  const items = JSON.parse(clean);
  const rows = [];

  for (const item of items) {
    if (item.tipo !== 'Infantiles') continue; // única etiqueta de público infantil del feed

    const start = parseBilbaoDate(item.fecha_desde, item.hora);
    const end = parseBilbaoDate(item.fecha_hasta, item.hora) ?? start;
    if (!start) continue;
    if (start > horizon) continue;
    if ((end ?? start) < now) continue;

    const coords = item.direccion ? await geocodeAddress(item.direccion, 'Bilbao') : null;

    rows.push({
      external_id: `bilbao:${item.id}`,
      source: 'bilbao_opendata',
      status: 'draft',
      title: (item.titulo ?? '').trim(),
      description: stripHtmlBilbao(item.observaciones) ?? stripHtmlBilbao(item.info),
      category: 'otros', // el feed no da categoría fina para "Infantiles"; el admin la ajusta al revisar
      age_min: 0,
      age_max: 12,
      date_mode: sameLocalDay(start, end) ? 'single' : 'range',
      starts_at: start.toISOString(),
      ends_at: sameLocalDay(start, end) ? null : end.toISOString(),
      extra_dates: [],
      venue_name: item.lugar || null,
      address: item.direccion || null,
      city: 'Bilbao',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      price_eur: 0, // el feed no trae precio numérico
      source_url: item.parametros
        ?.replace(/^http:\/\/www\.bilbao\.net/, 'https://www.bilbao.eus')
        .replace(/&amp;/g, '&') ?? null,
      image_url: null, // el feed no trae ningún campo de imagen
    });
  }
  return rows;
}
