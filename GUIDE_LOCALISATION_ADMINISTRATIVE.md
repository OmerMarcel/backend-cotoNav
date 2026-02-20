# 🌍 Guide d'Implémentation - Localisation Administrative

## 📖 Vue d'ensemble

Ce système permet de **géolocaliser automatiquement chaque contribution** (arrondissement, commune, département, préfecture) et de générer des **statistiques détaillées** pour le dashboard.

Quand un utilisateur fait une contribution depuis l'application mobile, le système :

1. Récupère sa position GPS (latitude/longitude)
2. Détermine l'arrondissement, commune et département automatiquement
3. Enregistre ces informations
4. Les statistiques du dashboard sont mises à jour en temps réel

---

## 🚀 Installation et Configuration

### 1️⃣ Créer les tables PostgreSQL

Exécutez le script SQL sur votre base Supabase :

```sql
-- Voir le fichier: server/database/migrations/001_create_administrative_tables.sql
```

**Tables créées :**

- `departements` - Départements du Bénin
- `communes` - Communes avec références aux départements
- `arrondissements` - Arrondissements avec références aux communes
- `mairies` - Mairies (hôtels de ville) avec références aux communes
- `prefectures` - Préfectures avec références aux départements
- `contributions_localisation_admin` - Liaison entre contributions et localisation administrative

**Fonctions PostgreSQL :**

- `get_administrative_location(latitude, longitude)` - Trouve tous les infos administratives
- `find_nearest_arrondissement(lat, lon)` - Trouve l'arrondissement le plus proche
- `find_nearest_mairie(lat, lon)` - Trouve la mairie la plus proche

---

### 2️⃣ Importer les données administratives

Placez vos fichiers JSON dans le dossier `Downloads` :

- `positions_administratives.json` - Arrondissements, mairies, préfectures
- `departements_benin.json` - Départements et communes

Exécutez l'import :

```bash
cd c:\Users\HP\OneDrive\Desktop\local\localisation_dash\server
npm run import-administrative-data
```

**Exemple de sortie :**

```
🚀 Début de l'importation des données administratives...

📍 IMPORT DES DÉPARTEMENTS
📊 12 départements trouvés

✅ Département: Alibori
✅ Département: Atacora
...
```

---

## 🏗️ Architecture Technique

### 🔄 Flux de données

```
Application Mobile (Flutter)
    ↓
    Contribution avec GPS (lat/lon)
    ↓
Backend Node.js/Express
    ↓
administrativeLocationService.recordContributionLocation()
    ↓
get_administrative_location() [Fonction PostgreSQL]
    ↓
Insertion dans contributions_localisation_admin
    ↓
Dashboard - Statistiques mises à jour en temps réel
```

### 🗂️ Fichiers clés

| Fichier                                                                                              | Description                               |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [server/services/administrativeLocationService.js](server/services/administrativeLocationService.js) | Service de géolocalisation administrative |
| [server/routes/propositions.js](server/routes/propositions.js)                                       | Route de création des contributions       |
| [server/routes/statistics.js](server/routes/statistics.js)                                           | Endpoints des statistiques                |
| [server/scripts/importAdministrativeData.js](server/scripts/importAdministrativeData.js)             | Script d'import                           |

---

## 🛠️ Services disponibles

### `AdministrativeLocationService`

#### `getAdministrativeLocation(latitude, longitude)`

Retourne la localisation administrative d'une position GPS.

```javascript
const location = await administrativeLocationService.getAdministrativeLocation(
  6.5,
  2.6,
);
// Résultat:
// {
//   arrondissement_id: 1,
//   arrondissement_nom: "Arrondissement 1",
//   commune_id: 5,
//   commune_nom: "Cotonou",
//   departement_id: 8,
//   departement_nom: "Littoral",
//   prefecture_id: 1,
//   prefecture_nom: "Cotonou",
//   distance_arrondissement: 245.5, // en mètres
//   found: true
// }
```

#### `recordContributionLocation(contribution_id, latitude, longitude)`

Enregistre la localisation d'une contribution dans la BD.

```javascript
const result = await administrativeLocationService.recordContributionLocation(
  123, // ID de la contribution
  6.5,
  2.6,
);
```

#### `getStatisticsByArrondissement()`

Retourne le nombre de contributions par arrondissement.

```javascript
const stats =
  await administrativeLocationService.getStatisticsByArrondissement();
// [
//   {
//     arrondissement_id: 1,
//     arrondissement_nom: "Arrondissement 1",
//     commune_nom: "Cotonou",
//     departement_nom: "Littoral",
//     count: 15
//   },
//   ...
// ]
```

#### `getStatisticsByCommune()`

Statistiques par commune.

```javascript
const stats = await administrativeLocationService.getStatisticsByCommune();
```

#### `getStatisticsByDepartement()`

Statistiques par département.

```javascript
const stats = await administrativeLocationService.getStatisticsByDepartement();
```

