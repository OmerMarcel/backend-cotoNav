# 🚀 Installation Complète - Système de Localisation Administrative

## ✅ Étapes à suivre

### ÉTAPE 1 : Créer les tables dans PostgreSQL

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor**
4. Cliquez sur **New query**
5. Copiez-collez le contenu de ce fichier :
   ```
   server/database/migrations/001_create_administrative_tables.sql
   ```
6. Exécutez la requête ✅

---

### ÉTAPE 2 : Préparer les fichiers de données

Téléchargez os deux fichiers JSON fournis et mettez-les dans le dossier :

```
C:\Users\HP\Downloads\
```

**Fichiers nécessaires :**

- ✅ `positions_administratives.json` - Arrondissements, mairies, préfectures
- ✅ `departements_benin.json` - Départements et communes

---

### ÉTAPE 3 : Exécuter l'import

Ouvrez PowerShell et exécutez :

```powershell
cd c:\Users\HP\OneDrive\Desktop\local\localisation_dash\server
npm run import-administrative-data
```

**Attendez la confirmation :**

```
🎉 TOUTES LES DONNÉES ADMINISTRATIVES ONT ÉTÉ IMPORTÉES AVEC SUCCÈS !
```

---

### ÉTAPE 4 : Démarrer le serveur backend

```powershell
npm run dev
```

Le serveur démarre sur `http://localhost:5000` ✅

---

### ÉTAPE 5 : Tester l'API

Créez une contribution avec GPS pour vérifier que la localisation est enregistrée :

```bash
curl -X POST http://localhost:5000/api/propositions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toilettes publiques",
    "category": "toilettes_publiques",
    "description": "Test",
    "latitude": 6.5,
    "longitude": 2.6,
    "address": "Cotonou"
  }'
```

**Vérifiez les logs du serveur :**

```
✅ Localisation administrative enregistrée:
  arrondissement: Arrondissement 1
  commune: Cotonou
  departement: Littoral
```

---

## 🧪 Test complet du système

### Voir les statistiques par arrondissement

```bash
curl -X GET http://localhost:5000/api/statistics/contributions/arrondissements \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue :**

```json
{
  "data": [
    {
      "arrondissement_id": 1,
      "arrondissement_nom": "Arrondissement 1",
      "commune_nom": "Cotonou",
      "departement_nom": "Littoral",
      "count": 1
    }
  ],
  "total": 1
}
```

---

## 🗺️ Structure de la base de données

```
PostgreSQL (Supabase)
├── departements (12 entrées)
├── communes (77 entrées)
├── arrondissements (~300+ entrées)
├── mairies (~77 entrées)
├── prefectures (12 entrées)
└── contributions_localisation_admin (liaison avec contributions)
```

---

## 📊 Vue d'ensemble du système

```
Application Mobile (Flutter)
    ↓ Contribution avec GPS
    ↓
Backend Node.js
    ↓
administrativeLocationService.recordContributionLocation()
    ↓
PostgreSQL RPC: get_administrative_location()
    ↓
Insertion dans contributions_localisation_admin
    ↓
Dashboard - Statistiques en temps réel
```

---

## 🛠️ Services et endpoints disponibles

| Service                         | Fonction                     | Endpoint                                            |
| ------------------------------- | ---------------------------- | --------------------------------------------------- |
| `administrativeLocationService` | Trouver localisation         | POST `/api/propositions`                            |
|                                 | Statistiques arrondissements | GET `/api/statistics/contributions/arrondissements` |
|                                 | Statistiques communes        | GET `/api/statistics/contributions/communes`        |
|                                 | Statistiques départements    | GET `/api/statistics/contributions/departements`    |

---

## 🐛 Troubleshooting

### ❌ Erreur : "Fichier introuvable"

```
⚠️ Fichier introuvable: C:\Users\HP\Downloads\positions_administratives.json
```

**Solution :**

- Placez les fichiers JSON dans `C:\Users\HP\Downloads\`
- Assurez-vous que les noms sont exacts

### ❌ Erreur : "Fonction PostgreSQL non trouvée"

```
Error: function get_administrative_location does not exist
```

**Solution :**

- Exécutez le script de migration SQL dans Supabase
- Vérifiez que toutes les requêtes SQL se sont exécutées sans erreur

### ❌ Erreur : "Connexion Supabase échouée"

```
Error: Connection refused
```

**Solution :**

- Vérifiez vos variables d'environnement `.env`
- Assurez-vous que Supabase est accessible

---

## 📝 Fichiers créés/modifiés

| Fichier                                                           | Type | Description                |
| ----------------------------------------------------------------- | ---- | -------------------------- |
| `server/database/migrations/001_create_administrative_tables.sql` | 🆕   | Migration PostgreSQL       |
| `server/services/administrativeLocationService.js`                | 🆕   | Service de géolocalisation |
| `server/scripts/importAdministrativeData.js`                      | 🆕   | Script d'import            |
| `server/routes/propositions.js`                                   | ✏️   | Intégration service        |
| `server/routes/statistics.js`                                     | ✏️   | Nouveaux endpoints stats   |
| `server/package.json`                                             | ✏️   | Nouveau script npm         |
| `GUIDE_LOCALISATION_ADMINISTRATIVE.md`                            | 🆕   | Guide complet              |

---

## 🎯 Résumé

✅ **Tables PostgreSQL créées avec fonctions géospatiaux**
✅ **Données administratives importées**
✅ **Service de géolocalisation intégré**
✅ **Endpoints statistiques disponibles**
✅ **Dashboard prêt pour afficher les graphes**

Vous pouvez maintenant :

- 📱 Recevoir des contributions géolocalisées
- 📊 Générer des statistiques par arrondissement/commune/département
- 📈 Afficher des graphes dans le dashboard
- 🗺️ Analyser la répartition géographique

**🎉 Système prêt à l'emploi !**
