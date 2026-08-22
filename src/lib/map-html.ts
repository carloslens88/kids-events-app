import { getCategory, KidsEvent } from './types';

// Centro aproximado de cada ciudad soportada, usado solo cuando no hay
// eventos geocodificados que mostrar (si no, el mapa se ajusta a los pines).
const CITY_CENTERS: Record<string, [number, number]> = {
  Madrid: [40.4168, -3.7038],
  Barcelona: [41.3874, 2.1686],
  Málaga: [36.7213, -4.4213],
  Zaragoza: [41.6488, -0.8891],
};

// HTML del mapa (Leaflet + OpenStreetMap, sin API keys) compartido entre la
// versión nativa (WebView) y la web (iframe). El centrado/marcador de "mi
// ubicación" se controla después, en caliente, con un mensaje — así pulsar
// el botón no recarga el mapa entero ni pierde el zoom/posición actuales.
export function buildMapHtml(events: KidsEvent[], city: string): string {
  const markers = events
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => {
      const category = getCategory(e.category);
      return {
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        emoji: category.emoji,
        color: category.color,
        title: e.title.replace(/[<>"'`]/g, ''),
      };
    });

  const fallbackCenter = CITY_CENTERS[city] ?? CITY_CENTERS.Madrid;

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { margin:0; height:100%; }
      .pin-wrap { width: 34px; height: 44px; cursor: pointer; }
      .pin-wrap svg { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      .pin-emoji { position: absolute; top: 6px; left: 0; width: 34px; text-align: center; font-size: 15px; line-height: 22px; }
      .me-dot { width: 18px; height: 18px; border-radius: 999px; background: #4285F4; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(66,133,244,.35), 0 1px 4px rgba(0,0,0,.35); }
      .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; }
      .leaflet-popup-content a { color: #FF6B6B; font-weight: 700; text-decoration: none; }
      .leaflet-control-attribution { font-size: 9px; padding: 0 4px; opacity: 0.7; }
    </style>
  </head><body><div id="map"></div><script>
    function openEvent(id) {
      const msg = { pequeEventId: id };
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(id);
      else window.parent.postMessage(msg, '*');
    }
    const markers = ${JSON.stringify(markers)};
    const fallbackCenter = ${JSON.stringify(fallbackCenter)};

    const map = L.map('map', { zoomControl: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    map.attributionControl.setPrefix(false); // quita el "Leaflet" del control, deja solo el aviso obligatorio de OSM

    function pinIcon(color, emoji) {
      const svg = '<svg width="34" height="44" viewBox="0 0 34 44">' +
        '<path d="M17 0C7.6 0 0 7.6 0 17c0 12.2 17 27 17 27s17-14.8 17-27C34 7.6 26.4 0 17 0z" fill="' + color + '"/>' +
        '<circle cx="17" cy="17" r="12" fill="#fff"/>' +
        '</svg>';
      return L.divIcon({
        className: '',
        html: '<div class="pin-wrap">' + svg + '<div class="pin-emoji">' + emoji + '</div></div>',
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -40],
      });
    }

    const group = [];
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: pinIcon(m.color, m.emoji) }).addTo(map);
      marker.bindPopup('<b>' + m.title + '</b><br/><a href="#" onclick="openEvent(\\'' + m.id + '\\'); return false;">Ver evento →</a>');
      group.push(marker);
    }
    if (group.length > 0) {
      map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
    } else {
      map.setView(fallbackCenter, 12);
    }

    // Botón "mi ubicación" del lado nativo/web: pide centrar el mapa y
    // pintar (o mover) el punto azul, sin recargar nada. Funciona tanto con
    // postMessage del WebView de React Native (llega a 'document') como con
    // el postMessage del iframe en la web (llega a 'window').
    let meMarker = null;
    function meIcon() {
      return L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    }
    function handleMessage(event) {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || !data.centerOn) return;
      const { lat, lng } = data.centerOn;
      map.setView([lat, lng], 15);
      if (meMarker) meMarker.setLatLng([lat, lng]);
      else meMarker = L.marker([lat, lng], { icon: meIcon(), zIndexOffset: 1000 }).addTo(map);
    }
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage); // WebView de React Native en Android
  </script></body></html>`;
}