---

## 📊 Endpoints API

### 1. Créer une contribution (avec localisation auto)

**POST** `/api/propositions`

```javascript
{
  "name": "Toilettes publiques",
  "category": "toilettes_publiques",
  "description": "Toilettes publiques...",
  "latitude": 6.5,
  "longitude": 2.6,
  "address": "Rue de la Paix, Cotonou",
  "images": ["url1", "url2"],
  "phone": "+229 ....",
  "website": "..."
}
```

**Réponse :**

```javascript
{
  "data": {
    "id": 123,
    "nom": "Toilettes publiques",
    ...
  },
  "message": "Proposition créée avec succès."
}
```

La localisation administrative est **automatiquement enregistrée** ! ✅

---

### 2. Obtenir les statistiques par arrondissement

**GET** `/api/statistics/contributions/arrondissements`

Authentification requise : `Authorization: Bearer <token>`

**Réponse :**

```javascript
{
  "data": [
    {
      "arrondissement_id": 1,
      "arrondissement_nom": "Arrondissement 1",
      "commune_nom": "Cotonou",
      "departement_nom": "Littoral",
      "count": 15
    },
    ...
  ],
  "total": 245
}
```

---

### 3. Obtenir les statistiques par commune

**GET** `/api/statistics/contributions/communes`

---

### 4. Obtenir les statistiques par département

**GET** `/api/statistics/contributions/departements`

---

## 📱 Intégration côté Mobile (Flutter)

Aucune modification nécessaire ! Le service mobile envoie déjà `latitude` et `longitude`.

Exemple dans `contribution_service.dart` :

```dart
final contribution = await service.createProposition(
  userId: userId,
  name: "Toilettes",
  category: "toilettes_publiques",
  latitude: 6.5,      // ✅ Géolocalisation
  longitude: 2.6,     // ✅ Géolocalisation
  address: "...",
  imageFiles: images,
);
```

Le backend fera automatiquement la localisation administrative ! 🎯

---

## 📈 Dashboard - Afficher les statistiques

### Graphique par arrondissement

```javascript
// En React.js / Next.js
const [stats, setStats] = useState([]);

useEffect(() => {
  const fetchStats = async () => {
    const response = await fetch(
      "http://localhost:5000/api/statistics/contributions/arrondissements",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    setStats(data.data);
  };

  fetchStats();
}, []);

// Afficher dans un graphique
<BarChart data={stats} dataKey="count" />;
```

---

## 🔍 Exemple complet d'utilisation

### Scénario : Un utilisateur fait une contribution

1. **Mobile** : Utilisateur appuie sur "Contribuer" à Cotonou
2. **Mobile** : Position GPS capturée : `lat=6.5, lon=2.6`
3. **Mobile** : Données envoyées au serveur
4. **Backend** :
   - Crée la contribution
   - Appelle `administrativeLocationService.recordContributionLocation()`
   - La fonction PostgreSQL `get_administrative_location()` détermine :
     - ✅ Arrondissement 1
     - ✅ Commune: Cotonou
     - ✅ Département: Littoral
     - ✅ Préfecture: Cotonou
   - Enregistre dans `contributions_localisation_admin`
5. **Dashboard** :
   - Affiche "1 nouvelle contribution à Arrondissement 1"
   - Graphique mis à jour en temps réel
   - Statistiques par commune/département calculées

---

## 🐛 Dépannage

### Erreur : "Commande npm introuvable"

Vérifiez que vous êtes dans le bon répertoire :

```bash
cd c:\Users\HP\OneDrive\Desktop\local\localisation_dash\server
npm run import-administrative-data
```

### Erreur : "Fichier JSON introuvable"

Assurez-vous que les fichiers sont dans `C:\Users\HP\Downloads\` :

- `positions_administratives.json`
- `departements_benin.json`

### Erreur : "Fonction PostgreSQL non trouvée"

Exécutez le script de migration SQL depuis Supabase Dashboard :

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. SQL Editor → New query
4. Copiez le contenu du fichier [server/database/migrations/001_create_administrative_tables.sql](server/database/migrations/001_create_administrative_tables.sql)
5. Exécutez

---

## 📝 Prochaines étapes

- [ ] Ajouter les statistiques aux graphes du dashboard
- [ ] Afficher une carte heatmap par arrondissement
- [ ] Exporter les statistiques en PDF/Excel
- [ ] Notifications temps réel pour nouvelles contributions
- [ ] Analyse temporelle (contributions par jour/semaine)

---

## 🎯 Résumé

✅ **Système complet de géolocalisation administrative**

- Données centralisées dans PostgreSQL
- Auto-détection arrondissement/commune/département
- Statistiques en temps réel pour le dashboard
- API RESTful pour accéder aux données
- Prêt pour les graphes et analyses

Votre système de contribution est maintenant **intégré géographiquement** ! 🗺️
