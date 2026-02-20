-- Import de 20 églises supplémentaires pour Cotonou
-- Type: eglise (après mise à jour de la contrainte CHECK)
-- Exécuter APRÈS l'ALTER TABLE infrastructures_type_check

INSERT INTO public.infrastructures
  (id, nom, type, description, localisation, photos, horaires, equipements, accessibilite, contact, etat, note_moyenne, nombre_avis, niveau_frequentation, cree_par, valide, valide_par, valide_le, created_at, updated_at)
VALUES
  (gen_random_uuid(),
  'Cathedrale Notre-Dame de Misericorde',
  'eglise',
  'Cathedrale catholique principale de Cotonou.',
  '{"type":"Point","adresse":"Place Bulgarie, Cotonou","commune":"Cotonou","quartier":"Ganhi","coordinates":[2.4286,6.3653]}',
  '[]',
  '{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]',
  '{"pmr":true,"enfants":true}',
  '{"telephone":null}',
  'bon',4.5,120,'eleve',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Paroisse Saint Michel',
  'eglise',
  'Eglise catholique historique du quartier Saint Michel.',
  '{"type":"Point","adresse":"Saint Michel, Cotonou","commune":"Cotonou","quartier":"Saint Michel","coordinates":[2.4219,6.3721]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":true,"enfants":true}','{}',
  'bon',4.3,60,'eleve',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Paroisse Bon Pasteur Cadjehoun',
  'eglise',
  'Eglise catholique situee a Cadjehoun.',
  '{"type":"Point","adresse":"Cadjehoun, Cotonou","commune":"Cotonou","quartier":"Cadjehoun","coordinates":[2.4014,6.3577]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":true,"enfants":true}','{}',
  'bon',4.2,40,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Sainte Therese PK6',
  'eglise',
  'Eglise catholique PK6.',
  '{"type":"Point","adresse":"PK6, Cotonou","commune":"Cotonou","quartier":"PK6","coordinates":[2.3908,6.3803]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":false,"enfants":true}','{}',
  'bon',4.1,22,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Saint Jean Bosco Kouhounou',
  'eglise',
  'Eglise catholique du quartier Kouhounou.',
  '{"type":"Point","adresse":"Kouhounou, Cotonou","commune":"Cotonou","quartier":"Kouhounou","coordinates":[2.4102,6.3862]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":false,"enfants":true}','{}',
  'bon',4.0,18,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Marie Auxiliatrice Menontin',
  'eglise',
  'Eglise catholique du quartier Menontin.',
  '{"type":"Point","adresse":"Menontin, Cotonou","commune":"Cotonou","quartier":"Menontin","coordinates":[2.3763,6.3815]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":false,"enfants":true}','{}',
  'bon',4.2,30,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Saint Francois d Assise',
  'eglise',
  'Eglise catholique locale.',
  '{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Akpakpa","coordinates":[2.4501,6.3589]}',
  '[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":false,"enfants":true}','{}',
  'bon',4.1,15,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Assemblees de Dieu Jericho',
  'eglise',
  'Eglise evangelique Jericho.',
  '{"type":"Point","adresse":"Jericho, Cotonou","commune":"Cotonou","quartier":"Jericho","coordinates":[2.4094,6.3744]}',
  '[]','{"dimanche":{"debut":"07:00","fin":"19:00","ouvert":true}}',
  '[]','{"pmr":true,"enfants":true}','{}',
  'bon',4.4,55,'eleve',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Impact Centre Chretien Cotonou',
  'eglise',
  'Grande eglise evangelique ICC.',
  '{"type":"Point","adresse":"Haie Vive, Cotonou","commune":"Cotonou","quartier":"Haie Vive","coordinates":[2.3859,6.3564]}',
  '[]','{"dimanche":{"debut":"08:00","fin":"20:00","ouvert":true}}',
  '[]','{"pmr":true,"enfants":true}','{}',
  'bon',4.6,200,'eleve',null,true,null,now(),now(),now()),

  (gen_random_uuid(),
  'Winners Chapel Cotonou',
  'eglise',
  'Eglise internationale Winners Chapel.',
  '{"type":"Point","adresse":"Zogbo, Cotonou","commune":"Cotonou","quartier":"Zogbo","coordinates":[2.3976,6.3897]}',
  '[]','{"dimanche":{"debut":"07:00","fin":"19:00","ouvert":true}}',
  '[]','{"pmr":true,"enfants":true}','{}',
  'bon',4.5,90,'eleve',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Saint Joseph Dekoungbe','eglise','Eglise catholique locale.','{"type":"Point","adresse":"Dekoungbe","commune":"Cotonou","quartier":"Dekoungbe","coordinates":[2.3668,6.3920]}','[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.0,12,'faible',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Paroisse Sainte Cecile','eglise','Eglise catholique.','{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Agla","coordinates":[2.3725,6.3739]}','[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.0,10,'faible',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Mission Source de Vie','eglise','Eglise protestante.','{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Fidjrosse","coordinates":[2.3508,6.3542]}','[]','{"dimanche":{"debut":"08:00","fin":"19:00","ouvert":true}}','[]','{"pmr":true,"enfants":true}','{}','bon',4.3,25,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'City Church Cotonou','eglise','Eglise evangelique moderne.','{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Haie Vive","coordinates":[2.3843,6.3582]}','[]','{"dimanche":{"debut":"09:00","fin":"19:00","ouvert":true}}','[]','{"pmr":true,"enfants":true}','{}','bon',4.4,33,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Saint Antoine Zogbo','eglise','Eglise catholique Zogbo.','{"type":"Point","adresse":"Zogbo","commune":"Cotonou","quartier":"Zogbo","coordinates":[2.3951,6.3883]}','[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.1,14,'faible',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Eglise Protestante Methodiste','eglise','Eglise methodiste.','{"type":"Point","adresse":"Cotonou centre","commune":"Cotonou","quartier":"Centre","coordinates":[2.4234,6.3691]}','[]','{"dimanche":{"debut":"07:00","fin":"19:00","ouvert":true}}','[]','{"pmr":true,"enfants":true}','{}','bon',4.2,21,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Temple Salem','eglise','Temple evangelique.','{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Vossa","coordinates":[2.4011,6.3777]}','[]','{"dimanche":{"debut":"07:00","fin":"19:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.0,9,'faible',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Paroisse Notre Dame Fidjrosse','eglise','Eglise catholique Fidjrosse.','{"type":"Point","adresse":"Fidjrosse","commune":"Cotonou","quartier":"Fidjrosse","coordinates":[2.3487,6.3601]}','[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.1,16,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Eglise Vie Abondante','eglise','Eglise pentecotiste.','{"type":"Point","adresse":"Cotonou","commune":"Cotonou","quartier":"Agontikon","coordinates":[2.3897,6.3704]}','[]','{"dimanche":{"debut":"08:00","fin":"19:00","ouvert":true}}','[]','{"pmr":true,"enfants":true}','{}','bon',4.3,19,'moyen',null,true,null,now(),now(),now()),

  (gen_random_uuid(),'Paroisse Saint Pierre','eglise','Eglise catholique locale.','{"type":"Point","adresse":"Akpakpa","commune":"Cotonou","quartier":"Akpakpa","coordinates":[2.4472,6.3640]}','[]','{"dimanche":{"debut":"06:00","fin":"20:00","ouvert":true}}','[]','{"pmr":false,"enfants":true}','{}','bon',4.0,11,'faible',null,true,null,now(),now(),now());
