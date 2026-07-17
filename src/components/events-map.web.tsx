import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { buildMapHtml } from '@/lib/map-html';
import { KidsEvent } from '@/lib/types';

type Props = {
  events: KidsEvent[];
};

// Versión web: el mismo mapa Leaflet, dentro de un iframe.
// Los pines avisan con postMessage al window padre para navegar al detalle.
export function EventsMap({ events }: Props) {
  const router = useRouter();
  const html = useMemo(() => buildMapHtml(events, 'iframe'), [events]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const id = (event.data as { pequeEventId?: string })?.pequeEventId;
      if (id) router.push({ pathname: '/event/[id]', params: { id } });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return (
    <iframe
      srcDoc={html}
      title="Mapa de eventos"
      style={{ border: 0, width: '100%', flex: 1, minHeight: 420 }}
    />
  );
}
