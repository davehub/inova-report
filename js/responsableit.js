 // =================================================================
        // IMPORTATION DES MODULES FIREBASE
        // =================================================================
        import { auth, db, initializeFirebase } from './js/config/firebase.js';
        import { 
            onAuthStateChanged,
            signOut 
        } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
        import { 
            collection, 
            onSnapshot, 
            query, 
            orderBy,
            where,
            getDocs,
            doc,
            getDoc,
            updateDoc,
            deleteDoc,
            addDoc,
            serverTimestamp,
            setDoc,
            increment
        } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
        
        // =================================================================
        // SERVICE D'AUTHENTIFICATION SIMPLIFIÉ
        // =================================================================
        class AuthService {
            constructor() {
                this.currentUser = null;
            }
            
            // Vérifier l'état d'authentification
            checkAuthState(callback) {
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', user.uid));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                this.currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    ...userData
                                };
                                
                                if (callback) {
                                    callback({ success: true, user: this.currentUser });
                                }
                            } else {
                                console.warn('Document utilisateur non trouvé, création par défaut');
                                // Créer un document par défaut
                                const defaultUserData = {
                                    email: user.email,
                                    fullName: user.email.split('@')[0],
                                    role: 'technicien',
                                    createdAt: new Date(),
                                    lastLogin: new Date()
                                };
                                
                                this.currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    ...defaultUserData
                                };
                                
                                if (callback) {
                                    callback({ success: true, user: this.currentUser });
                                }
                            }
                        } catch (error) {
                            console.error('Erreur récupération données utilisateur:', error);
                            if (callback) {
                                callback({ success: false, error: error.message });
                            }
                        }
                    } else {
                        this.currentUser = null;
                        if (callback) {
                            callback({ success: false, error: 'Non authentifié' });
                        }
                    }
                });
            }
            
            // Déconnexion
            async logout() {
                try {
                    await signOut(auth);
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Erreur déconnexion:', error);
                    throw error;
                }
            }
        }
        
        // =================================================================
        // CLASSE PRINCIPALE DASHBOARD RESPONSABLE
        // =================================================================
        class ResponsableDashboardManager {
            constructor() {
                this.authService = new AuthService();
                this.currentUser = null;
                this.allReports = [];
                this.filteredReports = [];
                this.agentsMap = new Map();
                this.unsubscribeReports = null;
                this.clientsList = [];
                this.softwareList = [];
                this.charts = {
                    weeklyChart: null,
                    typeChart: null
                };
                this.currentReportDetails = null;
                this.currentReportId = null;
                this.elements = {};
                this.userRole = null;
                this.confirmationCallback = null;
                this.sessionTimer = null;
            }
    
            // =================================================================
            // MÉTHODES D'INITIALISATION
            // =================================================================
            async initialize() {
                console.log('🚀 Initialisation du Dashboard Responsable...');
                this.initElements();
                this.initEventListeners();
                await this.setupAuth();
            }
    
            initElements() {
                this.elements = {
                    // Éléments d'authentification
                    responsableName: document.getElementById('responsableName'),
                    loadingState: document.getElementById('loading-state'),
                    
                    // Navigation et contenu principal
                    mainNav: document.getElementById('main-nav'),
                    mainContent: document.getElementById('main-content'),
                    
                    // Tableau des rapports
                    reportsTableBody: document.getElementById('reportsTableBody'),
                    noReports: document.getElementById('noReports'),
                    loadingRow: document.getElementById('loadingRow'),
                    tableCount: document.getElementById('tableCount'),
                    filterInfo: document.getElementById('filterInfo'),
                    
                    // Statistiques
                    totalReports: document.getElementById('totalReports'),
                    weekReports: document.getElementById('weekReports'),
                    pendingValidation: document.getElementById('pendingValidation'),
                    activeAgents: document.getElementById('activeAgents'),
                    
                    // Filtres
                    filterAgent: document.getElementById('filterAgent'),
                    filterClient: document.getElementById('filterClient'),
                    filterType: document.getElementById('filterType'),
                    filterDateStart: document.getElementById('filterDateStart'),
                    filterDateEnd: document.getElementById('filterDateEnd'),
                    
                    // Modals
                    detailsModal: document.getElementById('detailsModal'),
                    editModal: document.getElementById('editModal'),
                    clientModal: document.getElementById('clientModal'),
                    softwareModal: document.getElementById('softwareModal'),
                    modalBackdrop: document.getElementById('modalBackdrop'),
                    
                    // Détails du rapport
                    reportDetails: document.getElementById('reportDetails'),
                    validateButton: document.getElementById('validateButton'),
                    editButton: document.getElementById('editButton'),
                    deleteButton: document.getElementById('deleteButton'),
                    
                    // Impression
                    printableReport: document.getElementById('printable-report'),
                    
                    // Graphiques
                    weeklyChart: document.getElementById('weeklyChart'),
                    typeChart: document.getElementById('typeChart'),
                    
                    // Formulaires
                    clientForm: document.getElementById('clientForm'),
                    clientList: document.getElementById('clientList'),
                    clientFormElement: document.getElementById('clientFormElement'),
                    clientId: document.getElementById('clientId'),
                    clientName: document.getElementById('clientName'),
                    clientAddress: document.getElementById('clientAddress'),
                    clientPhone: document.getElementById('clientPhone'),
                    clientEmail: document.getElementById('clientEmail'),
                    
                    softwareForm: document.getElementById('softwareForm'),
                    softwareList: document.getElementById('softwareList'),
                    softwareFormElement: document.getElementById('softwareFormElement'),
                    softwareId: document.getElementById('softwareId'),
                    softwareName: document.getElementById('softwareName'),
                    softwareDescription: document.getElementById('softwareDescription'),
                    softwareVersion: document.getElementById('softwareVersion'),
                    softwareCategory: document.getElementById('softwareCategory'),
                    
                    // Édition de rapport
                    editReportForm: document.getElementById('editReportForm'),
                    
                    // Confirmation modal
                    confirmationModal: document.getElementById('confirmationModal'),
                    confirmationTitle: document.getElementById('confirmationTitle'),
                    confirmationMessage: document.getElementById('confirmationMessage'),
                    confirmButton: document.getElementById('confirmButton')
                };
            }
    
            initEventListeners() {
                // Événements clavier
                document.addEventListener('keydown', (event) => this.handleKeydown(event));
                
                // Événements de clic sur le backdrop
                if (this.elements.modalBackdrop) {
                    this.elements.modalBackdrop.addEventListener('click', () => {
                        this.closeDetailsModal();
                        this.closeEditModal();
                        this.closeClientModal();
                        this.closeSoftwareModal();
                        this.closeConfirmationModal();
                    });
                }
                
                // Formulaires clients et logiciels
                if (this.elements.clientFormElement) {
                    this.elements.clientFormElement.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.saveClient();
                    });
                }
                
                if (this.elements.softwareFormElement) {
                    this.elements.softwareFormElement.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.saveSoftware();
                    });
                }
                
                // Initialisation des filtres de date
                this.initializeDateFilters();
            }
    
            initializeDateFilters() {
                // Dates par défaut (30 derniers jours)
                const defaultEndDate = new Date();
                defaultEndDate.setHours(0, 0, 0, 0);
                const defaultStartDate = new Date(defaultEndDate);
                defaultStartDate.setDate(defaultStartDate.getDate() - 30);
                
                if (this.elements.filterDateStart) {
                    this.elements.filterDateStart.value = defaultStartDate.toISOString().split('T')[0];
                }
                if (this.elements.filterDateEnd) {
                    this.elements.filterDateEnd.value = defaultEndDate.toISOString().split('T')[0];
                }
            }
    
            // =================================================================
            // CONFIGURATION D'AUTHENTIFICATION
            // =================================================================
            async setupAuth() {
                console.log('🔐 Configuration de l\'authentification...');
                
                try {
                    // Initialiser Firebase si nécessaire
                    if (!auth) {
                        console.log('🔄 Initialisation Firebase...');
                        await initializeFirebase();
                    }
                    
                    // Configurer l'observateur d'authentification
                    onAuthStateChanged(auth, async (user) => {
                        console.log('👤 État auth changé:', user ? `✅ Connecté (${user.email})` : '❌ Déconnecté');
                        
                        if (!user) {
                            this.handleUnauthenticatedUser();
                            return;
                        }
                        
                        try {
                            await this.validateAndLoadUser(user);
                        } catch (error) {
                            console.error('💥 Erreur de validation utilisateur:', error);
                            this.handleUserValidationError(error, user);
                        }
                    });
                    
                } catch (error) {
                    console.error('💥 Erreur auth globale:', error);
                    this.showNotification('Erreur d\'authentification', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            }
            
            // =================================================================
            // VALIDATION ET CHARGEMENT DE L'UTILISATEUR
            // =================================================================
            async validateAndLoadUser(user) {
                console.log('📋 Validation de l\'utilisateur...');
                
                // Récupérer les données utilisateur
                const userData = await this.fetchUserData(user.uid);
                
                // Initialiser la session
                await this.initializeUserSession(user, userData);
                
                console.log('✅ Utilisateur validé avec succès');
            }
            
            async fetchUserData(uid) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    
                    if (!userDoc.exists()) {
                        console.log('🆕 Création d\'un profil utilisateur par défaut');
                        return await this.createDefaultUserProfile(uid);
                    }
                    
                    const userData = userDoc.data();
                    console.log('📄 Données utilisateur trouvées');
                    
                    return userData;
                    
                } catch (error) {
                    console.error('💥 Erreur récupération données utilisateur:', error);
                    
                    // En cas d'erreur, utiliser un profil limité
                    return this.createLimitedUserProfile();
                }
            }
            
            async createDefaultUserProfile(uid) {
                const user = auth.currentUser;
                const defaultUserData = {
                    email: user.email,
                    fullName: user.email.split('@')[0],
                    role: 'technicien',
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    isActive: true,
                    permissions: ['view_dashboard']
                };
                
                try {
                    // Sauvegarder dans Firestore
                    await setDoc(doc(db, 'users', uid), defaultUserData);
                    console.log('✅ Profil utilisateur créé');
                    
                    return defaultUserData;
                    
                } catch (error) {
                    console.error('💥 Erreur création profil:', error);
                    return defaultUserData;
                }
            }
            
            createLimitedUserProfile() {
                const user = auth.currentUser;
                return {
                    email: user.email,
                    fullName: user.email.split('@')[0],
                    role: 'guest',
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    isActive: false,
                    hasLimitedAccess: true
                };
            }
            
            // =================================================================
            // VÉRIFICATION DES PERMISSIONS
            // =================================================================
            async checkUserPermissions(userData) {
                console.log('🔐 Vérification des permissions...');
                
                // ✅ TEMPORAIRE: Retourner toujours true pour autoriser l'accès
                console.log('🚨 MODE TEST: Toutes les permissions sont accordées');
                return true;
            }
            
            // =================================================================
            // INITIALISATION DE LA SESSION UTILISATEUR
            // =================================================================
            async initializeUserSession(user, userData) {
                console.log('🚀 Initialisation de la session...');
                
                // Stocker les informations utilisateur
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    fullName: userData.fullName || user.email.split('@')[0],
                    role: userData.role || 'technicien',
                    ...userData
                };
                
                this.userRole = userData.role || 'technicien';
                
                // Mettre à jour la dernière connexion
                await this.updateLastLogin(user.uid);
                
                // Mettre à jour l'interface
                this.updateUserInterface();
                
                // Initialiser le dashboard
                await this.initializeDashboard();
                
                console.log('🎉 Session initialisée avec succès');
            }
            
            async updateLastLogin(uid) {
                try {
                    await updateDoc(doc(db, 'users', uid), {
                        lastLogin: new Date(),
                        loginCount: increment(1)
                    });
                } catch (error) {
                    console.warn('⚠️ Impossible de mettre à jour lastLogin:', error);
                }
            }
            
            updateUserInterface() {
                // Afficher le nom
                if (this.elements.responsableName) {
                    const displayName = this.currentUser.fullName || this.currentUser.email || 'Utilisateur';
                    
                    this.elements.responsableName.innerHTML = `
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <span class="text-indigo-600 font-semibold">
                                    ${displayName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <span>${displayName}</span>
                        </div>
                    `;
                }
            }
            
            // =================================================================
            // GESTION DES ERREURS D'AUTHENTIFICATION
            // =================================================================
            handleUnauthenticatedUser() {
                console.log('⚠️ Utilisateur non authentifié');
                this.showNotification('Veuillez vous connecter', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
            
            async handleUserValidationError(error, user) {
                console.error('💥 Erreur validation utilisateur:', error);
                this.showNotification('Erreur de connexion', 'error');
                
                // Déconnexion
                try {
                    await auth.signOut();
                } catch (signOutError) {
                    console.error('Erreur déconnexion:', signOutError);
                }
                
                // Redirection
                window.location.href = 'login.html';
            }
            
            // =================================================================
            // INITIALISATION DU DASHBOARD
            // =================================================================
            async initializeDashboard() {
                try {
                    console.log('🖥️ Initialisation complète du dashboard...');
                    
                    // Masquer l'état de chargement
                    this.hideLoadingState();
                    
                    // Initialiser les graphiques
                    this.initializeCharts();
                    
                    // Charger les données initiales
                    await Promise.all([
                        this.loadAgents(),
                        this.loadClients(),
                        this.loadSoftware()
                    ]);
                    
                    // Configurer l'écoute en temps réel des rapports
                    await this.setupRealTimeListener();
                    
                    // Afficher l'interface
                    if (this.elements.mainNav) {
                        this.elements.mainNav.classList.remove('hidden');
                    }
                    if (this.elements.mainContent) {
                        this.elements.mainContent.classList.remove('hidden');
                    }
                    
                    console.log('✅ Dashboard responsable initialisé avec succès');
                    
                } catch (error) {
                    console.error('💥 Erreur initialisation dashboard:', error);
                    this.showNotification('Erreur lors du chargement du tableau de bord', 'error');
                    this.hideLoadingState();
                }
            }
            
            // =================================================================
            // ÉCOUTE EN TEMPS RÉEL
            // =================================================================
            async setupRealTimeListener() {
                try {
                    console.log('📡 Configuration de l\'écouteur temps réel...');
                    
                    // Chargement initial des rapports
                    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(reportsQuery);
                    this.processReports(querySnapshot);
                    
                    // Configuration de l'écouteur pour les mises à jour
                    this.unsubscribeReports = onSnapshot(reportsQuery, 
                        (snapshot) => {
                            console.log('🔄 Mise à jour des rapports:', snapshot.size, 'rapports');
                            this.processReports(snapshot);
                        }, 
                        (error) => {
                            console.error('💥 Erreur écoute rapports:', error);
                            if (error.code === 'permission-denied') {
                                this.showNotification('Permission refusée pour accéder aux rapports', 'error');
                            } else {
                                this.showNotification('Erreur de connexion aux données', 'error');
                            }
                        }
                    );
                    
                } catch (error) {
                    console.error('💥 Erreur configuration écouteur:', error);
                    throw error;
                }
            }
            
            processReports(querySnapshot) {
                this.allReports = [];
                querySnapshot.forEach((doc) => {
                    try {
                        const data = doc.data();
                        const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
                        const reportDate = data.date ? new Date(data.date) : createdAt;
                        
                        // Gestion dynamique du type d'intervention
                        let typeIntervention = 'Non spécifié';
                        
                        if (data.typeIntervention) {
                            typeIntervention = data.typeIntervention;
                        } else if (data.interventionType) {
                            typeIntervention = data.interventionType;
                        } else if (data.type) {
                            typeIntervention = data.type;
                        }
                        
                        // Si c'est un tableau (cas où l'agent a sélectionné plusieurs types)
                        if (Array.isArray(typeIntervention)) {
                            typeIntervention = typeIntervention.join(', ');
                        }
                        
                        this.allReports.push({
                            id: doc.id,
                            ...data,
                            // Normalisation des champs
                            agentName: data.agentName || 'Agent inconnu',
                            clientName: data.raisonSociale || data.clientName || 'Client inconnu',
                            site: data.siteGeographique || data.site || 'Non spécifié',
                            type: typeIntervention,
                            duration: data.dureeMission || data.duration || 'Non spécifié',
                            status: data.status || 'Terminé',
                            object: data.objetMission || data.object || 'Non spécifié',
                            interlocutor: data.interlocuteur || data.interlocutor || 'Non spécifié',
                            contact: data.contact || 'Non spécifié',
                            date: reportDate.toISOString().split('T')[0],
                            displayDate: reportDate.toLocaleDateString('fr-FR'),
                            createdAt: createdAt,
                            technicalDetails: data.technicalDetails || data.detailsTechniques || 'Aucun détail technique supplémentaire fourni.',
                            software: data.software || 'Non spécifié',
                            // Champs de validation
                            isValidated: data.isValidated || false,
                            validatedBy: data.validatedBy || null,
                            validatedAt: data.validatedAt || null,
                            canEdit: data.canEdit !== undefined ? data.canEdit : true,
                            originalData: { ...data }
                        });
                    } catch (docError) {
                        console.error('💥 Erreur traitement document:', docError);
                    }
                });
                
                this.filteredReports = [...this.allReports];
                this.updateFilters();
                this.displayReports();
                this.updateStatistics();
                this.updateCharts();
                
                if (this.elements.loadingRow) {
                    this.elements.loadingRow.classList.add('hidden');
                }
                
                console.log(`✅ Traitement terminé: ${this.allReports.length} rapports`);
            }
            
            // =================================================================
            // CHARGEMENT DES DONNÉES
            // =================================================================
            async loadAgents() {
                try {
                    console.log('👥 Chargement des agents...');
                    const usersRef = collection(db, 'users');
                    const querySnapshot = await getDocs(usersRef);
                    
                    this.agentsMap.clear();
                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.fullName || data.email) {
                            this.agentsMap.set(doc.id, data.fullName || data.email);
                        }
                    });
                    
                    if (this.elements.activeAgents) {
                        const agentsCount = Array.from(this.agentsMap.values()).length;
                        this.elements.activeAgents.textContent = agentsCount;
                    }
                    
                    console.log(`✅ ${this.agentsMap.size} utilisateurs chargés`);
                } catch (error) {
                    console.error('💥 Erreur chargement agents:', error);
                    this.showNotification('Erreur de chargement des agents', 'error');
                }
            }
            
            async loadClients() {
                try {
                    console.log('🏢 Chargement des clients...');
                    const querySnapshot = await getDocs(collection(db, 'clients'));
                    this.clientsList = [];
                    
                    querySnapshot.forEach((doc) => {
                        const client = { id: doc.id, ...doc.data() };
                        this.clientsList.push(client);
                    });
                    
                    console.log(`✅ ${this.clientsList.length} client(s) chargé(s)`);
                } catch (error) {
                    console.error('💥 Erreur de chargement des clients:', error);
                    this.showNotification('Erreur de chargement des clients', 'error');
                }
            }
            
            async loadSoftware() {
                try {
                    console.log('💾 Chargement des logiciels...');
                    const querySnapshot = await getDocs(collection(db, 'software'));
                    this.softwareList = [];
                    
                    querySnapshot.forEach((doc) => {
                        const software = { id: doc.id, ...doc.data() };
                        this.softwareList.push(software);
                    });
                    
                    console.log(`✅ ${this.softwareList.length} logiciel(s) chargé(s)`);
                } catch (error) {
                    console.error('💥 Erreur de chargement des logiciels:', error);
                    this.showNotification('Erreur de chargement des logiciels', 'error');
                }
            }
            
            // =================================================================
            // FILTRAGE ET AFFICHAGE
            // =================================================================
            updateFilters() {
                // Mettre à jour les agents
                if (this.elements.filterAgent) {
                    this.elements.filterAgent.innerHTML = '<option value="">Tous les agents</option>';
                    
                    const uniqueAgents = new Set();
                    this.allReports.forEach(report => {
                        if (report.agentName && report.agentName !== 'Agent inconnu') {
                            uniqueAgents.add(report.agentName);
                        }
                    });
                    
                    Array.from(uniqueAgents).sort().forEach(agentName => {
                        const option = new Option(agentName, agentName);
                        this.elements.filterAgent.add(option);
                    });
                }
                
                // Mettre à jour les clients
                if (this.elements.filterClient) {
                    const uniqueClients = [...new Set(this.allReports.map(r => r.clientName).filter(name => name && name !== 'Client inconnu'))];
                    this.elements.filterClient.innerHTML = '<option value="">Tous les clients</option>';
                    uniqueClients.sort().forEach(client => {
                        const option = new Option(client, client);
                        this.elements.filterClient.add(option);
                    });
                }
                
                // Mettre à jour les types
                if (this.elements.filterType) {
                    const allTypes = new Set();
                    this.allReports.forEach(report => {
                        if (report.type && typeof report.type === 'string') {
                            if (report.type.includes(',')) {
                                const types = report.type.split(',').map(t => t.trim());
                                types.forEach(type => allTypes.add(type));
                            } else {
                                allTypes.add(report.type);
                            }
                        }
                    });
                    
                    this.elements.filterType.innerHTML = '<option value="">Tous les types</option>';
                    Array.from(allTypes).filter(Boolean).sort().forEach(type => {
                        const option = new Option(type, type);
                        this.elements.filterType.add(option);
                    });
                }
            }
            
            displayReports() {
                if (!this.elements.reportsTableBody || !this.elements.noReports || !this.elements.tableCount) return;
                
                this.elements.reportsTableBody.innerHTML = '';
                
                if (this.filteredReports.length === 0) {
                    this.elements.noReports.classList.remove('hidden');
                    this.elements.tableCount.textContent = '0 rapports';
                    return;
                }
                
                this.elements.noReports.classList.add('hidden');
                this.elements.tableCount.textContent = `${this.filteredReports.length} rapport${this.filteredReports.length > 1 ? 's' : ''}`;
                
                this.filteredReports.forEach(report => {
                    // Classes CSS pour le statut
                    let statusClass = '';
                    let statusText = report.status;
                    
                    if (report.isValidated) {
                        statusClass = 'bg-green-100 text-green-800 status-validated';
                        statusText = 'Validé';
                    } else {
                        statusClass = report.status === 'Terminé' ? 
                            'bg-orange-100 text-orange-800 status-pending' : 
                            report.status === 'En cours' ?
                            'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800';
                    }
                    
                    // Gestion des types multiples
                    let typeDisplay = report.type || 'Non spécifié';
                    let typeBadges = '';
                    
                    if (typeof typeDisplay === 'string' && typeDisplay.includes(',')) {
                        const types = typeDisplay.split(',').map(t => t.trim());
                        typeBadges = types.map(type => 
                            `<span class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 mr-1 mb-1">${type}</span>`
                        ).join('');
                    } else {
                        typeBadges = `<span class="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">${typeDisplay}</span>`;
                    }
                    
                    const row = this.elements.reportsTableBody.insertRow();
                    row.className = 'hover:bg-gray-50 transition-colors duration-150';
                    
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-indigo-600 text-sm"></i>
                                </div>
                                <span class="text-sm font-medium text-gray-900">${report.agentName}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${report.displayDate}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${report.clientName}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${report.site}</td>
                        <td class="px-6 py-4">
                            <div class="flex flex-wrap gap-1 max-w-[200px]">
                                ${typeBadges}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${report.duration}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                                ${statusText}
                                ${report.isValidated ? '<span class="validation-badge bg-white text-green-800 ml-1"><i class="fas fa-check"></i></span>' : ''}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                            <button onclick="dashboardManager.viewReportDetails('${report.id}')" class="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 mr-2" title="Voir les détails">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="dashboardManager.editReportFromTable('${report.id}')" class="text-blue-600 hover:text-blue-900 transition-colors duration-200 mr-2" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="dashboardManager.deleteReportFromTable('${report.id}')" class="text-red-600 hover:text-red-900 transition-colors duration-200" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                });
            }
            
            updateStatistics() {
                if (this.elements.totalReports) {
                    this.elements.totalReports.textContent = this.filteredReports.length;
                }
                
                // Rapports de la semaine
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const weekReportsCount = this.filteredReports.filter(report => {
                    const reportDate = new Date(report.date);
                    return reportDate >= oneWeekAgo;
                }).length;
                
                if (this.elements.weekReports) {
                    this.elements.weekReports.textContent = weekReportsCount;
                }
                
                // Rapports en attente de validation
                const pendingValidationCount = this.filteredReports.filter(report => 
                    !report.isValidated && report.status === 'Terminé'
                ).length;
                
                if (this.elements.pendingValidation) {
                    this.elements.pendingValidation.textContent = pendingValidationCount;
                }
                
                this.updateFilterInfo();
            }
            
            updateFilterInfo() {
                if (!this.elements.filterInfo) return;
                
                const activeFilters = [];
                
                if (this.elements.filterAgent?.value) {
                    activeFilters.push('agent');
                }
                if (this.elements.filterClient?.value) {
                    activeFilters.push('client');
                }
                if (this.elements.filterType?.value) {
                    activeFilters.push('type');
                }
                if (this.elements.filterDateStart?.value || this.elements.filterDateEnd?.value) {
                    activeFilters.push('date');
                }
                
                if (activeFilters.length === 0) {
                    this.elements.filterInfo.textContent = 'Aucun filtre appliqué';
                } else {
                    this.elements.filterInfo.textContent = `${activeFilters.length} filtre(s) appliqué(s) : ${activeFilters.join(', ')}`;
                }
            }
            
            // =================================================================
            // GESTION DES FILTRES
            // =================================================================
            applyFilters() {
                const agent = this.elements.filterAgent?.value;
                const client = this.elements.filterClient?.value;
                const type = this.elements.filterType?.value;
                const dateStart = this.elements.filterDateStart?.value;
                const dateEnd = this.elements.filterDateEnd?.value;
                
                this.filteredReports = this.allReports.filter(report => {
                    // Filtre par agent
                    let isAgentMatch = !agent;
                    if (agent) {
                        isAgentMatch = report.agentName && report.agentName.toLowerCase().includes(agent.toLowerCase());
                    }
                    
                    // Filtre par client
                    let isClientMatch = !client;
                    if (client && report.clientName) {
                        isClientMatch = report.clientName.toLowerCase().includes(client.toLowerCase());
                    }
                    
                    // Filtre par type d'intervention
                    let isTypeMatch = !type;
                    if (type && report.type) {
                        const reportTypes = typeof report.type === 'string' 
                            ? report.type.split(',').map(t => t.trim().toLowerCase())
                            : [String(report.type).toLowerCase()];
                        
                        const searchType = type.toLowerCase();
                        isTypeMatch = reportTypes.some(t => t.includes(searchType));
                    }
                    
                    // Filtre par date
                    let isDateMatch = true;
                    if (dateStart && report.date < dateStart) isDateMatch = false;
                    if (dateEnd && report.date > dateEnd) isDateMatch = false;
                    
                    return isAgentMatch && isClientMatch && isTypeMatch && isDateMatch;
                });
                
                this.displayReports();
                this.updateStatistics();
                this.updateCharts();
            }
            
            resetFilters() {
                if (this.elements.filterAgent) this.elements.filterAgent.value = '';
                if (this.elements.filterClient) this.elements.filterClient.value = '';
                if (this.elements.filterType) this.elements.filterType.value = '';
                
                // Réinitialiser aux 30 derniers jours
                const defaultEndDate = new Date();
                defaultEndDate.setHours(0, 0, 0, 0);
                const defaultStartDate = new Date(defaultEndDate);
                defaultStartDate.setDate(defaultStartDate.getDate() - 30);
                
                if (this.elements.filterDateStart) {
                    this.elements.filterDateStart.value = defaultStartDate.toISOString().split('T')[0];
                }
                if (this.elements.filterDateEnd) {
                    this.elements.filterDateEnd.value = defaultEndDate.toISOString().split('T')[0];
                }
                
                this.applyFilters();
            }
            
            viewAllReports() {
                this.resetFilters();
                this.showNotification('Affichage de tous les rapports', 'info');
            }
            
            // =================================================================
            // GRAPHIQUES
            // =================================================================
            initializeCharts() {
                // Graphique hebdomadaire
                if (this.elements.weeklyChart) {
                    const weeklyCtx = this.elements.weeklyChart.getContext('2d');
                    this.charts.weeklyChart = new Chart(weeklyCtx, {
                        type: 'line',
                        data: { 
                            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], 
                            datasets: [{
                                label: 'Rapports créés',
                                data: [0, 0, 0, 0, 0, 0, 0],
                                borderColor: '#4F46E5',
                                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: '#4F46E5',
                                pointBorderColor: '#ffffff',
                                pointBorderWidth: 2,
                                pointRadius: 5,
                                pointHoverRadius: 7
                            }] 
                        },
                        options: { 
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    titleColor: '#ffffff',
                                    bodyColor: '#ffffff',
                                    callbacks: {
                                        label: function(context) {
                                            return `Rapports: ${context.parsed.y}`;
                                        }
                                    }
                                }
                            },
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.1)'
                                    },
                                    ticks: {
                                        stepSize: 1,
                                        precision: 0
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    }
                                }
                            } 
                        }
                    });
                }
                
                // Graphique par type
                if (this.elements.typeChart) {
                    const typeCtx = this.elements.typeChart.getContext('2d');
                    this.charts.typeChart = new Chart(typeCtx, {
                        type: 'doughnut',
                        data: { 
                            labels: ['Chargement...'], 
                            datasets: [{
                                data: [1],
                                backgroundColor: [
                                    '#4F46E5', // Indigo
                                    '#EF4444', // Rouge
                                    '#F59E0B', // Orange
                                    '#10B981', // Vert
                                    '#8B5CF6'  // Violet
                                ],
                                borderWidth: 2,
                                borderColor: '#ffffff',
                                hoverOffset: 8
                            }] 
                        },
                        options: { 
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '60%',
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        padding: 20,
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        font: {
                                            size: 11
                                        }
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || '';
                                            const value = context.parsed;
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = Math.round((value / total) * 100);
                                            return `${label}: ${value} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            updateCharts() {
                if (!this.charts.weeklyChart || !this.charts.typeChart) return;
                
                try {
                    // Mettre à jour le graphique hebdomadaire
                    const weeklyData = this.calculateWeeklyData();
                    this.charts.weeklyChart.data.datasets[0].data = weeklyData;
                    this.charts.weeklyChart.update('none');
                    
                    // Mettre à jour le graphique par type
                    const typeData = this.calculateTypeData();
                    this.charts.typeChart.data.labels = typeData.labels;
                    this.charts.typeChart.data.datasets[0].data = typeData.data;
                    this.charts.typeChart.update('none');
                    
                } catch (error) {
                    console.error('Erreur mise à jour graphiques:', error);
                }
            }
            
            calculateWeeklyData() {
                const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                const weeklyCounts = [0, 0, 0, 0, 0, 0, 0];
                
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi de cette semaine
                startOfWeek.setHours(0, 0, 0, 0);
                
                this.filteredReports.forEach(report => {
                    const reportDate = new Date(report.date);
                    reportDate.setHours(0, 0, 0, 0);
                    
                    if (reportDate >= startOfWeek) {
                        const dayIndex = reportDate.getDay();
                        // Convertir dimanche (0) à 6, lundi (1) à 0, etc.
                        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                        if (adjustedIndex >= 0 && adjustedIndex < 7) {
                            weeklyCounts[adjustedIndex]++;
                        }
                    }
                });
                
                return weeklyCounts;
            }
            
            calculateTypeData() {
                const typeCounts = {};
                
                this.filteredReports.forEach(report => {
                    let types = [];
                    
                    // Gérer les types multiples séparés par des virgules
                    if (report.type && typeof report.type === 'string') {
                        // Séparer les types s'ils sont multiples
                        types = report.type.split(',').map(t => t.trim()).filter(t => t);
                    } else if (Array.isArray(report.type)) {
                        // Si c'est déjà un tableau
                        types = report.type;
                    } else {
                        // Type simple
                        types = [report.type || 'Non spécifié'];
                    }
                    
                    // Compter chaque type individuellement
                    types.forEach(type => {
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });
                });
                
                // Trier par nombre décroissant et limiter aux 5 principaux types
                const sortedTypes = Object.entries(typeCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .reduce((acc, [key, value]) => {
                        acc.labels.push(key);
                        acc.data.push(value);
                        return acc;
                    }, { labels: [], data: [] });
                
                // Ajouter "Autres" si nécessaire
                const totalShown = sortedTypes.data.reduce((sum, val) => sum + val, 0);
                const totalAll = Object.values(typeCounts).reduce((sum, val) => sum + val, 0);
                
                if (totalShown < totalAll) {
                    sortedTypes.labels.push('Autres');
                    sortedTypes.data.push(totalAll - totalShown);
                }
                
                return sortedTypes;
            }
            
            // =================================================================
            // GESTION DES CLIENTS
            // =================================================================
            openClientManagement() {
                this.elements.clientModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
                this.loadClientList();
            }
            
            closeClientModal() {
                this.elements.clientModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                this.hideClientForm();
            }
            
            async loadClientList() {
                try {
                    if (!this.elements.clientList) return;
                    
                    this.elements.clientList.innerHTML = '';
                    
                    if (this.clientsList.length === 0) {
                        this.elements.clientList.innerHTML = '<p class="text-gray-500 text-center py-4">Aucun client trouvé</p>';
                        return;
                    }
                    
                    this.clientsList.forEach(client => {
                        const clientElement = document.createElement('div');
                        clientElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
                        clientElement.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-green-600"></i>
                                </div>
                                <div>
                                    <h5 class="font-medium text-gray-800">${client.name || 'Sans nom'}</h5>
                                    ${client.email ? `<p class="text-sm text-gray-600">${client.email}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="dashboardManager.editClient('${client.id}')" class="text-blue-600 hover:text-blue-800 transition-colors" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="dashboardManager.deleteClient('${client.id}', '${client.name || 'ce client'}')" class="text-red-600 hover:text-red-800 transition-colors" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        this.elements.clientList.appendChild(clientElement);
                    });
                } catch (error) {
                    console.error('Erreur chargement liste clients:', error);
                    this.showNotification('Erreur lors du chargement des clients', 'error');
                }
            }
            
            showAddClientForm() {
                this.elements.clientForm?.classList.remove('hidden');
                this.elements.clientList?.classList.add('hidden');
                this.resetClientForm();
            }
            
            hideClientForm() {
                this.elements.clientForm?.classList.add('hidden');
                this.elements.clientList?.classList.remove('hidden');
                this.resetClientForm();
            }
            
            resetClientForm() {
                this.elements.clientId.value = '';
                this.elements.clientName.value = '';
                this.elements.clientAddress.value = '';
                this.elements.clientPhone.value = '';
                this.elements.clientEmail.value = '';
            }
            
            editClient(clientId) {
                try {
                    const client = this.clientsList.find(c => c.id === clientId);
                    if (!client) return;
                    
                    this.elements.clientId.value = client.id;
                    this.elements.clientName.value = client.name || '';
                    this.elements.clientAddress.value = client.address || '';
                    this.elements.clientPhone.value = client.phone || '';
                    this.elements.clientEmail.value = client.email || '';
                    
                    this.showAddClientForm();
                } catch (error) {
                    console.error('Erreur modification client:', error);
                    this.showNotification('Erreur lors de la modification du client', 'error');
                }
            }
            
            async saveClient() {
                try {
                    const clientData = {
                        name: this.elements.clientName.value.trim(),
                        address: this.elements.clientAddress.value.trim(),
                        phone: this.elements.clientPhone.value.trim(),
                        email: this.elements.clientEmail.value.trim(),
                        updatedAt: new Date()
                    };
                    
                    if (!clientData.name) {
                        this.showNotification('Le nom du client est obligatoire', 'error');
                        return;
                    }
                    
                    if (this.elements.clientId.value) {
                        // Mise à jour
                        const clientRef = doc(db, 'clients', this.elements.clientId.value);
                        await updateDoc(clientRef, clientData);
                        this.showNotification('Client modifié avec succès', 'success');
                    } else {
                        // Création
                        clientData.createdAt = new Date();
                        await addDoc(collection(db, 'clients'), clientData);
                        this.showNotification('Client créé avec succès', 'success');
                    }
                    
                    // Recharger la liste des clients
                    await this.loadClients();
                    this.hideClientForm();
                    this.loadClientList();
                    
                } catch (error) {
                    console.error('Erreur sauvegarde client:', error);
                    this.showNotification('Erreur lors de la sauvegarde du client', 'error');
                }
            }
            
            async deleteClient(clientId, clientName) {
                if (!confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ? Cette action est irréversible.`)) {
                    return;
                }
                
                try {
                    const clientRef = doc(db, 'clients', clientId);
                    await deleteDoc(clientRef);
                    
                    // Recharger la liste des clients
                    await this.loadClients();
                    this.loadClientList();
                    this.showNotification('Client supprimé avec succès', 'success');
                } catch (error) {
                    console.error('Erreur suppression client:', error);
                    this.showNotification('Erreur lors de la suppression du client', 'error');
                }
            }
            
            // =================================================================
            // GESTION DES LOGICIELS
            // =================================================================
            openSoftwareManagement() {
                this.elements.softwareModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
                this.loadSoftwareList();
            }
            
            closeSoftwareModal() {
                this.elements.softwareModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                this.hideSoftwareForm();
            }
            
            async loadSoftwareList() {
                try {
                    if (!this.elements.softwareList) return;
                    
                    this.elements.softwareList.innerHTML = '';
                    
                    if (this.softwareList.length === 0) {
                        this.elements.softwareList.innerHTML = '<p class="text-gray-500 text-center py-4">Aucun logiciel trouvé</p>';
                        return;
                    }
                    
                    this.softwareList.forEach(software => {
                        const softwareElement = document.createElement('div');
                        softwareElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
                        softwareElement.innerHTML = `
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-laptop-code text-purple-600"></i>
                                </div>
                                <div>
                                    <h5 class="font-medium text-gray-800">${software.name || 'Sans nom'}</h5>
                                    ${software.version ? `<p class="text-sm text-gray-600">Version: ${software.version}</p>` : ''}
                                    ${software.description ? `<p class="text-sm text-gray-600 truncate max-w-xs">${software.description}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="dashboardManager.editSoftware('${software.id}')" class="text-blue-600 hover:text-blue-800 transition-colors" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="dashboardManager.deleteSoftware('${software.id}', '${software.name || 'ce logiciel'}')" class="text-red-600 hover:text-red-800 transition-colors" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        this.elements.softwareList.appendChild(softwareElement);
                    });
                } catch (error) {
                    console.error('Erreur chargement liste logiciels:', error);
                    this.showNotification('Erreur lors du chargement des logiciels', 'error');
                }
            }
            
            showAddSoftwareForm() {
                this.elements.softwareForm?.classList.remove('hidden');
                this.elements.softwareList?.classList.add('hidden');
                this.resetSoftwareForm();
            }
            
            hideSoftwareForm() {
                this.elements.softwareForm?.classList.add('hidden');
                this.elements.softwareList?.classList.remove('hidden');
                this.resetSoftwareForm();
            }
            
            resetSoftwareForm() {
                this.elements.softwareId.value = '';
                this.elements.softwareName.value = '';
                this.elements.softwareDescription.value = '';
                this.elements.softwareVersion.value = '';
                this.elements.softwareCategory.value = '';
            }
            
            editSoftware(softwareId) {
                try {
                    const software = this.softwareList.find(s => s.id === softwareId);
                    if (!software) return;
                    
                    this.elements.softwareId.value = software.id;
                    this.elements.softwareName.value = software.name || '';
                    this.elements.softwareDescription.value = software.description || '';
                    this.elements.softwareVersion.value = software.version || '';
                    this.elements.softwareCategory.value = software.category || '';
                    
                    this.showAddSoftwareForm();
                } catch (error) {
                    console.error('Erreur modification logiciel:', error);
                    this.showNotification('Erreur lors de la modification du logiciel', 'error');
                }
            }
            
            async saveSoftware() {
                try {
                    const softwareData = {
                        name: this.elements.softwareName.value.trim(),
                        description: this.elements.softwareDescription.value.trim(),
                        version: this.elements.softwareVersion.value.trim(),
                        category: this.elements.softwareCategory.value.trim(),
                        updatedAt: new Date()
                    };
                    
                    if (!softwareData.name) {
                        this.showNotification('Le nom du logiciel est obligatoire', 'error');
                        return;
                    }
                    
                    if (this.elements.softwareId.value) {
                        // Mise à jour
                        const softwareRef = doc(db, 'software', this.elements.softwareId.value);
                        await updateDoc(softwareRef, softwareData);
                        this.showNotification('Logiciel modifié avec succès', 'success');
                    } else {
                        // Création
                        softwareData.createdAt = new Date();
                        await addDoc(collection(db, 'software'), softwareData);
                        this.showNotification('Logiciel créé avec succès', 'success');
                    }
                    
                    // Recharger la liste des logiciels
                    await this.loadSoftware();
                    this.hideSoftwareForm();
                    this.loadSoftwareList();
                    
                } catch (error) {
                    console.error('Erreur sauvegarde logiciel:', error);
                    this.showNotification('Erreur lors de la sauvegarde du logiciel', 'error');
                }
            }
            
            async deleteSoftware(softwareId, softwareName) {
                if (!confirm(`Êtes-vous sûr de vouloir supprimer le logiciel "${softwareName}" ? Cette action est irréversible.`)) {
                    return;
                }
                
                try {
                    const softwareRef = doc(db, 'software', softwareId);
                    await deleteDoc(softwareRef);
                    
                    // Recharger la liste des logiciels
                    await this.loadSoftware();
                    this.loadSoftwareList();
                    this.showNotification('Logiciel supprimé avec succès', 'success');
                } catch (error) {
                    console.error('Erreur suppression logiciel:', error);
                    this.showNotification('Erreur lors de la suppression du logiciel', 'error');
                }
            }
            
            // =================================================================
            // GESTION DES RAPPORTS
            // =================================================================
            viewReportDetails(reportId) {
                const report = this.allReports.find(r => r.id === reportId);
                if (!report) return;
                
                this.currentReportDetails = report;
                this.currentReportId = reportId;
                
                if (!this.elements.reportDetails) return;
                
                // Mettre à jour l'icône du bouton de validation
                if (this.elements.validateButton) {
                    if (report.isValidated) {
                        this.elements.validateButton.innerHTML = `<i class="fas fa-times-circle"></i>`;
                        this.elements.validateButton.title = 'Dévalider le rapport';
                    } else {
                        this.elements.validateButton.innerHTML = `<i class="fas fa-check-circle"></i>`;
                        this.elements.validateButton.title = 'Valider le rapport';
                    }
                }
                
                // Formatage des types pour l'affichage
                let typeDisplay = report.type || 'Non spécifié';
                let typeBadges = '';
                
                if (typeof typeDisplay === 'string' && typeDisplay.includes(',')) {
                    const types = typeDisplay.split(',').map(t => t.trim());
                    typeBadges = types.map(type => 
                        `<span class="inline-block px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800 mr-2 mb-2">${type}</span>`
                    ).join('');
                } else {
                    typeBadges = `<span class="px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">${typeDisplay}</span>`;
                }
                
                this.elements.reportDetails.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="space-y-4">
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h4 class="font-bold text-blue-800 mb-2">Informations Agent</h4>
                                <p><strong>Nom:</strong> ${report.agentName}</p>
                                <p><strong>Date intervention:</strong> ${report.displayDate}</p>
                                <p><strong>Durée:</strong> ${report.duration}</p>
                                ${report.software && report.software !== 'Non spécifié' ? `<p><strong>Logiciel:</strong> ${report.software}</p>` : ''}
                            </div>
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h4 class="font-bold text-green-800 mb-2">Informations Client</h4>
                                <p><strong>Client:</strong> ${report.clientName}</p>
                                <p><strong>Site:</strong> ${report.site}</p>
                                <p><strong>Interlocuteur:</strong> ${report.interlocutor}</p>
                                <p><strong>Contact:</strong> ${report.contact}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="bg-purple-50 p-4 rounded-lg">
                                <h4 class="font-bold text-purple-800 mb-2">Détails Intervention</h4>
                                <div class="mb-3">
                                    <strong>Type(s):</strong>
                                    <div class="flex flex-wrap mt-2">
                                        ${typeBadges}
                                    </div>
                                </div>
                                <p><strong>Statut:</strong> ${report.status}</p>
                                <p><strong>Créé le:</strong> ${report.createdAt ? report.createdAt.toLocaleString('fr-FR') : 'N/A'}</p>
                                <p><strong>Validation:</strong> 
                                    ${report.isValidated ? 
                                        `<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>Validé</span>` : 
                                        `<span class="text-orange-600 font-semibold"><i class="fas fa-clock mr-1"></i>En attente</span>`
                                    }
                                </p>
                                ${report.validatedBy && report.validatedAt ? `
                                <p><strong>Validé par:</strong> ${report.validatedBy}</p>
                                <p><strong>Validé le:</strong> ${report.validatedAt.toDate ? report.validatedAt.toDate().toLocaleString('fr-FR') : report.validatedAt}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-bold text-gray-800 mb-2">Objet de la mission</h4>
                        <p class="whitespace-pre-wrap">${report.object}</p>
                    </div>
                    ${report.technicalDetails && report.technicalDetails !== 'Aucun détail technique supplémentaire fourni.' ? `
                    <div class="bg-orange-50 p-4 rounded-lg mt-4">
                        <h4 class="font-bold text-orange-800 mb-2">Détails Techniques</h4>
                        <p class="whitespace-pre-wrap">${report.technicalDetails}</p>
                    </div>
                    ` : ''}
                `;
                
                this.elements.detailsModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
            }
            
            closeDetailsModal() {
                this.elements.detailsModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                this.currentReportDetails = null;
                this.currentReportId = null;
            }
            
            // =================================================================
            // VALIDATION DES RAPPORTS
            // =================================================================
            validateReport() {
                if (!this.currentReportId) return;
                
                const report = this.allReports.find(r => r.id === this.currentReportId);
                if (!report) return;
                
                const action = report.isValidated ? 'dévalider' : 'valider';
                const message = report.isValidated 
                    ? 'Êtes-vous sûr de vouloir dévalider ce rapport ?' 
                    : 'Êtes-vous sûr de vouloir valider ce rapport ?';
                
                if (confirm(message)) {
                    this.toggleValidateReport(this.currentReportId, !report.isValidated);
                }
            }
            
            async toggleValidateReport(reportId, validate) {
                try {
                    const reportRef = doc(db, 'reports', reportId);
                    
                    const updateData = validate ? {
                        isValidated: true,
                        validatedBy: this.currentUser.uid,
                        validatedAt: new Date(),
                        canEdit: true
                    } : {
                        isValidated: false,
                        validatedBy: null,
                        validatedAt: null,
                        canEdit: true
                    };
                    
                    await updateDoc(reportRef, updateData);
                    
                    this.showNotification(
                        validate ? 'Rapport validé avec succès' : 'Rapport dévalidé avec succès',
                        'success'
                    );
                    
                } catch (error) {
                    console.error('Erreur changement validation rapport:', error);
                    this.showNotification('Erreur lors du changement de validation du rapport', 'error');
                }
            }
            
            batchValidateReports() {
                const unvalidatedReports = this.allReports.filter(report => !report.isValidated && report.status === 'Terminé');
                
                if (unvalidatedReports.length === 0) {
                    this.showNotification('Aucun rapport à valider', 'info');
                    return;
                }
                
                if (confirm(`Voulez-vous valider ${unvalidatedReports.length} rapport(s) non validé(s) ?`)) {
                    this.showNotification(`Validation de ${unvalidatedReports.length} rapport(s) en cours...`, 'info');
                    
                    unvalidatedReports.forEach(async (report, index) => {
                        try {
                            const reportRef = doc(db, 'reports', report.id);
                            await updateDoc(reportRef, {
                                isValidated: true,
                                validatedBy: this.currentUser.uid,
                                validatedAt: new Date(),
                                canEdit: true
                            });
                            
                            if (index === unvalidatedReports.length - 1) {
                                this.showNotification(`Tous les rapports ont été validés avec succès`, 'success');
                            }
                        } catch (error) {
                            console.error(`Erreur validation rapport ${report.id}:`, error);
                        }
                    });
                }
            }
            
            // =================================================================
            // ÉDITION DES RAPPORTS
            // =================================================================
            editReportFromTable(reportId) {
                const report = this.allReports.find(r => r.id === reportId);
                if (!report) return;
                
                this.currentReportId = reportId;
                this.currentReportDetails = report;
                this.openEditModal();
            }
            
            editReport() {
                if (!this.currentReportId) return;
                
                const report = this.allReports.find(r => r.id === this.currentReportId);
                if (!report) return;
                
                this.currentReportDetails = report;
                this.closeDetailsModal();
                setTimeout(() => this.openEditModal(), 300);
            }
            
            openEditModal() {
                if (!this.currentReportDetails || !this.elements.editReportForm) return;
                
                const report = this.currentReportDetails;
                
                // Créer le formulaire d'édition
                this.elements.editReportForm.innerHTML = `
                    <form id="editForm" class="space-y-6">
                        <input type="hidden" id="editReportId" value="${report.id}">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Informations de base -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                                    <input type="text" id="editAgentName" value="${report.agentName || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Date d'intervention *</label>
                                    <input type="date" id="editDate" value="${report.date || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                                    <select id="editClient" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                        <option value="">Sélectionnez un client</option>
                                        ${this.clientsList.map(client => 
                                            `<option value="${client.name}" ${client.name === report.clientName ? 'selected' : ''}>${client.name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                                    <input type="text" id="editSite" value="${report.site || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Type d'intervention *</label>
                                    <input type="text" id="editType" value="${report.type || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Durée *</label>
                                    <input type="text" id="editDuration" value="${report.duration || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Interlocuteur *</label>
                                    <input type="text" id="editInterlocutor" value="${report.interlocutor || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                                    <input type="text" id="editContact" value="${report.contact || ''}" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Logiciel *</label>
                                    <select id="editSoftware" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                        <option value="">Sélectionnez un logiciel</option>
                                        ${this.softwareList.map(software => 
                                            `<option value="${software.name}" ${software.name === report.software ? 'selected' : ''}>${software.name}</option>`
                                        ).join('')}
                                </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
                                    <select id="editStatus" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150" required>
                                        <option value="En cours" ${report.status === 'En cours' ? 'selected' : ''}>En cours</option>
                                        <option value="Terminé" ${report.status === 'Terminé' ? 'selected' : ''}>Terminé</option>
                                        <option value="Annulé" ${report.status === 'Annulé' ? 'selected' : ''}>Annulé</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Objet de la mission *</label>
                                <textarea id="editObject" rows="4" 
                                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-vertical" required>${report.object || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Détails techniques</label>
                                <textarea id="editTechnicalDetails" rows="3" 
                                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-vertical">${report.technicalDetails || ''}</textarea>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                            <button type="button" onclick="closeEditModal()" 
                                    class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150 font-semibold">
                                Annuler
                            </button>
                            <button type="button" onclick="dashboardManager.submitEditForm()" id="saveEditBtn"
                                    class="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-700 text-white rounded-lg hover:from-blue-700 hover:to-cyan-800 transition duration-150 font-semibold shadow-md">
                                Enregistrer les modifications
                            </button>
                        </div>
                    </form>
                `;
                
                this.elements.editModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
            }
            
            closeEditModal() {
                this.elements.editModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
            }
            
            async submitEditForm() {
                try {
                    const saveBtn = document.getElementById('saveEditBtn');
                    if (!saveBtn) return;
                    
                    const originalText = saveBtn.innerHTML;
                    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement...';
                    saveBtn.disabled = true;
                    saveBtn.classList.add('btn-loading');
                    
                    // Validation des champs obligatoires
                    const requiredFields = [
                        'editAgentName', 'editDate', 'editClient', 'editSite', 
                        'editType', 'editDuration', 'editInterlocutor', 
                        'editContact', 'editSoftware', 'editStatus', 'editObject'
                    ];
                    
                    for (const fieldId of requiredFields) {
                        const field = document.getElementById(fieldId);
                        if (!field?.value.trim()) {
                            this.showNotification(`Le champ est obligatoire`, 'error');
                            this.resetSaveButton(saveBtn, originalText);
                            return;
                        }
                    }
                    
                    const updateData = {
                        agentName: document.getElementById('editAgentName').value.trim(),
                        date: document.getElementById('editDate').value,
                        clientName: document.getElementById('editClient').value,
                        site: document.getElementById('editSite').value.trim(),
                        type: document.getElementById('editType').value.trim(),
                        duration: document.getElementById('editDuration').value.trim(),
                        interlocutor: document.getElementById('editInterlocutor').value.trim(),
                        contact: document.getElementById('editContact').value.trim(),
                        software: document.getElementById('editSoftware').value,
                        status: document.getElementById('editStatus').value,
                        object: document.getElementById('editObject').value.trim(),
                        technicalDetails: document.getElementById('editTechnicalDetails').value.trim(),
                        updatedAt: new Date(),
                        canEdit: true
                    };
                    
                    const reportRef = doc(db, 'reports', this.currentReportId);
                    await updateDoc(reportRef, updateData);
                    
                    this.showNotification('Rapport modifié avec succès', 'success');
                    this.closeEditModal();
                    
                } catch (error) {
                    console.error('Erreur modification rapport:', error);
                    this.showNotification('Erreur lors de la modification du rapport', 'error');
                } finally {
                    const saveBtn = document.getElementById('saveEditBtn');
                    this.resetSaveButton(saveBtn, 'Enregistrer les modifications');
                }
            }
            
            resetSaveButton(button, htmlContent) {
                if (!button) return;
                button.innerHTML = htmlContent;
                button.disabled = false;
                button.classList.remove('btn-loading');
            }
            
            // =================================================================
            // SUPPRESSION DES RAPPORTS
            // =================================================================
            deleteReportFromTable(reportId) {
                const report = this.allReports.find(r => r.id === reportId);
                if (!report) return;
                
                if (confirm(`Êtes-vous sûr de vouloir supprimer le rapport "${report.clientName} - ${report.displayDate}" ? Cette action est irréversible.`)) {
                    this.deleteReportConfirmed(reportId);
                }
            }
            
            deleteReport() {
                if (!this.currentReportId) return;
                
                const report = this.allReports.find(r => r.id === this.currentReportId);
                if (!report) return;
                
                if (confirm(`Êtes-vous sûr de vouloir supprimer le rapport "${report.clientName} - ${report.displayDate}" ? Cette action est irréversible.`)) {
                    this.deleteReportConfirmed(this.currentReportId);
                    this.closeDetailsModal();
                }
            }
            
            async deleteReportConfirmed(reportId) {
                try {
                    const reportRef = doc(db, 'reports', reportId);
                    await deleteDoc(reportRef);
                    
                    const report = this.allReports.find(r => r.id === reportId);
                    this.showNotification(`Rapport "${report.clientName} - ${report.displayDate}" supprimé avec succès`, 'success');
                    
                } catch (error) {
                    console.error('Erreur suppression rapport:', error);
                    this.showNotification('Erreur lors de la suppression du rapport', 'error');
                }
            }
            
            // =================================================================
            // IMPRESSION ET EMAIL
            // =================================================================
            printReport() {
                if (this.currentReportDetails) {
                    this.preparePrintableReport(this.currentReportDetails);
                    setTimeout(() => {
                        window.print();
                        setTimeout(() => {
                            if (this.elements.printableReport) {
                                this.elements.printableReport.classList.add('hidden');
                            }
                        }, 500);
                    }, 500);
                } else {
                    this.showNotification('Aucun rapport sélectionné pour l\'impression', 'error');
                }
            }
            
            preparePrintableReport(report) {
                if (!this.elements.printableReport) return;
                
                // Formatage des types pour l'impression
                let typeDisplay = report.type || 'Non spécifié';
                let typeList = '';
                
                if (typeof typeDisplay === 'string' && typeDisplay.includes(',')) {
                    const types = typeDisplay.split(',').map(t => t.trim());
                    typeList = types.map(type => `<li>${type}</li>`).join('');
                    typeList = `<ul class="list-disc list-inside">${typeList}</ul>`;
                } else {
                    typeList = typeDisplay;
                }
                
                this.elements.printableReport.innerHTML = `
                    <div class="print-header">
                        <h1 class="text-2xl font-bold text-center mb-2">Rapport d'Intervention</h1>
                        <p class="text-center text-gray-600">InovaReport - Système de Gestion des Interventions</p>
                        <p class="text-center text-gray-500 text-sm">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                    
                    <div class="print-section">
                        <h2 class="text-xl font-bold mb-4 text-indigo-700">Informations Générales</h2>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p><strong>Numéro de rapport:</strong> ${report.id}</p>
                                <p><strong>Date de l'intervention:</strong> ${report.displayDate}</p>
                                <p><strong>Type d'intervention:</strong> ${typeList}</p>
                            </div>
                            <div>
                                <p><strong>Statut:</strong> ${report.isValidated ? 'Validé' : report.status}</p>
                                <p><strong>Durée:</strong> ${report.duration}</p>
                                <p><strong>Créé le:</strong> ${report.createdAt ? report.createdAt.toLocaleString('fr-FR') : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-section">
                        <h2 class="text-xl font-bold mb-4 text-indigo-700">Agent d'Intervention</h2>
                        <p><strong>Nom:</strong> ${report.agentName}</p>
                    </div>
                    
                    <div class="print-section">
                        <h2 class="text-xl font-bold mb-4 text-indigo-700">Informations Client</h2>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p><strong>Client:</strong> ${report.clientName}</p>
                                <p><strong>Site:</strong> ${report.site}</p>
                            </div>
                            <div>
                                <p><strong>Interlocuteur:</strong> ${report.interlocutor}</p>
                                <p><strong>Contact:</strong> ${report.contact}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-section">
                        <h2 class="text-xl font-bold mb-4 text-indigo-700">Objet de la Mission</h2>
                        <div class="bg-gray-50 p-4 rounded border">
                            <p class="whitespace-pre-wrap">${report.object}</p>
                        </div>
                    </div>
                    
                    ${report.technicalDetails && report.technicalDetails !== 'Aucun détail technique supplémentaire fourni.' ? `
                    <div class="print-section">
                        <h2 class="text-xl font-bold mb-4 text-indigo-700">Détails Techniques</h2>
                        <div class="bg-gray-50 p-4 rounded border">
                            <p class="whitespace-pre-wrap">${report.technicalDetails}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="print-signature">
                        <div class="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <p class="mb-12">Signature de l'agent</p>
                                <p>Nom: ${report.agentName}</p>
                                <p>Date: ________________</p>
                            </div>
                            <div>
                                <p class="mb-12">Signature du client</p>
                                <p>Nom: ${report.interlocutor}</p>
                                <p>Date: ________________</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-8 text-center text-sm text-gray-500">
                        <p>Document généré automatiquement par InovaReport</p>
                        <p>Pour toute question, contactez le support technique</p>
                    </div>
                `;
                
                this.elements.printableReport.classList.remove('hidden');
            }
            
            sendReportByEmail() {
                if (!this.currentReportDetails) {
                    this.showNotification('Aucun rapport sélectionné pour l\'envoi', 'error');
                    return;
                }
                
                const subject = `Rapport d'intervention - ${this.currentReportDetails.clientName} - ${this.currentReportDetails.displayDate}`;
                const body = `
Bonjour,

Vous trouverez ci-dessous le rapport d'intervention technique :

Agent: ${this.currentReportDetails.agentName}
Client: ${this.currentReportDetails.clientName}
Date: ${this.currentReportDetails.displayDate}
Type d'intervention: ${this.currentReportDetails.type}
Durée: ${this.currentReportDetails.duration}
Statut: ${this.currentReportDetails.isValidated ? 'Validé' : this.currentReportDetails.status}

Objet de la mission:
${this.currentReportDetails.object}

Cordialement,
${this.currentUser.fullName || 'Responsable IT'}
                `.trim();
                
                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(mailtoLink, '_blank');
            }
            
            // =================================================================
            // EXPORT DE DONNÉES
            // =================================================================
            exportAllData() {
                if (this.allReports.length === 0) {
                    this.showNotification('Aucune donnée à exporter', 'warning');
                    return;
                }
                
                // Préparer les données pour l'export
                const exportData = {
                    rapports: this.allReports.map(report => ({
                        id: report.id,
                        agent: report.agentName,
                        client: report.clientName,
                        date: report.displayDate,
                        type: report.type,
                        durée: report.duration,
                        statut: report.status,
                        validation: report.isValidated ? 'Validé' : 'Non validé'
                    })),
                    statistiques: {
                        totalRapports: this.allReports.length,
                        rapportsCetteSemaine: this.allReports.filter(report => {
                            const oneWeekAgo = new Date();
                            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                            const reportDate = new Date(report.date);
                            return reportDate >= oneWeekAgo;
                        }).length,
                        agentsActifs: new Set(this.allReports.map(r => r.agentName)).size,
                        rapportsNonValides: this.allReports.filter(report => !report.isValidated && report.status === 'Terminé').length
                    },
                    dateExport: new Date().toISOString(),
                    exportePar: this.currentUser.fullName || this.currentUser.email
                };
                
                // Créer et télécharger le fichier JSON
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `export-inovareport-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.showNotification(`Export de ${this.allReports.length} rapports réussi`, 'success');
            }
            
            // =================================================================
            // ACTUALISATION DES DONNÉES
            // =================================================================
            async refreshData() {
                this.showNotification('Actualisation des données...', 'info');
                try {
                    await Promise.all([
                        this.loadClients(),
                        this.loadSoftware(),
                        this.loadAgents()
                    ]);
                    this.showNotification('Données actualisées avec succès', 'success');
                } catch (error) {
                    console.error('Erreur rafraîchissement données:', error);
                    this.showNotification('Erreur lors de l\'actualisation', 'error');
                }
            }
            
            refreshCharts() {
                this.updateCharts();
                this.showNotification('Graphiques actualisés', 'success');
            }
            
            // =================================================================
            // MODAL DE CONFIRMATION
            // =================================================================
            showConfirmationModal(title, message, onConfirm) {
                if (this.elements.confirmationTitle) {
                    this.elements.confirmationTitle.textContent = title;
                }
                if (this.elements.confirmationMessage) {
                    this.elements.confirmationMessage.textContent = message;
                }
                this.confirmationCallback = onConfirm;
                this.elements.confirmationModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
            }
            
            closeConfirmationModal() {
                this.elements.confirmationModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                this.confirmationCallback = null;
            }
            
            confirmAction(confirmed) {
                if (confirmed && this.confirmationCallback) {
                    this.confirmationCallback();
                }
                this.closeConfirmationModal();
            }
            
            // =================================================================
            // UTILITAIRES
            // =================================================================
            handleKeydown(event) {
                if (event.key === 'Escape') {
                    this.closeDetailsModal();
                    this.closeEditModal();
                    this.closeClientModal();
                    this.closeSoftwareModal();
                    this.closeConfirmationModal();
                }
            }
            
            showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
                    type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 
                    type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                } text-white`;
                
                let icon = 'fa-info-circle';
                if (type === 'success') icon = 'fa-check-circle';
                if (type === 'error') icon = 'fa-exclamation-circle';
                if (type === 'warning') icon = 'fa-exclamation-triangle';
                
                notification.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <i class="fas ${icon}"></i>
                        <span class="font-medium">${message}</span>
                    </div>
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
            
            hideLoadingState() {
                if (this.elements.loadingState) {
                    this.elements.loadingState.style.display = 'none';
                }
            }
            
            // =================================================================
            // DÉCONNEXION
            // =================================================================
            async logout() {
                if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
                    try {
                        if (this.unsubscribeReports) {
                            this.unsubscribeReports();
                        }
                        await signOut(auth);
                        window.location.href = 'login.html';
                    } catch (error) {
                        console.error('Erreur déconnexion:', error);
                        this.showNotification('Erreur lors de la déconnexion', 'error');
                    }
                }
            }
        }
        
        // =================================================================
        // INITIALISATION DE L'APPLICATION
        // =================================================================
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🚀 Démarrage du Dashboard Responsable...');
            
            try {
                // Initialiser le dashboard manager
                window.dashboardManager = new ResponsableDashboardManager();
                await window.dashboardManager.initialize();
                
                console.log('✅ Dashboard Responsable initialisé avec succès');
                
            } catch (error) {
                console.error('💥 ERREUR initialisation dashboard:', error);
                
                // Afficher un message d'erreur à l'utilisateur
                const loadingState = document.getElementById('loading-state');
                if (loadingState) {
                    loadingState.innerHTML = `
                        <div class="fixed inset-0 bg-white flex items-center justify-center z-50">
                            <div class="text-center">
                                <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                                    <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Erreur de chargement</h3>
                                <p class="text-gray-600 mb-4">Impossible de charger le tableau de bord. Veuillez recharger la page.</p>
                                <div class="flex space-x-3 justify-center">
                                    <button onclick="window.location.reload()" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                                        <i class="fas fa-redo mr-2"></i>Recharger
                                    </button>
                                    <button onclick="window.location.href = 'login.html'" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                                        <i class="fas fa-sign-in-alt mr-2"></i>Se connecter
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    alert('Erreur de chargement du tableau de bord. Veuillez recharger la page.');
                }
            }
        });
        
        // =================================================================
        // FONCTIONS GLOBALES POUR LES ATTRIBUTS HTML
        // =================================================================
        window.applyFilters = function() {
            if (window.dashboardManager) {
                window.dashboardManager.applyFilters();
            }
        };
        
        window.resetFilters = function() {
            if (window.dashboardManager) {
                window.dashboardManager.resetFilters();
            }
        };
        
        window.refreshData = function() {
            if (window.dashboardManager) {
                window.dashboardManager.refreshData();
            }
        };
        
        window.refreshCharts = function() {
            if (window.dashboardManager) {
                window.dashboardManager.refreshCharts();
            }
        };
        
        window.viewAllReports = function() {
            if (window.dashboardManager) {
                window.dashboardManager.viewAllReports();
            }
        };
        
        window.exportAllData = function() {
            if (window.dashboardManager) {
                window.dashboardManager.exportAllData();
            }
        };
        
        window.batchValidateReports = function() {
            if (window.dashboardManager) {
                window.dashboardManager.batchValidateReports();
            }
        };
        
        window.openClientManagement = function() {
            if (window.dashboardManager) {
                window.dashboardManager.openClientManagement();
            }
        };
        
        window.closeClientModal = function() {
            if (window.dashboardManager) {
                window.dashboardManager.closeClientModal();
            }
        };
        
        window.showAddClientForm = function() {
            if (window.dashboardManager) {
                window.dashboardManager.showAddClientForm();
            }
        };
        
        window.hideClientForm = function() {
            if (window.dashboardManager) {
                window.dashboardManager.hideClientForm();
            }
        };
        
        window.openSoftwareManagement = function() {
            if (window.dashboardManager) {
                window.dashboardManager.openSoftwareManagement();
            }
        };
        
        window.closeSoftwareModal = function() {
            if (window.dashboardManager) {
                window.dashboardManager.closeSoftwareModal();
            }
        };
        
        window.showAddSoftwareForm = function() {
            if (window.dashboardManager) {
                window.dashboardManager.showAddSoftwareForm();
            }
        };
        
        window.hideSoftwareForm = function() {
            if (window.dashboardManager) {
                window.dashboardManager.hideSoftwareForm();
            }
        };
        
        window.printReport = function() {
            if (window.dashboardManager) {
                window.dashboardManager.printReport();
            }
        };
        
        window.sendReportByEmail = function() {
            if (window.dashboardManager) {
                window.dashboardManager.sendReportByEmail();
            }
        };
        
        window.closeDetailsModal = function() {
            if (window.dashboardManager) {
                window.dashboardManager.closeDetailsModal();
            }
        };
        
        window.closeEditModal = function() {
            if (window.dashboardManager) {
                window.dashboardManager.closeEditModal();
            }
        };
        
        window.validateReport = function() {
            if (window.dashboardManager) {
                window.dashboardManager.validateReport();
            }
        };
        
        window.editReport = function() {
            if (window.dashboardManager) {
                window.dashboardManager.editReport();
            }
        };
        
        window.deleteReport = function() {
            if (window.dashboardManager) {
                window.dashboardManager.deleteReport();
            }
        };
        
        window.confirmAction = function(confirmed) {
            if (window.dashboardManager) {
                window.dashboardManager.confirmAction(confirmed);
            }
        };
        
        window.logout = function() {
            if (window.dashboardManager) {
                window.dashboardManager.logout();
            }
        };