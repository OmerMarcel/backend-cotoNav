-- Migration SQL : Remplacement des services culturels et récréatifs par les nouvelles infrastructures
-- Date : 2026-09-05T12:28:40.081Z

-- 1. Suppression des anciens services culturels et récréatifs
DELETE FROM public.infrastructures 
WHERE type IN ('musee', 'theatre', 'cinema', 'parc', 'salle_de_sport');

-- 2. Insertion des nouvelles infrastructures
INSERT INTO public.infrastructures (
  nom, type, description, localisation, photos, horaires, equipements, accessibilite, contact, etat, niveau_frequentation, valide
) VALUES
  (
    'Stade de l''Amitié Général Mathieu Kérékou',
    'salle_de_sport',
    'Construit en 1982, financé entièrement par la République populaire de Chine ; renommé le 10 décembre 2015 en hommage à l''ex-président Mathieu Kérékou (annoncé par le président Yayi Boni lors des funérailles de Kérékou). Capacité de 20 000 à 35 000 places selon les rénovations successives. Usage : matchs de l''équipe nationale les Guépards du Bénin, championnats béninois de football, finale de la Coupe de la Confédération CAF 2021 (Raja Casablanca–JS Kabylie). Accès à proximité : arrêt de bus Confort Lines (8 min à pied), gare routière (11 min à pied).',
    '{"type":"Point","coordinates":[2.3793,6.386],"latitude":6.386,"longitude":2.3793,"adresse":"BP 071 424, Rue 2863, quartier Stade de l''Amitié, Cotonou","quartier":"Kouhounou","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"06:00-22:00","mardi":"06:00-22:00","mercredi":"06:00-22:00","jeudi":"06:00-22:00","vendredi":"06:00-22:00","samedi":"06:00-22:00","dimanche":"06:00-22:00"}'::jsonb,
    '["Terrain de football officiel","Piste d''athlétisme","Tribunes (20 000 à 35 000 places)","Vestiaires sportifs","Éclairage nocturne","Arrêt bus Confort Lines (8 min)","Gare routière (11 min)","Parking"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'bon',
    'eleve',
    true
  ),
  (
    'Palais des Congrès de Cotonou',
    'theatre',
    'Inauguré en août 2003 dans le cadre de la coopération Chine–Bénin (réhabilitation estimée à 15 milliards FCFA, financée à 80% par la Chine). Superficie de 10 053 m², 13 salles sur 2 étages. Capacité : 800 places au rez-de-chaussée + 400 à l''étage, une salle de conférence de 300 places, une salle polyvalente de 300 places, 2 salles de réunion de 50 places, 2 salles de 30 places. Architecture inspirée des cases tata somba (architecture traditionnelle de l''ethnie Somba du nord Bénin). Usage : conférences, colloques, séminaires, expositions culturelles et artistiques, investitures présidentielles.',
    '{"type":"Point","coordinates":[2.404815,6.349199],"latitude":6.349199,"longitude":2.404815,"adresse":"Quartier Gbèdégbé, Cotonou","quartier":"Gbèdégbé","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"08:00-19:00","mardi":"08:00-19:00","mercredi":"08:00-19:00","jeudi":"08:00-19:00","vendredi":"08:00-19:00","samedi":"08:00-14:00","dimanche":"Fermé"}'::jsonb,
    '["13 salles sur 2 étages","Grande salle plénière (1 200 places)","Salle de conférence (300 places)","Salle polyvalente (300 places)","2 salles de réunion (50 places)","2 salles (30 places)","Climatisation intégrale","Régie audiovisuelle moderne","Vaste parking gardé"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"telephone":"+229 21 30 91 10","mobile":"+229 21 30 91 29","website":null}'::jsonb,
    'excellent',
    'eleve',
    true
  ),
  (
    'Cathédrale Notre-Dame-de-Miséricorde de Cotonou',
    'eglise',
    'Origines en 1901 (création de la paroisse), bénédiction solennelle le 8 décembre 1938 ; siège de l''archidiocèse métropolitain de Cotonou créé le 14 septembre 1955. Archevêque actuel : Mgr Roger Houngbédji. Architecture : plan basilical à triple vaisseau, célèbre pour ses murs extérieurs carrelés à rayures alternées bordeaux et blanches.',
    '{"type":"Point","coordinates":[2.440073,6.357282],"latitude":6.357282,"longitude":2.440073,"adresse":"01 BP 32, Près du pont Ancien Pont, quartier Ganhi, Cotonou","quartier":"Ganhi","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1548625361-195973b4001c?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"06:00-19:00","mardi":"06:00-19:00","mercredi":"06:00-19:00","jeudi":"06:00-19:00","vendredi":"06:00-19:00","samedi":"06:00-19:00","dimanche":"06:00-20:00"}'::jsonb,
    '["Nef basilicale à triple vaisseau","Murs carrelés bordeaux et blancs emblématiques","Presbytère paroissial","Offices et messes quotidiennes","Accès PMR"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"telephone":"+229 21 31 18 08","mobile":"+229 21 31 29 90","website":"https://archidiocesedecotonou.org/cathedrale-ndm/"}'::jsonb,
    'excellent',
    'eleve',
    true
  ),
  (
    'Grande Mosquée centrale de Cotonou',
    'mosquee',
    'Édifice le plus important pour les musulmans du Bénin, reconnaissable à ses imposantes tours blanches jumelles (une caractéristique rare et remarquable en Afrique de l''Ouest). Lieu emblématique de prière quotidienne, de rassemblement du vendredi et des grandes célébrations islamiques.',
    '{"type":"Point","coordinates":[2.397802,6.361846],"latitude":6.361846,"longitude":2.397802,"adresse":"Centre-ville, Cotonou","quartier":"Centre-ville","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"04:30-22:00","mardi":"04:30-22:00","mercredi":"04:30-22:00","jeudi":"04:30-22:00","vendredi":"04:30-22:00","samedi":"04:30-22:00","dimanche":"04:30-22:00"}'::jsonb,
    '["Grande salle de prière","Tours blanches jumelles","Espace d''ablutions aménagé","Esplanade pour grandes prières","Accès PMR"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'bon',
    'eleve',
    true
  ),
  (
    'Monument de l''Amazone',
    'musee',
    'Structure métallique à enveloppe de bronze d''un poids estimé à 150 tonnes et 30 mètres de hauteur, représentant une redoutable guerrière armée d''un fusil et d''une épée en hommage aux illustres Agodjiés (les Amazones du royaume du Danhomé). Inaugurée le 30 juillet 2022 sous l''impulsion du président Patrice Talon. Située sur l''esplanade du Boulevard de la Marina, face à la Place de l''Indépendance et au Palais présidentiel, 12e arrondissement de Cotonou. Accès libre, en extérieur, gratuit 24/7.',
    '{"type":"Point","coordinates":[2.4075,6.3489],"latitude":6.3489,"longitude":2.4075,"adresse":"Boulevard de la Marina, face à la Place de l''Indépendance, 12e arrondissement, Cotonou","quartier":"Marina","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"24h/24","mardi":"24h/24","mercredi":"24h/24","jeudi":"24h/24","vendredi":"24h/24","samedi":"24h/24","dimanche":"24h/24"}'::jsonb,
    '["Statue monumentale en bronze de 30m","Esplanade piétonne aménagée","Éclairage architectural nocturne","Espaces paysagers","Accès libre et gratuit 24/7"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'excellent',
    'eleve',
    true
  ),
  (
    'Monument de Bio Guéra',
    'musee',
    'Statue équestre majestueuse de 10 mètres de haut en acier, fonte et cuivre, représentant Bio Guéra (né en 1856, figure héroïque de la résistance face aux troupes coloniales françaises) à cheval en tenue de combat. Inaugurée le 30 juillet 2022 dans le même ensemble patrimonial que l''Amazone et l''Obélisque aux Dévoués. Située au rond-point de l''aéroport international de Cotonou Cadjèhoun. Accès libre, gratuit en extérieur.',
    '{"type":"Point","coordinates":[2.387489,6.350141],"latitude":6.350141,"longitude":2.387489,"adresse":"Rond-point de l''Aéroport International de Cotonou Cadjèhoun, Cotonou","quartier":"Cadjèhoun","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"24h/24","mardi":"24h/24","mercredi":"24h/24","jeudi":"24h/24","vendredi":"24h/24","samedi":"24h/24","dimanche":"24h/24"}'::jsonb,
    '["Statue équestre monumentale (10m)","Rond-point paysager de prestige","Éclairage nocturne","Point de repère touristique majeur","Accès libre 24/7"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'excellent',
    'eleve',
    true
  ),
  (
    'Canal Olympia Wologuèdè',
    'cinema',
    'Complexe cinématographique et culturel moderne du réseau CanalOlympia (groupe Vivendi, présent dans 12 pays africains). Ouvert le 8 décembre 2017 à l''emplacement historique de l''ancien cinéma Okpè Oluwa (Sainte Rita), juste à côté de la Mairie de Cotonou. Superficie de 1,5 hectare, capacité intérieure de 300 places climatisées et plusieurs milliers en extérieur. Écran géant de 14 m x 6 m, sonorisation de pointe Dolby 7.1. Direction locale : Floriane Deguenon. Location possible pour concerts et événements.',
    '{"type":"Point","coordinates":[2.425,6.365],"latitude":6.365,"longitude":2.425,"adresse":"Quartier Wologuèdè, à côté de la Mairie de Cotonou, Cotonou","quartier":"Wologuèdè","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"mardi":"14:00-23:00","mercredi":"14:00-23:00","jeudi":"14:00-23:00","vendredi":"14:00-23:30","samedi":"10:00-23:30","dimanche":"10:00-23:00","lundi":"Fermé"}'::jsonb,
    '["Écran cinéma géant 14m x 6m","Son Dolby Digital 7.1","Salle intérieure climatisée de 300 places","Scène extérieure grand public","Alimentation autonome par énergie solaire","Parking surveillé"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"telephone":null,"website":"https://icicine.com/cinema/benin/canalolympia-wologuede"}'::jsonb,
    'excellent',
    'eleve',
    true
  ),
  (
    'Plage de Fidjrossè',
    'parc',
    'Célèbre plage de sable fin bordée de cocotiers à l''ouest de Cotonou le long de la Route des Pêches. Espace de loisirs et de détente en plein air avec filets de volley-ball, terrains de football improvisés, restaurants et maquis typiques servant poissons et grillades locales. Accueille régulièrement le grand festival ''Yellow Summer'' de MTN Bénin et le village des vacances. Baignade possible mais prudence recommandée en raison des courants marins variables. Accès libre et gratuit en permanence.',
    '{"type":"Point","coordinates":[2.36,6.35],"latitude":6.35,"longitude":2.36,"adresse":"Route des Pêches, quartier Fidjrossè, Cotonou","quartier":"Fidjrossè","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"24h/24","mardi":"24h/24","mercredi":"24h/24","jeudi":"24h/24","vendredi":"24h/24","samedi":"24h/24","dimanche":"24h/24"}'::jsonb,
    '["Vaste plage de sable fin","Filets de beach-volley","Terrains de beach-soccer","Restaurants et maquis de poisson braisé","Promenade piétonne et cyclable","Accès libre 24/7"]'::jsonb,
    '{"pmr":false,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'bon',
    'eleve',
    true
  ),
  (
    'Tour BCEAO',
    'banque',
    'Siège de l''Agence Principale de la Banque Centrale des États de l''Afrique de l''Ouest (BCEAO) pour la République du Bénin. Édifice de référence architecturale et repère visuel majeur du centre-ville et du quartier des affaires de Ganhi.',
    '{"type":"Point","coordinates":[2.4265,6.3535],"latitude":6.3535,"longitude":2.4265,"adresse":"Avenue Jean-Paul II, quartier Ganhi, Cotonou","quartier":"Ganhi","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"08:00-16:00","mardi":"08:00-16:00","mercredi":"08:00-16:00","jeudi":"08:00-16:00","vendredi":"08:00-16:00","samedi":"Fermé","dimanche":"Fermé"}'::jsonb,
    '["Immeuble tour emblématique","Services bancaires et monétaires centraux","Repère urbain central","Sécurité institutionnelle","Accès PMR"]'::jsonb,
    '{"pmr":true,"enfants":false}'::jsonb,
    '{"telephone":"+229 21 31 24 66","website":"https://www.bceao.int"}'::jsonb,
    'excellent',
    'moyen',
    true
  ),
  (
    'Stade René Pleven d''Akpakpa',
    'salle_de_sport',
    'Stade municipal de référence d''une capacité de 15 000 places, situé dans le quartier populaire d''Akpakpa. Stade résident du club historique Requins de l''Atlantique FC. Accueille les matchs du championnat national de football, les compétitions sportives inter-scolaires et les entraînements de la jeunesse béninoise.',
    '{"type":"Point","coordinates":[2.4489,6.3664],"latitude":6.3664,"longitude":2.4489,"adresse":"Quartier Akpakpa, Cotonou","quartier":"Akpakpa","commune":"Cotonou"}'::jsonb,
    '["https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"lundi":"07:00-19:00","mardi":"07:00-19:00","mercredi":"07:00-19:00","jeudi":"07:00-19:00","vendredi":"07:00-19:00","samedi":"07:00-19:00","dimanche":"07:00-19:00"}'::jsonb,
    '["Terrain de football réglementaire","Gradins (15 000 places)","Vestiaires sportifs","Éclairage de match","Piste d''entraînement"]'::jsonb,
    '{"pmr":true,"enfants":true}'::jsonb,
    '{"website":null,"telephone":null}'::jsonb,
    'bon',
    'eleve',
    true
  );
