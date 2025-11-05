# InovaReport - Système de Gestion des Rapports d'Intervention

## 📋 Description

InovaReport est une application web complète de gestion des rapports d'intervention technique destinée aux entreprises de services informatiques en Côte d'Ivoire. Elle permet aux agents de créer et gérer leurs rapports d'intervention, et aux responsables IT d'avoir une vue d'ensemble de toutes les activités.

## 🚀 Fonctionnalités Principales

### Pour les Agents
- ✅ Création de rapports d'intervention détaillés
- ✅ Historique complet des interventions
- ✅ Modification et suppression des rapports
- ✅ Tableau de bord avec statistiques personnelles
- ✅ Export et impression des rapports

### Pour les Responsables IT
- ✅ Vue d'ensemble de tous les rapports
- ✅ Statistiques en temps réel
- ✅ Graphiques analytiques (hebdomadaire, par type)
- ✅ Filtres avancés (agent, client, date, etc.)
- ✅ Export Excel/CSV et PDF
- ✅ Envoi des rapports par email

## 🛠️ Technologies Utilisées

- **Frontend**: HTML5, TailwindCSS, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Base de données**: Firebase Firestore
- **Authentification**: Firebase Auth
- **Graphiques**: Chart.js
- **Icons**: Font Awesome

## 📦 Structure du Projet

```
inovareport/
├── index.html                      # Page d'accueil
├── login.html                      # Page de connexion
├── register.html                   # Page d'inscription
├── agent-dashboard.html            # Dashboard Agent
├── responsable-dashboard.html      # Dashboard Responsable IT
├── css/
│   └── main.css                   # Styles personnalisés
├── js/
│   ├── config/
│   │   └── firebase.js            # Configuration Firebase
│   ├── services/
│   │   └── database.js            # Service base de données
│   └── utils/
│       ├── constants.js           # Constantes de l'application
│       └── helpers.js             # Fonctions utilitaires
└── README.md                      # Documentation
```

## 🔧 Installation et Configuration

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Un compte Firebase (gratuit)
- Un serveur web local ou hébergement

### Étape 1: Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Créer un projet"
3. Donnez un nom à votre projet (ex: "InovaReport")
4. Suivez les étapes de configuration

### Étape 2: Configurer Firebase Authentication

1. Dans la console Firebase, allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Activez la méthode "Email/Mot de passe"
4. Cliquez sur "Activer" et "Enregistrer"

### Étape 3: Configurer Firestore Database

1. Dans la console Firebase, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Mode production"
4. Sélectionnez votre région (ex: europe-west3)
5. Configurez les règles de sécurité :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre la lecture/écriture aux utilisateurs authentifiés
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.agentId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'responsable');
    }
  }
}
```

### Étape 4: Obtenir les clés de configuration

1. Dans les paramètres du projet Firebase
2. Descendez jusqu'à "Vos applications"
3. Cliquez sur l'icône "</>" pour ajouter une app web
4. Donnez un nom à votre app
5. Copiez la configuration Firebase

### Étape 5: Configurer l'application

1. Ouvrez le fichier `js/config/firebase.js`
2. Remplacez les valeurs de configuration par les vôtres :

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_AUTH_DOMAIN",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_STORAGE_BUCKET",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};
```

### Étape 6: Déployer l'application

#### Option A: Test en local
1. Installez un serveur local (ex: Live Server pour VS Code)
2. Ouvrez le projet dans votre éditeur
3. Lancez le serveur local
4. Accédez à `http://localhost:5500`

#### Option B: Hébergement sur Firebase Hosting
1. Installez Firebase CLI : `npm install -g firebase-tools`
2. Connectez-vous : `firebase login`
3. Initialisez : `firebase init hosting`
4. Déployez : `firebase deploy`

#### Option C: Autres hébergements
- Netlify
- Vercel
- GitHub Pages
- Hébergement traditionnel

## 📱 Utilisation

### Première Inscription

