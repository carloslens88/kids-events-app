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
};

// Versión nativa (iOS/Android): Leaflet dentro de un WebView.
// La versión web vive en events-map.web.tsx (iframe).
export function EventsMap({ events, city, centerOn }: Props) {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(() => buildMapHtml(events, city), [events, city]);

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
        const id = message.nativeEvent.data;
        if (id) router.push({ pathname: '/event/[id]', params: { id } });
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
