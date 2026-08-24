// Auto-publicación diaria: revisa los eventos en borrador (status='draft')
// y publica los que tienen informados los campos clave para que un padre/
// madre pueda decidir con ellos (título, descripción y dónde es). Si no
// traen foto, se les pone una genérica de Pexels según la categoría (banco
// de imágenes con licencia libre, sin coste, sin problema de derechos).
//
// "Campos clave" para auto-publicar (criterio de este script, ajustable):
//   - title y description no vacíos
//   - venue_name o address informado (para saber dónde es)
//   - imagen: la que ya traiga la fuente, o una de Pexels si no
// Lo que no cumpla esto se queda en borrador para que el admin lo revise a
// mano desde /admin, igual que hasta ahora.
//
// Variables de entorno:
//   SUPABASE_URL                p. ej. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   clave service_role (¡solo en secretos de CI!)
//   PEXELS_API_KEY              (opcional) clave gratuita de pexels.com/api;
//                                sin ella, solo se publican eventos que YA
//                                traen foto propia (no se bloquea el resto).
//   DRY_RUN=1                   solo mostrar qué se publicaría, sin escribir

import { nextPexelsImage } from './publish-lib/pexels.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function hasKeyFields(event) {
  return Boolean(
    event.title?.trim() &&
    event.description?.trim() &&
    (event.venue_name?.trim() || event.address?.trim())
  );
}

async function fetchPublishableDrafts() {
  // PostgREST limita a 1000 filas por página por defecto: paginamos con
  // Range, si no con muchos borradores acumulados se cortaría en silencio.
  const drafts = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/events?status=eq.draft&last_date=gte.${encodeURIComponent(new Date().toISOString())}&select=*`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${offset}-${offset + 999}`,
        },
      }
    );
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} leyendo borradores`);
    const page = await response.json();
    drafts.push(...page);
    if (page.length < 1000) break;
  }
  return drafts;
}

async function publishEvent(id, imageUrl) {
  const body = imageUrl ? { status: 'published', image_url: imageUrl } : { status: 'published' };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status} publicando ${id}: ${await response.text()}`);
}

const drafts = DRY_RUN
  ? await (async () => {
      // En dry-run igual necesitamos leer de Supabase para ver candidatos reales.
      if (!SUPABASE_URL || !SERVICE_KEY) {
        console.log('DRY_RUN sin credenciales de Supabase: no se puede consultar la base, nada que mostrar.');
        return [];
      }
      return fetchPublishableDrafts();
    })()
  : await fetchPublishableDrafts();

console.log(`Borradores candidatos (con campos clave completos o no): ${drafts.length}`);

let published = 0;
let skippedFields = 0;
let skippedImage = 0;

for (const event of drafts) {
  if (!hasKeyFields(event)) {
    skippedFields += 1;
    continue;
  }

  let imageUrl = event.image_url;
  if (!imageUrl) {
    if (!PEXELS_API_KEY) {
      skippedImage += 1;
      continue; // sin Pexels configurado, no auto-publicamos eventos sin foto propia
    }
    imageUrl = await nextPexelsImage(event.category, PEXELS_API_KEY);
    if (!imageUrl) {
      skippedImage += 1;
      continue; // Pexels no encontró nada para esta categoría, se deja para revisión manual
    }
  }

  if (DRY_RUN) {
    console.log(` - Se publicaría: "${event.title}" (${event.city})${event.image_url ? '' : ` [foto Pexels: ${imageUrl}]`}`);
  } else {
    await publishEvent(event.id, event.image_url ? null : imageUrl);
  }
  published += 1;
}

console.log(
  `Publicados: ${published}. Sin campos clave completos: ${skippedFields}. ` +
    `Sin foto (propia o de Pexels): ${skippedImage}.`
);
