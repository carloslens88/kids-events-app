import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { getCategory, KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
};

// Mapa con Leaflet + OpenStreetMap dentro de un WebView: sin API keys ni
// coste en ninguna plataforma. Tocar un pin abre el detalle del evento.
export function EventsMap({ events }: Props) {
  const router = useRouter();

  const html = useMemo(() => {
    const markers = events
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        emoji: getCategory(e.category).emoji,
        title: e.title.replace(/[<>"'`]/g, ''),
      }));

    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { margin:0; height:100%; }
        .pin { font-size: 26px; text-shadow: 0 1px 3px rgba(0,0,0,.35); }
      </style>
    </head><body><div id="map"></div><script>
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
        marker.bindPopup('<b>' + m.title + '</b><br/><a href="#" onclick="window.ReactNativeWebView.postMessage(\\'' + m.id + '\\'); return false;">Ver evento →</a>');
        group.push(marker);
      }
      if (group.length > 0) {
        map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
      } else {
        map.setView([40.4168, -3.7038], 12);
      }
    </script></body></html>`;
  }, [events]);

  return (
    <WebView
      style={styles.map}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={(message) => {
        const id = message.nativeEvent.data;
        if (id) router.push({ pathname: '/event/[id]', params: { id } });
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
