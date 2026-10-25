/**
 * SCRIPT DE SYNCHRONISATION COMPLETE DES INFRASTRUCTURES
 * Usage : node scripts/syncAllInfrastructures.js
 */

require("dotenv").config();
const supabase = require("../config/supabase");

const ALL_MOBILE_INFRASTRUCTURES = [
  { nom: "Mairie de Cotonou", type: "autre", description: "Hotel de ville de Cotonou, siege de l'administration municipale.", localisation: { type: "Point", coordinates: [2.4244, 6.3654], adresse: "Avenue Jean-Paul II, Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.5, nombre_avis: 20 },
  { nom: "Prefecture du Littoral", type: "autre", description: "Administration territoriale du departement du Littoral.", localisation: { type: "Point", coordinates: [2.4250, 6.3670], adresse: "Avenue Clozel, Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.0, nombre_avis: 10 },
  { nom: "CNHU-HKM Hopital National", type: "centre_sante", description: "Centre National Hospitalier Universitaire Hubert Koutoukou Maga. Principal hopital de reference du Benin.", localisation: { type: "Point", coordinates: [2.4100, 6.3750], adresse: "01 BP 386, Cotonou", quartier: "Akpakpa", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.8, nombre_avis: 45 },
  { nom: "Hopital de Zone d'Abomey-Calavi", type: "centre_sante", description: "Hopital de zone desservant la commune d'Abomey-Calavi.", localisation: { type: "Point", coordinates: [2.3520, 6.4490], adresse: "Abomey-Calavi", quartier: "Abomey-Calavi Centre", commune: "Abomey-Calavi" }, etat: "moyen", valide: true, note_moyenne: 3.2, nombre_avis: 18 },
  { nom: "Clinique Sainte-Marie Cotonou", type: "centre_sante", description: "Clinique privee offrant des soins medicaux de qualite.", localisation: { type: "Point", coordinates: [2.4180, 6.3600], adresse: "Quartier Cadjehoun, Cotonou", quartier: "Cadjehoun", commune: "Cotonou" }, etat: "excellent", valide: true, note_moyenne: 4.2, nombre_avis: 32 },
  { nom: "Universite d'Abomey-Calavi (UAC)", type: "autre", description: "Principale universite publique du Benin, fondee en 1970. Plus de 80 000 etudiants.", localisation: { type: "Point", coordinates: [2.3435, 6.4124], adresse: "Campus UAC, Abomey-Calavi", quartier: "Abomey-Calavi", commune: "Abomey-Calavi" }, etat: "bon", valide: true, note_moyenne: 3.9, nombre_avis: 85 },
  { nom: "Lycee Technique d'Etat de Cotonou", type: "autre", description: "Etablissement d'enseignement technique et professionnel de reference.", localisation: { type: "Point", coordinates: [2.4200, 6.3700], adresse: "Cotonou", quartier: "Zongo", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.5, nombre_avis: 12 },
  { nom: "Bibliotheque Nationale du Benin", type: "espace_divertissement", description: "Bibliotheque nationale conservant le patrimoine documentaire du Benin.", localisation: { type: "Point", coordinates: [2.4193, 6.3620], adresse: "Avenue Jean-Paul II, Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "moyen", valide: true, note_moyenne: 3.7, nombre_avis: 22 },
  { nom: "Marche Dantokpa", type: "espace_divertissement", description: "Le plus grand marche d'Afrique de l'Ouest. Plus de 20 000 vendeurs.", localisation: { type: "Point", coordinates: [2.4371, 6.3614], adresse: "Bord de lagune, Quartier Dantokpa", quartier: "Dantokpa", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 4.1, nombre_avis: 120 },
  { nom: "Marche Saint Michel", type: "espace_divertissement", description: "Marche de quartier anime dans le centre de Cotonou.", localisation: { type: "Point", coordinates: [2.4190, 6.3580], adresse: "Quartier Saint-Michel, Cotonou", quartier: "Saint-Michel", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.8, nombre_avis: 55 },
  { nom: "Marche de Cadjehoun", type: "espace_divertissement", description: "Marche local du quartier de Cadjehoun.", localisation: { type: "Point", coordinates: [2.4058, 6.3735], adresse: "Quartier Cadjehoun, Cotonou", quartier: "Cadjehoun", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.6, nombre_avis: 30 },
  { nom: "Stade de l'Amitie General Mathieu Kerekou", type: "installation_sportive", description: "Stade national du Benin, construit en 1982. Capacite de 35 000 places. Usage: matchs des Guepards du Benin.", localisation: { type: "Point", coordinates: [2.3793, 6.3860], adresse: "Rue 2863, quartier Stade de l'Amitie, Cotonou", quartier: "Kouhounou", commune: "Cotonou" }, photos: [{ url: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80", uploadedAt: new Date().toISOString() }], equipements: ["Terrain de football", "Piste d'athletisme", "Tribunes 35 000 places", "Eclairage nocturne", "Parking"], accessibilite: { pmr: true, enfants: true }, etat: "bon", niveau_frequentation: "eleve", valide: true, note_moyenne: 4.3, nombre_avis: 65 },
  { nom: "Palais des Congres de Cotonou", type: "espace_divertissement", description: "Inaugure en 2003, cooperation Chine-Benin. 10 053 m2, 13 salles, capacite 1 200 places.", localisation: { type: "Point", coordinates: [2.404815, 6.349199], adresse: "Quartier Gbedegbe, Cotonou", quartier: "Gbedegbe", commune: "Cotonou" }, photos: [{ url: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80", uploadedAt: new Date().toISOString() }], equipements: ["13 salles sur 2 etages", "Grande salle pleniere 1200 places", "Salle conference 300 places", "Climatisation", "Parking"], accessibilite: { pmr: true, enfants: true }, contact: { telephone: "+229 21 30 91 10" }, etat: "excellent", niveau_frequentation: "eleve", valide: true, note_moyenne: 4.5, nombre_avis: 40 },
  { nom: "Cathedrale Notre-Dame-de-Misericorde de Cotonou", type: "espace_divertissement", description: "Origines en 1901, siege de l'archidiocese metropolitain de Cotonou.", localisation: { type: "Point", coordinates: [2.440073, 6.357282], adresse: "Quartier Gbedegbe, Cotonou", quartier: "Gbedegbe", commune: "Cotonou" }, etat: "excellent", valide: true, note_moyenne: 4.6, nombre_avis: 80 },
  { nom: "Grande Mosquee de Cotonou", type: "espace_divertissement", description: "Principal lieu de culte islamique de Cotonou.", localisation: { type: "Point", coordinates: [2.4300, 6.3620], adresse: "Quartier Jonquet, Cotonou", quartier: "Jonquet", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 4.4, nombre_avis: 55 },
  { nom: "Jardin Public de Cotonou", type: "parc_jeux", description: "Espace vert public au coeur de Cotonou, ideal pour la detente.", localisation: { type: "Point", coordinates: [2.4196, 6.3648], adresse: "Boulevard de la Marine, Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "moyen", valide: true, note_moyenne: 3.4, nombre_avis: 28 },
  { nom: "Musee d'Histoire de Ouidah", type: "espace_divertissement", description: "Ancien fort portugais transforme en musee. Retrace l'histoire de la traite negriere au Benin.", localisation: { type: "Point", coordinates: [2.0860, 6.3570], adresse: "Ouidah", quartier: "Centre", commune: "Ouidah" }, etat: "bon", valide: true, note_moyenne: 4.7, nombre_avis: 95 },
  { nom: "Aeroport International de Cotonou Cadjehoun", type: "autre", description: "Principal aeroport international du Benin, recemment renove. Plusieurs destinations africaines et europeennes.", localisation: { type: "Point", coordinates: [2.3846, 6.3574], adresse: "Cadjehoun, Cotonou", quartier: "Cadjehoun", commune: "Cotonou" }, etat: "excellent", valide: true, note_moyenne: 3.9, nombre_avis: 110 },
  { nom: "Gare Routiere de Cotonou OCBN", type: "autre", description: "Principale gare routiere de Cotonou, point de depart pour les voyages interurbains.", localisation: { type: "Point", coordinates: [2.4332, 6.3644], adresse: "Avenue Clozel, Cotonou", quartier: "Jericho", commune: "Cotonou" }, etat: "moyen", valide: true, note_moyenne: 3.1, nombre_avis: 42 },
  { nom: "Commissariat Central de Cotonou", type: "autre", description: "Direction generale de la police nationale, siege de la securite publique.", localisation: { type: "Point", coordinates: [2.4210, 6.3660], adresse: "Avenue Jean-Paul II, Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 2.8, nombre_avis: 15 },
  { nom: "Caserne des Pompiers de Cotonou", type: "autre", description: "Brigade nationale des sapeurs-pompiers de Cotonou.", localisation: { type: "Point", coordinates: [2.4150, 6.3680], adresse: "Cotonou", quartier: "Centre", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.5, nombre_avis: 8 },
  { nom: "Toilettes Publiques Marche Dantokpa", type: "toilettes_publiques", description: "Blocs sanitaires publics a l'entree principale du Marche Dantokpa.", localisation: { type: "Point", coordinates: [2.4360, 6.3610], adresse: "Entree principale, Marche Dantokpa, Cotonou", quartier: "Dantokpa", commune: "Cotonou" }, etat: "moyen", valide: true, note_moyenne: 2.5, nombre_avis: 18 },
  { nom: "Toilettes Publiques Gare Routiere Cotonou", type: "toilettes_publiques", description: "Sanitaires publics de la gare routiere de Cotonou.", localisation: { type: "Point", coordinates: [2.4330, 6.3640], adresse: "Gare Routiere, Avenue Clozel, Cotonou", quartier: "Jericho", commune: "Cotonou" }, etat: "degrade", valide: true, note_moyenne: 1.8, nombre_avis: 12 },
  { nom: "Aire de Jeux de Cadjehoun", type: "parc_jeux", description: "Espace de jeux pour enfants dans le quartier de Cadjehoun.", localisation: { type: "Point", coordinates: [2.4060, 6.3730], adresse: "Quartier Cadjehoun, Cotonou", quartier: "Cadjehoun", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.9, nombre_avis: 20 },
  { nom: "Terrain de Sport de Akpakpa", type: "installation_sportive", description: "Terrain multisport communautaire du quartier Akpakpa.", localisation: { type: "Point", coordinates: [2.4500, 6.3650], adresse: "Quartier Akpakpa, Cotonou", quartier: "Akpakpa", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.7, nombre_avis: 25 },
  { nom: "Terrain de Sport de Fidrosse", type: "installation_sportive", description: "Terrain de football de sable sur la plage de Fidrosse.", localisation: { type: "Point", coordinates: [2.3700, 6.3520], adresse: "Plage de Fidrosse, Cotonou", quartier: "Fidrosse", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 4.1, nombre_avis: 35 },
  { nom: "Centre de Sante de Cadjehoun", type: "centre_sante", description: "Centre de sante de quartier offrant des soins primaires.", localisation: { type: "Point", coordinates: [2.4070, 6.3740], adresse: "Quartier Cadjehoun, Cotonou", quartier: "Cadjehoun", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.6, nombre_avis: 28 },
  { nom: "Centre de Sante de Akpakpa", type: "centre_sante", description: "Centre de sante de quartier desservant Akpakpa.", localisation: { type: "Point", coordinates: [2.4520, 6.3660], adresse: "Quartier Akpakpa, Cotonou", quartier: "Akpakpa", commune: "Cotonou" }, etat: "moyen", valide: true, note_moyenne: 3.3, nombre_avis: 22 },
  { nom: "Centre de Sante de Jonquet", type: "centre_sante", description: "Centre de sante communautaire desservant le quartier Jonquet.", localisation: { type: "Point", coordinates: [2.4290, 6.3615], adresse: "Quartier Jonquet, Cotonou", quartier: "Jonquet", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 3.5, nombre_avis: 15 },
  { nom: "Plage de Fidrosse", type: "espace_divertissement", description: "Plage populaire de Cotonou, lieu de detente et de loisirs.", localisation: { type: "Point", coordinates: [2.3680, 6.3510], adresse: "Fidrosse, Cotonou", quartier: "Fidrosse", commune: "Cotonou" }, etat: "bon", valide: true, note_moyenne: 4.4, nombre_avis: 88 },
];

function normalizeString(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function syncInfrastructures() {
  console.log("\n" + "=".repeat(70));
  console.log("SYNCHRONISATION DES INFRASTRUCTURES MOBILES -> BASE DE DONNEES");
  console.log("=".repeat(70));
  console.log(`${ALL_MOBILE_INFRASTRUCTURES.length} infrastructures a synchroniser\n`);

  const { data: existing, error: fetchError } = await supabase.from("infrastructures").select("id, nom");
  if (fetchError) { console.error("Erreur chargement:", fetchError); process.exit(1); }

  const existingNames = new Set((existing || []).map(i => normalizeString(i.nom)));
  console.log(`${existing?.length || 0} infrastructures deja en base\n`);

  let newCount = 0, skipCount = 0, errorCount = 0;
  const errors = [];

  for (const infra of ALL_MOBILE_INFRASTRUCTURES) {
    const normalizedName = normalizeString(infra.nom);
    if (existingNames.has(normalizedName)) { console.log(`[DEJA PRESENTE] ${infra.nom}`); skipCount++; continue; }

    try {
      const record = {
        nom: infra.nom,
        type: infra.type || "autre",
        description: infra.description || "",
        localisation: infra.localisation,
        photos: infra.photos || [],
        horaires: infra.horaires || {},
        equipements: infra.equipements || [],
        accessibilite: infra.accessibilite || { pmr: false, enfants: false },
        contact: infra.contact || {},
        etat: infra.etat || "bon",
        niveau_frequentation: infra.niveau_frequentation || "moyen",
        note_moyenne: infra.note_moyenne || 0,
        nombre_avis: infra.nombre_avis || 0,
        valide: infra.valide !== undefined ? infra.valide : true,
        cree_par: null, valide_par: null,
        valide_le: infra.valide ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("infrastructures").insert([record]);
      if (insertError) throw insertError;

      newCount++;
      existingNames.add(normalizedName);
      console.log(`[AJOUTEE] ${infra.nom} (${infra.type}, ${infra.localisation.quartier})`);
    } catch (err) {
      errorCount++;
      console.error(`[ERREUR] "${infra.nom}": ${err.message}`);
      errors.push({ nom: infra.nom, error: err.message });
    }
  }

  const { count: finalCount } = await supabase.from("infrastructures").select("id", { count: "exact", head: true });

  console.log("\n" + "=".repeat(70));
  console.log("RAPPORT FINAL");
  console.log("=".repeat(70));
  console.log(`Nouvelles ajoutees : ${newCount}`);
  console.log(`Deja presentes    : ${skipCount}`);
  console.log(`Erreurs           : ${errorCount}`);
  console.log(`Total en base     : ${finalCount}`);
  if (errors.length > 0) { console.log("\nERREURS:"); errors.forEach((e, i) => console.log(`  ${i+1}. ${e.nom}: ${e.error}`)); }
  console.log("\nSynchronisation terminee !\n");
  process.exit(errorCount > 0 ? 1 : 0);
}

syncInfrastructures().catch(err => { console.error("Erreur fatale:", err); process.exit(1); });
