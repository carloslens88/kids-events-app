import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
  city: string;
  centerOn?: { lat: number; lng: number } | null; // cambia para recentrar en caliente
};

// Versión web: el mismo mapa Leaflet, dentro de un iframe.
// Los pines avisan con postMessage al window padre para navegar al detalle.
export function EventsMap({ events, city, centerOn }: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => buildMapHtml(events, city), [events, city]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const id = (event.data as { pequeEventId?: string })?.pequeEventId;
      if (id) router.push({ pathname: '/event/[id]', params: { id } });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    if (!centerOn) return;
    iframeRef.current?.contentWindow?.postMessage({ centerOn }, '*');
  }, [centerOn]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title="Mapa de eventos"
      style={{ border: 0, width: '100%', flex: 1, minHeight: 420 }}
    />
  );
}
