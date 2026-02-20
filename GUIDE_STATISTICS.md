# 📊 Guide Récupération des Statistiques

## ⚠️ Problème Identifié

Les graphiques de statistiques ne s'affichaient pas car :

1. **Authentification requise** : L'API demande un token d'authentification
2. **Données incomplètes** : Les infrastructures n'ont pas les champs `departement` et `arrondissement` dans `localisation`

## ✅ Solutions Appliquées

### 1. Retrait de la restriction `adminOnly`

- ❌ Avant : `router.get("/", auth, adminOnly, ...)`
- ✅ Après : `router.get("/", auth, ...)`
- Tous les utilisateurs connectés peuvent accéder aux statistiques

### 2. Vérification des données

Les infrastructures stockent les données dans `localisation` :

```json
{
  "type": "Point",
  "adresse": "...",
  "commune": "Cotonou",
  "quartier": "...",
  "coordinates": [longitude, latitude]
}
```

⚠️ **Pas de champs** `departement` et `arrondissement`

## 🔧 Prochaines Étapes

### Option A : Enrichir lors de la création

Ajouter automatiquement `departement` et `arrondissement` lors du save d'une infrastructure :

```javascript
// Chercher l'arrondissement via API administrative-location
const adminData = await fetch(
  `/api/administrative-location?latitude=${lat}&longitude=${lon}`,
);
```

### Option B : Enrichir à la lecture (Statistiques)

Faire la requête administrative-location pour chaque infrastructure lors du chargement des statistiques (lent).

### Option C : Ajouter des colonnes directes

Ajouter `arrondissement_id` et `departement_id` directement à la table `infrastructures` pour plus de performance.

## 📝 Comment Tester

### Étape 1 : Créer un compte

```bash
POST /api/auth/register
{
  "email": "admin@test.com",
  "password": "password123",
  "nom": "Admin",
  "prenom": "Test",
  "role": "admin"
}
```

### Étape 2 : Se connecter

```bash
POST /api/auth/login
{
  "email": "admin@test.com",
  "password": "password123"
}
```

Vous recevrez un `token`

### Étape 3 : Accéder aux statistiques

```bash
GET /api/statistics
Headers: Authorization: Bearer {token}
```

### Étape 4 : Vérifier dans le Dashboard

- Accédez au dashboard
- Assurez-vous que vous êtes connecté (le token est dans localStorage)
- La page Statistiques devrait charger les données

## 🐛 Débogage

Si ça ne fonctionne toujours pas :

1. **Vérifier le token** :

   ```javascript
   // Dans la console du navigateur
   console.log(localStorage.getItem("token"));
   ```

2. **Vérifier les en-têtes** :
   - Ouvrez DevTools → Network
   - Vérifiez que le header `Authorization` contient `Bearer {token}`

3. **Vérifier la réponse de l'API** :

   ```bash
   curl -H "Authorization: Bearer {token}" http://localhost:5000/api/statistics
   ```

4. **Vérifier les données en base** :
   ```bash
   node scripts/testStatistics.js
   ```

## 📈 Données Actuelles

- **39 infrastructures** avec type et quartier
- **0 propositions** retournées (table vide ou problème de structure)
- **Communes, Arrondissements** : données complètes depuis import manuel

## ✨ Suggestion pour le futur

Implémenter l'enrichissement automatique des données lors du création d'une infrastructure pour avoir une base de données cohérente et des requêtes plus rapides.
