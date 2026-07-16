# Peque-Eventos (Kids-Events) 🎈

Catálogo móvil (Android + iOS) de eventos infantiles por ciudad, construido con
**Expo (React Native + TypeScript)** y **Supabase** como backend gratuito.

## Qué hace la app

- Lista de próximos eventos con foto, categoría, edades, precio y distancia a tu ubicación.
- Selector de ciudad: las ciudades disponibles se deducen de los eventos de la base de datos.
- Filtros por categoría (teatro, talleres, aire libre…) y rango de edad.
- Búsqueda por texto (sin distinguir acentos) y tres tipos de calendario por evento:
  un día, varias fechas sueltas o temporada continua (ej. una exposición de feb a oct).
- Detalle del evento con "Cómo llegar" (Google/Apple Maps), "Añadir al calendario",
  botón de compartir (WhatsApp, etc.) y enlace a entradas.
- Favoritos guardados en el dispositivo (sin necesidad de crear cuenta).
- Perfil de peques: al abrir por primera vez pregunta las edades de tus hijos y
  personaliza el catálogo (chip "Para mis peques" para activar/desactivar).
- Filtros rápidos de un toque: Hoy · Este finde · Gratis.
- Aviso de lluvia (☔) en eventos al aire libre de los próximos 7 días (Open-Meteo, gratis).
- Vista de mapa (Leaflet + OpenStreetMap, sin API keys) con pines por categoría.
- Recordatorio semanal opcional (jueves 18:00) con notificación local, sin servidor.
- Eventos destacados (⭐) que se muestran arriba del catálogo.

## Puesta en marcha (primera vez)

### 1. Crear el proyecto en Supabase (gratis, ~5 minutos)

1. Entra en [supabase.com](https://supabase.com) y regístrate (puedes usar tu cuenta de GitHub o Google).
2. Pulsa **New project**: elige un nombre (p. ej. `kids-events`), una contraseña
   para la base de datos (guárdala) y la región **West EU (Ireland)** por cercanía a España.
3. Espera 1-2 minutos a que el proyecto termine de crearse.

### 2. Crear la tabla y cargar eventos de ejemplo

1. En el menú lateral de Supabase, abre **SQL Editor**.
2. Copia el contenido de [`supabase/schema.sql`](supabase/schema.sql), pégalo y pulsa **Run**.
   Esto crea la tabla `events` con seguridad de solo lectura pública.
3. Repite con [`supabase/seed.sql`](supabase/seed.sql): carga 12 eventos de ejemplo en Madrid
   con fechas siempre futuras. Opcional: [`supabase/seed-barcelona.sql`](supabase/seed-barcelona.sql)
   añade 4 eventos en Barcelona para probar el selector de ciudad.
4. Comprueba en **Table Editor → events** que ves los eventos. Ese mismo editor
   es tu "panel de administración": desde ahí añades, editas o borras eventos reales.

### 3. Conectar la app

1. En Supabase ve a **Project Settings → API** y copia dos valores:
   - **Project URL** (algo como `https://abcdefg.supabase.co`)
   - **anon public key** (una clave larga; es pública y segura de incluir en la app)
2. En este proyecto: `cp .env.example .env` y pega ambos valores en `.env`.

### 4. Ejecutar la app

```bash
npm install
npx expo start
```

- **En tu móvil:** instala la app **Expo Go** (App Store / Play Store) y escanea el QR que sale en la terminal.
- **En simulador:** pulsa `i` (iOS, necesita Xcode) o `a` (Android, necesita Android Studio).

Si cambias el `.env`, reinicia con `npx expo start -c` para limpiar la caché.

## Estructura del código

```
src/
  app/                  # Pantallas (expo-router: cada archivo es una ruta)
    (tabs)/index.tsx    #   Lista de eventos con filtros
    (tabs)/favoritos.tsx#   Favoritos guardados en el dispositivo
    event/[id].tsx      #   Detalle de un evento
  components/           # Tarjeta de evento, barra de filtros...
  lib/
    supabase.ts         # Cliente de Supabase (lee las claves del .env)
    types.ts            # Tipo KidsEvent, categorías y formateadores
    favorites.ts        # Favoritos en AsyncStorage
    geo.ts              # Ubicación del usuario y distancias (Haversine)
  app/admin/            # Panel de administración (login + CRUD de eventos)
supabase/
  schema.sql            # Esquema de la base de datos (ejecutar 1 vez, instalación nueva)
  admin.sql             # Permisos del admin + bucket de imágenes (ejecutar 1 vez)
  migration-fechas.sql  # Migración: fechas múltiples y temporadas (solo BD ya existentes)
  seed.sql              # Eventos de ejemplo en Madrid
```

## Panel de administración (añadir eventos con foto)

La propia app incluye un panel en la ruta `/admin`, pensado para usarse desde el navegador:

1. **Una sola vez:** en Supabase, crea tu usuario admin en **Authentication → Users →
   Add user → Create new user** (email + contraseña, marca *Auto Confirm User*), y ejecuta
   [`supabase/admin.sql`](supabase/admin.sql) en el SQL Editor. Ese script da permisos de
   escritura solo a tu email y crea el bucket `event-images` para las fotos.
2. Arranca la versión web: `npx expo start --web` y navega a `http://localhost:8081/admin`.
3. Inicia sesión y gestiona los eventos: crear, editar, borrar, subir foto y obtener
   las coordenadas automáticamente a partir de la dirección (geocodificación con
   OpenStreetMap, gratuita).

La seguridad real está en el servidor: las políticas RLS de Supabase solo aceptan
escrituras de tu usuario, aunque alguien encuentre la ruta /admin en la app.

## Web pública

El catálogo está publicado como web en **https://kids-events-app.expo.app** (EAS Hosting,
capa gratuita, misma cuenta de Expo). El panel de administración vive en
https://kids-events-app.expo.app/admin, protegido por el login.

