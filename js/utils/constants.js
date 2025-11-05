// js/utils/constants.js

// Configuration Firebase
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAAMOp4EFP9wkI_UV1t7tsLs_CvoboFbaw",
    authDomain: "inovareport-14e72.firebaseapp.com",
    projectId: "inovareport-14e72",
    storageBucket: "inovareport-14e72.firebasestorage.app",
    messagingSenderId: "420806381491",
    appId: "1:420806381491:web:888c44dcdc0ecd34dc05c6",
    measurementId: "G-RD6WV65836"
};

// Collections Firebase
export const FIRESTORE_COLLECTIONS = {
    USERS: 'users',
    REPORTS: 'reports',
    CLIENTS: 'clients',
    SOFTWARES: 'softwares',
    INTERVENTIONS: 'interventions'
};

// Entreprises en Côte d'Ivoire
export const ENTREPRISES = [
    'SGBCI',
    'Orange CI',
    'MTN CI', 
    'Moov CI',
    'BICICI',
    'Ecobank',
    'Coris Bank',
    'NSIA Banque',
    'Société Générale CI',
    'Total CI',
    'Shell CI',
    'Vivo Energy',
    'CIE',
    'SODECI',
    'Prosuma',
    'CFAO',
    'Solibra',
    'Nestlé CI',
    'Unilever CI',
    'PlaYce Marcory',
    'Carrefour',
    'SAHAM Assurance',
    'NSIA Assurances',
    'Atlantique Assurance',
    'Air Côte d\'Ivoire',
    'Bolloré Transport & Logistics',
    'Maersk CI',
    'DHL CI',
    'SIVOM',
    'PETROCI',
    'SIR',
    'SITAB',
    'CIMAF',
    'LafargeHolcim CI',
    'FILTISAC',
    'PALMCI',
    'SACO',
    'IDT',
    'UNIWAX',
    'Autre'
];

// Villes principales de Côte d'Ivoire
export const VILLES = [
    'Abidjan',
    'Yamoussoukro',
    'Bouaké',
    'Daloa',
    'San-Pédro',
    'Korhogo',
    'Man',
    'Gagnoa',
    'Abengourou',
    'Divo',
    'Anyama',
    'Grand-Bassam',
    'Adzopé',
    'Agboville',
    'Dabou',
    'Dimbokro',
    'Odienné',
    'Bondoukou',
    'Bingerville',
    'Issia'
];