1. Accédez à la page d'accueil
2. Cliquez sur "S'inscrire"
3. Remplissez le formulaire :
   - Nom complet
   - Email professionnel
   - Téléphone
   - **Rôle** (Agent ou Responsable IT)
   - Département (optionnel)
   - Mot de passe
4. Validez l'inscription

### Connexion

1. Utilisez votre email et mot de passe
2. Vous serez automatiquement redirigé vers le dashboard approprié

### Créer un Rapport (Agent)

1. Cliquez sur "Nouveau Rapport"
2. Remplissez tous les champs requis :
   - Raison Sociale (client)
   - Interlocuteur
   - Contact
   - Date d'intervention
   - Localisation (Ville et Commune)
   - Durée de la mission
   - Type d'intervention (En ligne/Sur site)
   - Logiciels utilisés
   - Objet de la mission
   - Actions réalisées
   - Recommandations
3. Cliquez sur "Enregistrer"

### Consulter les Statistiques (Responsable IT)

1. Le dashboard affiche automatiquement :
   - Total des rapports
   - Rapports de la semaine
   - Nombre d'agents actifs
   - Répartition par type d'intervention
   - Graphiques d'évolution
2. Utilisez les filtres pour affiner l'affichage
3. Exportez les données en Excel ou PDF

## 🔒 Sécurité

- Authentification sécurisée via Firebase Auth
- Mots de passe hashés et cryptés
- Sessions sécurisées
- Règles Firestore pour contrôler l'accès aux données
- HTTPS requis en production

## 📊 Base de Données

### Structure des Collections

#### Collection `users`
```javascript
{
  uid: "string",
  fullName: "string",
  email: "string",
  phone: "string",
  role: "agent|responsable",
  department: "string",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  isActive: "boolean",
  stats: {
    totalReports: "number",
    weekReports: "number",
    monthReports: "number"
  }
}
```

#### Collection `reports`
```javascript
{
  agentId: "string",
  agentName: "string",
  raisonSociale: "string",
  interlocuteur: "string",
  contact: "string",
  dateIntervention: "date",
  ville: "string",
  commune: "string",
  dureeValeur: "number",
  dureeUnite: "string",
  logiciels: ["array"],
  typeIntervention: "string",
  sousContrat: "string",
  statut: "string",
  objetMission: "string",
  actionsRealisees: "string",
  recommandations: "string",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## 🎨 Personnalisation

### Modifier les couleurs
Éditez le fichier `css/main.css` :
```css
:root {
    --primary-blue: #3B82F6;
    --primary-indigo: #6366F1;
    /* ... */
}
```

### Ajouter des entreprises
Éditez `js/utils/constants.js` :
```javascript
export const ENTREPRISES = [
    'Votre Entreprise',
    // ...
];
```

### Ajouter des villes/communes
Éditez `js/utils/constants.js` :
```javascript
export const COMMUNES_PAR_VILLE = {
    'NouvelleVille': ['Commune1', 'Commune2'],
    // ...
};
```

## 🐛 Dépannage

### Erreur de connexion Firebase
- Vérifiez votre connexion internet
- Vérifiez les clés de configuration
- Vérifiez que Firebase Auth est activé

### Erreur de permission Firestore
- Vérifiez les règles de sécurité
- Assurez-vous que l'utilisateur est connecté

### Page blanche
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs JavaScript
- Vérifiez que tous les fichiers sont chargés

## 📈 Améliorations Futures

- [ ] Application mobile (React Native)
- [ ] Notifications push
- [ ] Signature électronique des rapports
- [ ] Intégration avec des APIs tierces
- [ ] Mode hors ligne avec synchronisation
- [ ] Multi-langue (Français/Anglais)
- [ ] Dashboard analytics avancé
- [ ] Système de facturation intégré

## 🤝 Support

Pour toute question ou assistance :
- Email : support@inovareport.ci
- Documentation : [En ligne](#)
- Issues : [GitHub Issues](#)

## 📄 Licence

Copyright © 2024 InovaReport. Tous droits réservés.

---

**Développé avec ❤️ pour la Côte d'Ivoire 🇨🇮**