Para publicar una nueva versión de la web tras hacer cambios:

```bash
npx expo export --platform web
npx eas-cli deploy --prod
```

## Importador automático de eventos (borradores)

Cada madrugada, un workflow de GitHub Actions ([.github/workflows/import-events.yml](.github/workflows/import-events.yml))
ejecuta [scripts/import-events.mjs](scripts/import-events.mjs), que trae eventos infantiles y
familiares con 3 meses de vista y los guarda como **borradores**: no aparecen en la app hasta
que los revisas y publicas desde /admin (pestaña "Borradores").

Fuentes:
- **datos.madrid.es** (agenda municipal, filtrada por audiencia Niños/Familias) — sin configuración.
- **Eventbrite** (opcional): eventos de organizadores concretos. Requiere token de su API y
  la lista de ids de organizadores.

Configuración (una vez), en GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` ⚠️ clave de administrador: solo aquí, jamás en la app |
| `EVENTBRITE_TOKEN` | (opcional) token privado de eventbrite.com/platform |
| `EVENTBRITE_ORGANIZER_IDS` | (opcional) ids separados por comas |

Antes de nada, ejecuta [`supabase/migration-ingesta.sql`](supabase/migration-ingesta.sql) en el
SQL Editor (añade estados borrador/publicado, fuente y destacados).

Prueba local sin escribir en la base de datos: `DRY_RUN=1 node scripts/import-events.mjs`.
Lanzamiento manual: pestaña **Actions** del repo → "Importar eventos" → *Run workflow*.

## Cómo añadir eventos (alternativa manual)

También puedes usar **Table Editor → events → Insert row**
en el dashboard de Supabase. Campos clave:

| Campo | Ejemplo |
|---|---|
| `category` | `teatro`, `musica`, `taller`, `aire_libre`, `deporte`, `museo`, `cuentacuentos`, `otros` |
| `age_min` / `age_max` | `4` / `10` |
| `starts_at` | `2026-07-20 11:00:00+02` |
| `lat` / `lng` | cópialos de Google Maps (clic derecho sobre el lugar → coordenadas) |
| `price_eur` | `0` para gratis |

## Próximos pasos (cuando la idea esté validada)

- Publicación: cuenta de Google Play (25 USD, pago único) y Apple Developer (99 USD/año); builds con `eas build`.
- Formulario para que organizadores propongan eventos (tabla `event_submissions` + moderación).
- Notificaciones push de nuevos eventos (expo-notifications, gratis).
