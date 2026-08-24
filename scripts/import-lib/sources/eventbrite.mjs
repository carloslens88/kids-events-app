// Eventbrite — eventos de organizadores concretos (lista en env), opcional.
// La API general de búsqueda por categoría fue deprecada por Eventbrite; solo
// se puede consultar por organizador conocido, de ahí que dependa de
// EVENTBRITE_ORGANIZER_IDS en vez de traer eventos de cualquier ciudad.
import { now, horizon } from '../core.mjs';

const CITY = 'Madrid';

export async function fetchEventbriteEvents() {
  const token = process.env.EVENTBRITE_TOKEN;
  const organizerIds = (process.env.EVENTBRITE_ORGANIZER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!token || organizerIds.length === 0) {
    console.log('Eventbrite: sin token u organizadores configurados, se omite.');
    return [];
  }

  const rows = [];
  for (const organizerId of organizerIds) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const url =
        `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/` +
        `?status=live&order_by=start_asc&expand=venue,ticket_availability&page=${page}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        console.error(`Eventbrite organizador ${organizerId}: HTTP ${response.status}`);
        break;
      }
      const data = await response.json();

      for (const event of data.events ?? []) {
        const start = new Date(event.start?.utc);
        const end = new Date(event.end?.utc);
        if (isNaN(start.getTime()) || start > horizon || end < now) continue;
        const venueCity = (event.venue?.address?.city ?? '').toLowerCase();
        if (venueCity && venueCity !== CITY.toLowerCase()) continue;
        if (event.online_event) continue;

        const sameDay = start.toDateString() === end.toDateString();
        const minPrice = event.ticket_availability?.minimum_ticket_price;
        rows.push({
          external_id: `eventbrite:${event.id}`,
          source: 'eventbrite',
          status: 'draft',
          title: event.name?.text?.trim() ?? '',
          description: event.summary?.trim() || event.description?.text?.trim() || null,
          category: 'otros', // el admin la ajusta al revisar
          age_min: 0,
          age_max: 17,
          date_mode: sameDay ? 'single' : 'range',
          starts_at: start.toISOString(),
          ends_at: sameDay ? null : end.toISOString(),
          extra_dates: [],
          venue_name: event.venue?.name ?? null,
          address: event.venue?.address?.localized_address_display ?? null,
          city: CITY,
          lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : null,
          lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : null,
          price_eur: event.is_free ? 0 : parseFloat(minPrice?.major_value ?? '0') || 0,
          source_url: event.url ?? null,
          image_url: event.logo?.url ?? null,
        });
      }
      hasMore = Boolean(data.pagination?.has_more_items);
      page += 1;
    }
  }
  return rows;
}
