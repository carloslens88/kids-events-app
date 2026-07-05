-- Datos de ejemplo: eventos infantiles en Madrid.
-- Las fechas son relativas a "ahora" para que siempre aparezcan como próximos.
-- Ejecútalo en el SQL Editor de Supabase DESPUÉS de schema.sql.

insert into public.events
  (title, description, category, age_min, age_max, starts_at, venue_name, address, city, lat, lng, price_eur, source_url)
values
  ('Cuentacuentos en el Retiro',
   'Sesión de cuentos al aire libre junto al estanque. Trae una manta y disfruta de historias para toda la familia.',
   'cuentacuentos', 3, 8,
   now() + interval '1 day' + interval '11 hours',
   'Parque de El Retiro', 'Plaza de la Independencia, 7', 'Madrid', 40.4153, -3.6845, 0,
   null),

  ('Taller de robots con LEGO',
   'Los peques construyen y programan su primer robot con piezas LEGO. Plazas limitadas, se recomienda reservar.',
   'taller', 6, 12,
   now() + interval '2 days' + interval '10 hours',
   'Espacio Fundación Telefónica', 'C. de Fuencarral, 3', 'Madrid', 40.4210, -3.7018, 12,
   'https://espacio.fundaciontelefonica.com'),

  ('El Principito, el musical',
   'Adaptación musical del clásico de Saint-Exupéry con marionetas gigantes y música en directo.',
   'teatro', 4, 10,
   now() + interval '3 days' + interval '17 hours',
   'Teatro Sanpol', 'Pl. de San Pol de Mar, 1', 'Madrid', 40.4304, -3.7181, 14.5,
   'https://teatrosanpol.com'),

  ('Concierto en familia: Carnaval de los animales',
   'La orquesta interpreta a Saint-Saëns con narración pensada para los más pequeños.',
   'musica', 5, 12,
   now() + interval '5 days' + interval '12 hours',
   'Auditorio Nacional de Música', 'C. del Príncipe de Vergara, 146', 'Madrid', 40.4453, -3.6772, 8,
   null),

  ('Gymkhana de exploradores en Casa de Campo',
   'Juego de pistas por equipos para descubrir la naturaleza del parque. Incluye monitores y diploma de explorador.',
   'aire_libre', 6, 12,
   now() + interval '6 days' + interval '10 hours 30 minutes',
   'Casa de Campo', 'Paseo Puerta del Ángel, 1', 'Madrid', 40.4190, -3.7326, 5,
   null),

  ('Visita-taller: pequeños artistas en el Prado',
   'Recorrido adaptado por las obras maestras del museo seguido de un taller de pintura para niños.',
   'museo', 4, 9,
   now() + interval '7 days' + interval '11 hours',
   'Museo Nacional del Prado', 'P.º del Prado, s/n', 'Madrid', 40.4138, -3.6921, 0,
   'https://www.museodelprado.es'),

  ('Patinaje sobre hielo en familia',
   'Sesión de patinaje con monitores y pingüinos de apoyo para los que empiezan. Alquiler de patines incluido.',
   'deporte', 4, 12,
   now() + interval '8 days' + interval '16 hours',
   'Palacio de Hielo', 'C. de Silvano, 77', 'Madrid', 40.4652, -3.6432, 9.9,
   null),

  ('Cuentos y títeres en la biblioteca',
   'Sesión gratuita de títeres y cuentos para primeros lectores. Entrada libre hasta completar aforo.',
   'cuentacuentos', 0, 5,
   now() + interval '9 days' + interval '17 hours 30 minutes',
   'Biblioteca Eugenio Trías', 'Paseo Fernán Núñez, 24 (El Retiro)', 'Madrid', 40.4125, -3.6802, 0,
   null),

  ('Taller de cocina: mini chefs',
   'Los niños preparan (y se comen) su propia pizza y galletas decoradas. Delantal incluido.',
   'taller', 5, 11,
   now() + interval '10 days' + interval '11 hours',
   'Mercado de San Fernando', 'C. de Embajadores, 41', 'Madrid', 40.4073, -3.7022, 15,
   null),

  ('Planetario: viaje a las estrellas',
   'Proyección familiar sobre el sistema solar seguida de observación con telescopios si el cielo lo permite.',
   'museo', 5, 12,
   now() + interval '12 days' + interval '18 hours',
   'Planetario de Madrid', 'Av. del Planetario, 16', 'Madrid', 40.3912, -3.6845, 3.65,
   'https://www.planetmad.es'),

  ('Fiesta de burbujas gigantes',
   'Espectáculo participativo de pompas de jabón gigantes en el parque. Gratuito y sin inscripción.',
   'otros', 0, 12,
   now() + interval '13 days' + interval '12 hours',
   'Parque de Berlín', 'Av. de Ramón y Cajal, s/n', 'Madrid', 40.4569, -3.6742, 0,
   null),

  ('Carrera infantil solidaria',
   'Carrera de 500 m y 1 km por edades. Dorsal, medalla y avituallamiento incluidos. Inscripción benéfica.',
   'deporte', 3, 12,
   now() + interval '15 days' + interval '10 hours',
   'Madrid Río', 'Puente de Arganzuela', 'Madrid', 40.3972, -3.7187, 5,
   null);
