import { getCategory, KidsEvent } from './types';

// Centro aproximado de cada ciudad soportada, usado solo cuando no hay
// eventos geocodificados que mostrar (si no, el mapa se ajusta a los pines).
const CITY_CENTERS: Record<string, [number, number]> = {
  Madrid: [40.4168, -3.7038],
  Barcelona: [41.3874, 2.1686],
  Málaga: [36.7213, -4.4213],
};

type UserLocation = { lat: number; lng: number } | null;

// HTML del mapa (Leaflet + OpenStreetMap, sin API keys) compartido entre la
// versión nativa (WebView) y la web (iframe). `channel` decide cómo se avisa
// al tocar un pin: postMessage al WebView o al window padre.
export function buildMapHtml(
  events: KidsEvent[],
  channel: 'webview' | 'iframe',
  city: string,
  userLocation: UserLocation = null
): string {
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

  const notify =
    channel === 'webview'
      ? "window.ReactNativeWebView.postMessage(id)"
      : "window.parent.postMessage({ pequeEventId: id }, '*')";

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
    function openEvent(id) { ${notify} }
    const markers = ${JSON.stringify(markers)};
    const userLocation = ${JSON.stringify(userLocation)};
    const fallbackCenter = ${JSON.stringify(fallbackCenter)};

    const map = L.map('map', { zoomControl: false });
    window.map = map; // permite recentrar desde fuera (injectJavaScript / postMessage)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    map.attributionControl.setPrefix(false); // quita el "Leaflet" del control, deja solo el aviso obligatorio de OSM

    // El padre (WebView nativo o iframe web) puede pedir recentrar el mapa,
    // por ejemplo al pulsar el botón de "mi ubicación".
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.centerOn) map.setView([data.centerOn.lat, data.centerOn.lng], 15);
    });

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

    if (userLocation) {
      const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker([userLocation.lat, userLocation.lng], { icon: meIcon, zIndexOffset: 1000 }).addTo(map);
    }

    if (group.length > 0) {
      map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 13);
    } else {
      map.setView(fallbackCenter, 12);
    }
  </script></body></html>`;
}