// Communes par ville
export const COMMUNES_PAR_VILLE = {
    'Abidjan': [
        'Abobo',
        'Adjamé',
        'Anyama',
        'Attécoubé',
        'Bingerville',
        'Cocody',
        'Koumassi',
        'Marcory',
        'Plateau',
        'Port-Bouët',
        'Songon',
        'Treichville',
        'Yopougon'
    ],
    'Yamoussoukro': [
        'Attiégouakro',
        'Kossou',
        'Lolobo',
        'Morofé',
        'N\'Gattakro',
        'Toumbokro',
        'Zambakro'
    ],
    'Bouaké': [
        'Ahougnanssou',
        'Air France',
        'Belleville',
        'Broukro',
        'Commerce',
        'Dar-Es-Salam',
        'Kennedy',
        'Koko',
        'Municipal',
        'N\'Gattakro',
        'Nimbo',
        'Sokoura',
        'TSF'
    ],
    'Daloa': [
        'Balouzon',
        'Commerce',
        'Évêché',
        'Garage',
        'Gbeuliville',
        'Huberson',
        'Kennedy',
        'Labia',
        'Lobia',
        'Marais',
        'Orly',
        'Pierre Gadié',
        'Sapia',
        'Soleil',
        'Tazibouo'
    ],
    'San-Pédro': [
        'Balmer',
        'Bardot',
        'CMA',
        'Lac',
        'Lauriers',
        'Lighthouse',
        'Cité',
        'Seweké',
        'Victor Ballot',
        'Zimbabwe'
    ],
    'Korhogo': [
        'Ahorodougou',
        'Air France',
        'Banaforo',
        'Belle-ville',
        'Cocody',
        'DEM',
        'Delafosse',
        'Haut-Quartier',
        'Koko',
        'Mongaha',
        'Nouveau Quartier',
        'Petit-Paris',
        'Résidentiel',
        'Sinistré',
        'Soba',
        'Sonzoribougou',
        'Tchekelezo',
        'Tegbé'
    ],
    'Man': [
        'Belle-Ville',
        'Cafop',
        'Campus',
        'Commerce',
        'Dioulabougou',
        'Domoraud',
        'Grand-Gbapleu',
        'Koko',
        'Libreville',
        'Lycée',
        'Plateau',
        'Ponti'
    ],
    'Gagnoa': [
        'Bakanou',
        'Dioulabougou',
        'Garahio',
        'Hermankono',
        'Lebeaude',
        'Lipouli',
        'Poto-Poto'
    ],
    'Abengourou': [
        'Centre-ville',
        'Commerce',
        'Ébilassokro',
        'France',
        'Kimoukro',
        'Quartier Administratif',
        'Quartier CIE',
        'Soungouaté',
        'Zone Industrielle'
    ],
    'Divo': [
        'Centre-ville',
        'Commerce',
        'Dagrom',
        'Dioulabougou',
        'Kpada',
        'Quartier Résidentiel',
        'Tazibouo'
    ],
    'Anyama': [
        'Ahouabo',
        'Centre',
        'PK 18',
        'Résidentiel',
        'Schneider',
        'Thomasset',
        'Zone 4',
        'Zone Industrielle'
    ],
    'Grand-Bassam': [
        'Azuretti',
        'Centre',
        'France',
        'Impérial',
        'Moossou',
        'Petit-Paris',
        'Quartier Phare',
        'Quartier Isaac'
    ],
    'Adzopé': [
        'Assikoi',
        'Centre-ville',
        'Commerce',
        'Dioulakro',
        'TP'
    ],
    'Agboville': [
        'Centre-ville',
        'Commerce',
        'Grand-Yapo',
        'Quartier Résidentiel',
        'Yapo-Kpa'
    ],
    'Dabou': [
        'Centre-ville',
        'Cité SOGEFIHA',
        'Commerce',
        'Kpass',
        'Quartier Mahou',
        'Quartier PK'
    ],
    'Dimbokro': [
        'Centre-ville',
        'Commerce',
        'Dioulakro',
        'Kokrenou',
        'Nzuékokoré'
    ],
    'Odienné': [
        'Centre-ville',
        'Commerce',
        'Dioulabougou',
        'Frontière',
        'Résidentiel'
    ],
    'Bondoukou': [
        'Centre-ville',
        'Djiminisso',
        'Hamdalaye',
        'Kamagaya',
        'Zanzan'
    ],
    'Bingerville': [
        'Adjin',
        'Akandjé',
        'Centre-ville',
        'Gbagba',
        'Résidentiel'
    ],
    'Issia': [
        'Centre-ville',
        'Commerce',
        'Résidentiel',
        'Tapé'
    ]
};

// Logiciels disponibles (liste initiale)
export const LOGICIELS_INITIAUX = [
    'Microsoft Office',
    'Microsoft 365',
    'Windows Server',
    'Active Directory',
    'Exchange Server',
    'SQL Server',
    'SharePoint',
    'Teams',
    'SAP',
    'Oracle Database',
    'Oracle ERP',
    'Sage 100',
    'Sage X3',
    'Odoo',
    'QuickBooks',
    'VMware vSphere',
    'VMware Workstation',
    'Hyper-V',
    'Citrix',
    'Veeam Backup',
    'Symantec Backup',
    'Kaspersky',
    'Norton',
    'BitDefender',
    'FortiGate',
    'Cisco IOS',
    'pfSense',
    'Adobe Creative Suite',
    'AutoCAD',
    'SolidWorks',
    'MATLAB',
    'Visual Studio',
    'Git',
    'Docker',
    'Kubernetes'
];

// Types d'intervention
export const TYPES_INTERVENTION = {
    EN_LIGNE: 'En ligne',
    SUR_SITE: 'Sur site'
};

// Statuts de rapport
export const STATUTS_RAPPORT = {
    EN_COURS: 'En cours',
    TERMINE: 'Terminé',
    EN_ATTENTE: 'En attente',
    ANNULE: 'Annulé'
};

// Unités de durée
export const UNITES_DUREE = {
    HEURES: 'heures',
    JOURS: 'jours',
    SEMAINES: 'semaines',
    MOIS: 'mois'
};

// Rôles utilisateur
export const ROLES = {
    AGENT: 'agent',
    RESPONSABLE: 'responsable',
    ADMIN: 'admin'
};

