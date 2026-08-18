import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
  city: string;
  userLocation?: { lat: number; lng: number } | null;
  centerRequestId?: number; // se incrementa para forzar recentrar en userLocation
};

// Versión nativa (iOS/Android): Leaflet dentro de un WebView.
// La versión web vive en events-map.web.tsx (iframe).
export function EventsMap({ events, city, userLocation, centerRequestId }: Props) {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(
    () => buildMapHtml(events, 'webview', city, userLocation ?? null),
    [events, city, userLocation]
  );

  useEffect(() => {
    if (!centerRequestId || !userLocation) return;
    webviewRef.current?.injectJavaScript(
      `window.map && window.map.setView([${userLocation.lat}, ${userLocation.lng}], 15); true;`
    );
  }, [centerRequestId]);

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
