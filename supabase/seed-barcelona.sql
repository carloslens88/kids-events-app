-- Eventos de ejemplo en Barcelona (opcional): al ejecutarlo, "Barcelona"
-- aparecerá automáticamente en el selector de ciudad de la app.
-- Ejecútalo en el SQL Editor de Supabase.

insert into public.events
  (title, description, category, age_min, age_max, starts_at, venue_name, address, city, lat, lng, price_eur, source_url)
values
  ('Cuentacuentos en el Parc de la Ciutadella',
   'Historias y canciones al aire libre junto a la cascada. Actividad gratuita para toda la familia.',
   'cuentacuentos', 2, 7,
   now() + interval '2 days' + interval '11 hours 30 minutes',
   'Parc de la Ciutadella', 'Passeig de Picasso, 21', 'Barcelona', 41.3888, 2.1870, 0,
   null),

  ('Taller de ciencia en CosmoCaixa',
   'Experimentos para pequeños científicos: volcanes, imanes y burbujas gigantes.',
   'taller', 5, 12,
   now() + interval '4 days' + interval '10 hours 30 minutes',
   'CosmoCaixa', 'C/ d''Isaac Newton, 26', 'Barcelona', 41.4133, 2.1312, 6,
   'https://cosmocaixa.org'),

  ('El pequeño dragón, teatro de títeres',
   'Espectáculo de marionetas sobre un dragón que aprende a volar. En catalán y castellano.',
   'teatro', 3, 8,
   now() + interval '6 days' + interval '17 hours 30 minutes',
   'Poble Espanyol', 'Av. Francesc Ferrer i Guàrdia, 13', 'Barcelona', 41.3691, 2.1481, 9,
   null),

  ('Bici-paseo familiar por la Barceloneta',
   'Ruta guiada en bici por el paseo marítimo, con paradas para jugar. Bicis infantiles disponibles.',
   'aire_libre', 6, 12,
   now() + interval '9 days' + interval '10 hours',
   'Platja de la Barceloneta', 'Passeig Marítim de la Barceloneta', 'Barcelona', 41.3784, 2.1925, 8,
   null);
