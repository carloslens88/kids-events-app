import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
  city: string;
  centerOn?: { lat: number; lng: number } | null; // cambia para recentrar en caliente
  fallbackCenter?: [number, number] | null; // dónde centrar si events viene vacío
  onMapMoved?: (point: { lat: number; lng: number }) => void; // el usuario arrastró/hizo zoom a mano
};

// Versión nativa (iOS/Android): Leaflet dentro de un WebView.
// La versión web vive en events-map.web.tsx (iframe).
export function EventsMap({ events, city, centerOn, fallbackCenter, onMapMoved }: Props) {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(
    () => buildMapHtml(events, city, fallbackCenter),
    [events, city, fallbackCenter]
  );

  useEffect(() => {
    if (!centerOn) return;
    webviewRef.current?.postMessage(JSON.stringify({ centerOn }));
  }, [centerOn]);

  return (
    <WebView
      ref={webviewRef}
      style={styles.map}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={(message) => {
        let data: { pequeEventId?: string; mapMoved?: { lat: number; lng: number } };
        try {
          data = JSON.parse(message.nativeEvent.data);
        } catch {
          return;
        }
        if (data.pequeEventId) router.push({ pathname: '/event/[id]', params: { id: data.pequeEventId } });
        else if (data.mapMoved) onMapMoved?.(data.mapMoved);
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
