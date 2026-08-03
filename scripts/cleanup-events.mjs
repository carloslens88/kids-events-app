// Limpieza diaria: borra definitivamente los borradores (status='draft')
// cuya fecha ya pasó hace más de CLEANUP_GRACE_DAYS y que nunca se
// publicaron. En la app y en /admin ya se ocultan en cuanto caducan (pestaña
// "Caducados"); este script solo se encarga de no acumular basura en la
// base de datos con el paso del tiempo.
//
// Variables de entorno:
//   SUPABASE_URL                p. ej. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   clave service_role (solo en secretos de CI)
//   CLEANUP_GRACE_DAYS          días de margen tras caducar (por defecto 7)
//   DRY_RUN=1                   solo mostrar qué se borraría, sin borrar

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GRACE_DAYS = Number(process.env.CLEANUP_GRACE_DAYS ?? 7);
const DRY_RUN = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 3600 * 1000).toISOString();

const query = `status=eq.draft&last_date=lt.${encodeURIComponent(cutoff)}`;

if (DRY_RUN) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/events?${query}&select=id,title,last_date`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows = await response.json();
  console.log(`Se borrarían ${rows.length} borradores caducados (más de ${GRACE_DAYS} días):`);
  for (const row of rows) console.log(` - ${row.title} (${row.last_date})`);
} else {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/events?${query}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  }
  const deleted = await response.json();
  console.log(`Borradores caducados eliminados: ${deleted.length}`);
}
