import { getCategory, KidsEvent } from './types';

// HTML del mapa (Leaflet + OpenStreetMap, sin API keys) compartido entre la
// versión nativa (WebView) y la web (iframe). `channel` decide cómo se avisa
// al tocar un pin: postMessage al WebView o al window padre.
export function buildMapHtml(events: KidsEvent[], channel: 'webview' | 'iframe'): string {
  const markers = events
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => ({
      id: e.id,
      lat: e.lat,
      lng: e.lng,
      emoji: getCategory(e.category).emoji,
      title: e.title.replace(/[<>"'`]/g, ''),
    }));

  const notify =
    channel === 'webview'
      ? "window.ReactNativeWebView.postMessage(id)"
      : "window.parent.postMessage({ pequeEventId: id }, '*')";

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { margin:0; height:100%; }
      .pin { font-size: 26px; text-shadow: 0 1px 3px rgba(0,0,0,.35); cursor: pointer; }
      .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; }
      .leaflet-popup-content a { color: #FF6B6B; font-weight: 700; text-decoration: none; }
    </style>
  </head><body><div id="map"></div><script>
    function openEvent(id) { ${notify} }
    const markers = ${JSON.stringify(markers)};
    const map = L.map('map', { zoomControl: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    const group = [];
    for (const m of markers) {
      const icon = L.divIcon({ className: '', html: '<div class="pin">' + m.emoji + '</div>', iconSize: [26, 26], iconAnchor: [13, 24] });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.bindPopup('<b>' + m.title + '</b><br/><a href="#" onclick="openEvent(\\'' + m.id + '\\'); return false;">Ver evento →</a>');
      group.push(marker);
    }
    if (group.length > 0) {
      map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
    } else {
      map.setView([40.4168, -3.7038], 12);
    }
  </script></body></html>`;
}
