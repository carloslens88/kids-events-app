import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
};

// Versión nativa (iOS/Android): Leaflet dentro de un WebView.
// La versión web vive en events-map.web.tsx (iframe).
export function EventsMap({ events }: Props) {
  const router = useRouter();
  const html = useMemo(() => buildMapHtml(events, 'webview'), [events]);

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
