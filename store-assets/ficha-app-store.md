# Ficha de App Store Connect — textos listos para copiar/pegar

## Nombre de la app (30 caracteres máx.)
Peque-Eventos

## Subtítulo (30 caracteres máx., específico de Apple — sale bajo el nombre)
Planes infantiles cerca de ti

## Descripción (4.000 caracteres máx.)
Reutiliza tal cual la de `ficha-play-store.md` (mismo límite, mismo texto sirve).

## Palabras clave (Keywords) — 100 caracteres máx., separadas por comas, SIN espacios tras la coma
eventos infantiles,planes familia,ocio niños,agenda infantil,teatro niños,talleres niños,mapa

(Apple no tiene "categoría de etiquetas" como Google: esto es un único campo de 100
caracteres que Apple usa para indexar búsquedas. No repitas palabras que ya estén en
el nombre/subtítulo, cuentan igual y desperdician espacio.)

## Categoría
Primaria: **Lifestyle** (Estilo de vida — no existe "Familia"/"Parenting" como
categoría propia en App Store; es el equivalente más cercano)
Secundaria (opcional): Reference, o déjala en blanco

## Edad mínima / Age Rating (cuestionario propio de Apple, no es IARC)
Mismas respuestas honestas que en Google: sin violencia, sin contenido sexual, sin
lenguaje soez, sin sustancias, sin juego con dinero real, sin contenido de terror,
sin contenido generado por usuarios, sin interacción entre usuarios ni chat. Con esas
respuestas debería salir **4+**.

⚠️ En el paso de "Age Rating" Apple pregunta explícitamente si la app está dirigida a
niños ("Made for Kids"). **Responde que NO** — la usan los padres, no los niños
directamente (mismo motivo que en Google: entrar en el programa "Kids Category" trae
restricciones mucho más estrictas que no encajan con esta app).

## URL de política de privacidad
https://kids-events-app.expo.app/privacidad
(ya está publicada y en uso para la ficha de Google Play)

## App Privacy ("nutrition label") — Apple → App Privacy → Get Started

**"Do you or your third-party partners collect data from this app?" → No.**

Apple define "collect" como transmitir datos fuera del dispositivo para acceder a
ellos **más tiempo del necesario para servir la petición en tiempo real**. El botón
"Buscar en esta zona" del mapa envía tu ubicación a Supabase, pero solo para esa
consulta puntual (encontrar eventos cercanos) — no se guarda en ninguna tabla ni log
propio. Con esa definición exacta (confirmada en pantalla al rellenar el formulario
el 2026-08-31), encaja en la excepción de "servir la petición en tiempo real", así
que la respuesta correcta es "No" para toda la sección, no solo para location.

(Nota: esto es más preciso que lo que se declaró en Google Play Data Safety — el
formulario de Google no tiene esa misma excepción de "tiempo real sin retención", así
que ahí sí se declaró la ubicación como recogida. No es una contradicción: son dos
definiciones legales distintas, cada una respondida correctamente según sus propias
reglas.)

## Capturas de pantalla — ⚠️ requieren tamaño específico de Apple
Las 3 capturas que ya tenéis en `store-assets/` (hechas para Play Store) probablemente
NO tengan la resolución exacta que exige Apple para el dispositivo obligatorio:
**iPhone 6.7" (1290×2796 px)**. Si `supportsTablet: true` sigue activo en `app.json`,
puede que también pida capturas de iPad (12.9", 2048×2732 px).
Recomendación: generar capturas nuevas directamente desde el simulador de iPhone 15/16
Pro Max (Xcode Simulator, Cmd+S para capturar a resolución nativa) en vez de reescalar
las de Android.

## Contacto de soporte
- URL de soporte: puede ser la misma web pública, o un email tipo
  `carloslens88@gmail.com` si no tenéis página de soporte dedicada.
- Copyright: © 2026 Carlos Lens Grela
