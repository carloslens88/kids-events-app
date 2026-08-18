import { getCategory, KidsEvent } from './types';

// HTML del mapa (Leaflet + OpenStreetMap, sin API keys) compartido entre la
// versión nativa (WebView) y la web (iframe). `channel` decide cómo se avisa
// al tocar un pin: postMessage al WebView o al window padre.
export function buildMapHtml(events: KidsEvent[], channel: 'webview' | 'iframe'): string {
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

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { margin:0; height:100%; }
      .pin-wrap { width: 34px; height: 44px; cursor: pointer; }
      .pin-wrap svg { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      .pin-emoji { position: absolute; top: 6px; left: 0; width: 34px; text-align: center; font-size: 15px; line-height: 22px; }
      .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; }
      .leaflet-popup-content a { color: #FF6B6B; font-weight: 700; text-decoration: none; }
      .leaflet-control-attribution { font-size: 9px; padding: 0 4px; opacity: 0.7; }
    </style>
  </head><body><div id="map"></div><script>
    function openEvent(id) { ${notify} }
    const markers = ${JSON.stringify(markers)};
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
      map.setView([40.4168, -3.7038], 12);
    }
  </script></body></html>`;
}
