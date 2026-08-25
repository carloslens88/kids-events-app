import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
  city: string;
  centerOn?: { lat: number; lng: number } | null; // cambia para recentrar en caliente
  fallbackCenter?: [number, number] | null; // dónde centrar si events viene vacío
  onMapMoved?: (point: { lat: number; lng: number }) => void; // el usuario arrastró/hizo zoom a mano
};

// Versión web: el mismo mapa Leaflet, dentro de un iframe.
// Los pines avisan con postMessage al window padre para navegar al detalle.
export function EventsMap({ events, city, centerOn, fallbackCenter, onMapMoved }: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(
    () => buildMapHtml(events, city, fallbackCenter),
    [events, city, fallbackCenter]
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { pequeEventId?: string; mapMoved?: { lat: number; lng: number } };
      if (data?.pequeEventId) router.push({ pathname: '/event/[id]', params: { id: data.pequeEventId } });
      else if (data?.mapMoved) onMapMoved?.(data.mapMoved);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router, onMapMoved]);

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