// Messages d'erreur
export const ERROR_MESSAGES = {
    AUTH_EMAIL_EXISTS: 'Cette adresse email est déjà utilisée',
    AUTH_INVALID_EMAIL: 'Adresse email invalide',
    AUTH_WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 6 caractères',
    AUTH_USER_NOT_FOUND: 'Aucun compte n\'existe avec cette adresse email',
    AUTH_WRONG_PASSWORD: 'Mot de passe incorrect',
    AUTH_TOO_MANY_REQUESTS: 'Trop de tentatives. Veuillez réessayer plus tard',
    NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet',
    GENERIC_ERROR: 'Une erreur est survenue. Veuillez réessayer',
    REQUIRED_FIELD: 'Ce champ est requis',
    INVALID_PHONE: 'Numéro de téléphone invalide',
    PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
    FIREBASE_ERROR: 'Erreur Firebase',
    PERMISSION_DENIED: 'Accès refusé',
    INVALID_ROLE: 'Rôle utilisateur non valide',
    ROLE_REQUIRED: 'La sélection du rôle est obligatoire'
};

// Messages de succès
export const SUCCESS_MESSAGES = {
    REGISTER_SUCCESS: 'Inscription réussie! Redirection vers la page de connexion...',
    LOGIN_SUCCESS: 'Connexion réussie! Redirection...',
    REPORT_CREATED: 'Rapport créé avec succès!',
    REPORT_UPDATED: 'Rapport modifié avec succès!',
    REPORT_DELETED: 'Rapport supprimé avec succès!',
    EMAIL_SENT: 'Email envoyé avec succès!',
    EXPORT_SUCCESS: 'Export réussi!',
    PASSWORD_RESET: 'Un email de réinitialisation a été envoyé',
    CLIENT_ADDED: 'Client ajouté avec succès!',
    SOFTWARE_ADDED: 'Logiciel ajouté avec succès!',
    DATA_SAVED: 'Données sauvegardées avec succès!',
    REGISTER_AGENT_SUCCESS: 'Inscription réussie! Vous êtes maintenant Agent.',
    REGISTER_RESPONSABLE_SUCCESS: 'Inscription réussie! Vous êtes maintenant Responsable IT.'
};

// Configuration des graphiques
export const CHART_COLORS = {
    primary: 'rgb(79, 70, 229)',
    secondary: 'rgb(59, 130, 246)',
    success: 'rgb(16, 185, 129)',
    danger: 'rgb(239, 68, 68)',
    warning: 'rgb(245, 158, 11)',
    info: 'rgb(147, 51, 234)',
    light: 'rgb(243, 244, 246)',
    dark: 'rgb(31, 41, 55)'
};

// Formats de date
export const DATE_FORMATS = {
    SHORT: 'DD/MM/YYYY',
    LONG: 'DD MMMM YYYY',
    WITH_TIME: 'DD/MM/YYYY HH:mm',
    TIME_ONLY: 'HH:mm',
    MONTH_YEAR: 'MMMM YYYY'
};

// Paramètres de pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
    MAX_PAGES_DISPLAYED: 5
};

// Validation patterns
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_CI: /^(\+225|00225)?[0-9]{10}$/,
    PASSWORD: /^.{6,}$/
};

// Configuration email
export const EMAIL_CONFIG = {
    DEFAULT_FROM: 'noreply@inovareport.ci',
    DEFAULT_SUBJECT: 'InovaReport - Rapport d\'intervention',
    SUPPORT_EMAIL: 'support@inovareport.ci'
};

// Durées de cache (en millisecondes)
export const CACHE_DURATIONS = {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 heures
    WEEK: 7 * 24 * 60 * 60 * 1000 // 7 jours
};

// Types de modal
export const MODAL_TYPES = {
    REPORT: 'report',
    CLIENT: 'client',
    SOFTWARE: 'software',
    CONFIRMATION: 'confirmation',
    EXPORT: 'export'
};

// Actions utilisateur
export const USER_ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete'
};

// Export des constantes par défaut
export default {
    FIREBASE_CONFIG,
    FIRESTORE_COLLECTIONS,
    ENTREPRISES,
    VILLES,
    COMMUNES_PAR_VILLE,
    LOGICIELS_INITIAUX,
    TYPES_INTERVENTION,
    STATUTS_RAPPORT,
    UNITES_DUREE,
    ROLES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    CHART_COLORS,
    DATE_FORMATS,
    PAGINATION,
    VALIDATION_PATTERNS,
    EMAIL_CONFIG,
    CACHE_DURATIONS,
    MODAL_TYPES,
    USER_ACTIONS
};