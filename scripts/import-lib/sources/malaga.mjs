// Datos Abiertos Málaga — CSV actualizado a diario con la agenda del año en
// curso. Trae un campo de destinatarios limpio (INFANTIL / JUVENIL / TODAS
// LAS EDADES / ADULTOS) pero no coordenadas: geocodificamos cada dirección
// única con Nominatim, respetando su límite de 1 petición/segundo.
import { now, horizon, sameLocalDay, geocodeAddress } from '../core.mjs';

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

export async function fetchMalagaEvents() {
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
    const coords = streetAddress ? await geocodeAddress(streetAddress, 'Málaga') : null;

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
      // El CSV trae ID_IMAGEN (numérico) pero no hay ninguna URL base
      // documentada ni verificable para reconstruir la imagen a partir de
      // ese id — queda pendiente hasta confirmarla, no se inventa.
      image_url: null,
    });
  }
  return rows;
}
