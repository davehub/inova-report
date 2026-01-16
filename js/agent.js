 // =================================================================
        // IMPORTATION DES MODULES FIREBASE
        // =================================================================
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { 
            getAuth, 
            onAuthStateChanged,
            signOut 
        } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
        import { 
            getFirestore, 
            collection, 
            getDocs, 
            doc, 
            getDoc,
            addDoc,
            updateDoc,
            query,
            where,
            orderBy,
            serverTimestamp 
        } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
        
        // =================================================================
        // CONFIGURATION FIREBASE
        // =================================================================
        const firebaseConfig = {
            apiKey: "AIzaSyAAMOp4EFP9wkI_UV1t7tsLs_CvoboFbaw",
            authDomain: "inovareport-14e72.firebaseapp.com",
            projectId: "inovareport-14e72",
            storageBucket: "inovareport-14e72.firebasestorage.app",
            messagingSenderId: "420806381491",
            appId: "1:420806381491:web:888c44dcdc0ecd34dc05c6",
            measurementId: "G-RD6WV65836"
        };
        
        // Initialiser Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
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
                                await signOut(auth);
                                if (callback) {
                                    callback({ success: false, error: 'Utilisateur non trouvé' });
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
            
            // Écouter les changements d'authentification
            onAuthStateChange(callback) {
                this.checkAuthState(callback);
            }
        }
        
        // =================================================================
        // CLASSE PRINCIPALE DASHBOARD MANAGER
        // =================================================================
        class DashboardManager {
            constructor() {
                this.authService = new AuthService();
                this.currentAgent = null;
                this.agentReports = [];
                this.currentReportDetails = null;
                this.currentEditingReportId = null;
                this.clientsList = [];
                this.softwareList = [];
                this.elements = {};
                this.indexCreationInProgress = false;
            }
    
            // =================================================================
            // MÉTHODES D'INITIALISATION
            // =================================================================
            async initialize() {
                this.initElements();
                this.initEventListeners();
                await this.checkAuthAndInitialize();
            }
    
            initElements() {
                this.elements = {
                    // Éléments d'authentification
                    agentName: document.getElementById('agentName'),
                    
                    // Tableau des rapports
                    agentReportsTableBody: document.getElementById('agentReportsTableBody'),
                    noAgentReports: document.getElementById('noAgentReports'),
                    loadingRow: document.getElementById('loadingRow'),
                    
                    // Statistiques
                    agentTotalReports: document.getElementById('agentTotalReports'),
                    agentWeekReports: document.getElementById('agentWeekReports'),
                    agentPendingReports: document.getElementById('agentPendingReports'),
                    
                    // Modals
                    reportModal: document.getElementById('reportModal'),
                    detailsModal: document.getElementById('detailsModal'),
                    modalBackdrop: document.getElementById('modalBackdrop'),
                    
                    // Formulaire de rapport
                    newReportForm: document.getElementById('newReportForm'),
                    modalTitle: document.getElementById('modalTitle'),
                    saveReportBtn: document.getElementById('saveReportBtn'),
                    
                    // Champs du formulaire
                    reportClientSelect: document.getElementById('reportClientSelect'),
                    reportSoftwareSelect: document.getElementById('reportSoftwareSelect'),
                    reportSite: document.getElementById('reportSite'),
                    reportObject: document.getElementById('reportObject'),
                    reportInterlocutor: document.getElementById('reportInterlocutor'),
                    reportContact: document.getElementById('reportContact'),
                    reportDate: document.getElementById('reportDate'),
                    reportInterventionType: document.getElementById('reportInterventionType'),
                    reportContract: document.getElementById('reportContract'),
                    reportDurationUnit: document.getElementById('reportDurationUnit'),
                    reportStatus: document.getElementById('reportStatus'),
                    
                    // Champs de durée
                    hourDurationFields: document.getElementById('hourDurationFields'),
                    dayDurationFields: document.getElementById('dayDurationFields'),
                    reportHourCount: document.getElementById('reportHourCount'),
                    reportDayCount: document.getElementById('reportDayCount'),
                    
                    // Détails du rapport
                    reportDetails: document.getElementById('reportDetails'),
                    editReportButton: document.getElementById('editReportButton'),
                    
                    // Impression
                    printSection: document.getElementById('printSection'),
                    printContent: document.getElementById('printContent'),
                    printDate: document.getElementById('printDate')
                };
            }
    
            initEventListeners() {
                // Événements clavier
                document.addEventListener('keydown', (event) => this.handleKeydown(event));
                
                // Événements de clic sur le backdrop
                this.elements.modalBackdrop?.addEventListener('click', () => {
                    this.closeReportModal();
                    this.closeDetailsModal();
                });
                
                // Après impression
                window.addEventListener('afterprint', () => {
                    this.elements.printSection?.classList.add('hidden');
                });
                
                // Initialiser les champs de durée
                setTimeout(() => {
                    this.toggleDurationFields();
                }, 100);
            }
    
            // =================================================================
            // AUTHENTIFICATION ET INITIALISATION
            // =================================================================
            async checkAuthAndInitialize() {
                try {
                    // Écouter les changements d'état d'authentification
                    this.authService.onAuthStateChange(async (result) => {
                        if (!result || !result.success || !result.user) {
                            console.log('Utilisateur non authentifié - Redirection vers login');
                            window.location.href = 'login.html';
                            return;
                        }
                        
                        const user = result.user;
                        
                        // Gestion des rôles après authentification réussie
                        if (user.role === 'responsable') {
                            // Rediriger les responsables vers leur dashboard
                            window.location.href = 'responsable-dashboard.html';
                            return;
                            
                        } else if (user.role === 'agent') {
                            // Initialiser le dashboard pour les agents
                            this.currentAgent = { 
                                uid: user.uid, 
                                name: user.fullName || 'Agent', 
                                role: user.role 
                            };
    
                            // Mettre à jour l'affichage du nom de l'agent
                            if (this.elements.agentName) {
                                this.elements.agentName.textContent = this.currentAgent.name;
                            }
    
                            // Initialiser le dashboard
                            await this.initializeDashboard();
                            
                        } else {
                            // Gérer les rôles inconnus ou non autorisés
                            console.warn("Rôle inconnu détecté:", user.role);
                            await this.authService.logout();
                            this.showNotification("Rôle utilisateur non valide", "error");
                            setTimeout(() => window.location.href = 'login.html', 2000);
                        }
                    });
                    
                } catch (error) {
                    // Gestion des erreurs globales
                    console.error("Erreur dans le processus d'authentification:", error);
                    this.showNotification("Erreur d'authentification", "error");
                    setTimeout(() => window.location.href = 'login.html', 2000);
                }
            }
            
            async initializeDashboard() {
                try {
                    this.showLoadingState();
                    
                    // Chargement parallèle
                    await Promise.all([
                        this.loadClients(),
                        this.loadSoftware()
                    ]);
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.loadAgentReportsWithoutIndex();
                    this.hideLoadingState();
                    
                } catch (error) {
                    console.error('Erreur d\'initialisation:', error);
                    this.showNotification('Erreur lors du chargement du dashboard', 'error');
                    this.hideLoadingState();
                }
            }
    
            // =================================================================
            // FONCTIONS UTILITAIRES
            // =================================================================
            normalizeStatus(status) {
                if (!status) return 'En Cours';
                const statusMap = {
                    'en cours': 'En Cours',
                    'termine': 'Terminé', 
                    'terminee': 'Terminé',
                    'annule': 'Annulé',
                    'annulee': 'Annulé'
                };
                const lowerStatus = status.toLowerCase();
                return statusMap[lowerStatus] || status;
            }
    
            getStatusClass(status) {
                if (!status) return 'bg-gray-100 text-gray-800';
                
                const normalized = status.toLowerCase().trim();
                switch(normalized) {
                    case 'terminé':
                    case 'termine':
                    case 'validé':
                    case 'valide':
                        return 'bg-green-100 text-green-800';
                    case 'en cours':
                        return 'bg-blue-100 text-blue-800';
                    case 'en attente':
                    case 'pending':
                        return 'bg-orange-100 text-orange-800';
                    case 'annulé':
                    case 'annule':
                        return 'bg-red-100 text-red-800';
                    default:
                        return 'bg-gray-100 text-gray-800';
                }
            }
    
            formatFirebaseTimestamp(timestamp) {
                if (!timestamp) return 'Date inconnue';
                
                try {
                    if (timestamp.toDate) {
                        return timestamp.toDate().toLocaleString('fr-FR');
                    } else if (timestamp instanceof Date) {
                        return timestamp.toLocaleString('fr-FR');
                    } else if (typeof timestamp === 'string') {
                        return new Date(timestamp).toLocaleString('fr-FR');
                    }
                    return 'Date inconnue';
                } catch (error) {
                    console.error('Erreur formatage date:', error);
                    return 'Date inconnue';
                }
            }
    
            showNotification(message, type = 'info') {
                // Supprimer les notifications existantes
                document.querySelectorAll('.notification').forEach(n => n.remove());
                
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
                    notification.classList.add('opacity-0');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 3000);
            }
    
            showLoadingState() {
                if (this.elements.loadingRow) {
                    this.elements.loadingRow.classList.remove('hidden');
                }
                if (this.elements.noAgentReports) {
                    this.elements.noAgentReports.classList.add('hidden');
                }
            }
    
            hideLoadingState() {
                if (this.elements.loadingRow) {
                    this.elements.loadingRow.classList.add('hidden');
                }
            }
    
            // =================================================================
            // CHARGEMENT DES DONNÉES
            // =================================================================
            async loadClients() {
                try {
                    // Afficher un indicateur de chargement
                    if (this.elements.reportClientSelect) {
                        this.elements.reportClientSelect.innerHTML = '<option value="">Chargement des clients...</option>';
                        this.elements.reportClientSelect.disabled = true;
                    }
                    
                    // Récupérer les clients depuis Firestore
                    const querySnapshot = await getDocs(collection(db, 'clients'));
                    this.clientsList = [];
                    
                    // Réinitialiser la liste déroulante
                    if (this.elements.reportClientSelect) {
                        this.elements.reportClientSelect.innerHTML = '<option value="">Sélectionnez un client</option>';
                    }
                    
                    // Traiter chaque document
                    querySnapshot.forEach((doc) => {
                        const clientData = doc.data();
                        const client = { 
                            id: doc.id, 
                            ...clientData,
                            // Assurer que les champs essentiels existent avec des valeurs par défaut
                            name: clientData.name || 'Client sans nom',
                            company: clientData.company || '',
                            email: clientData.email || '',
                            phone: clientData.phone || '',
                            address: clientData.address || ''
                        };
                        
                        this.clientsList.push(client);
                        
                        // Ajouter l'option au select
                        if (this.elements.reportClientSelect) {
                            const option = document.createElement('option');
                            option.value = client.id; // Utiliser l'ID unique comme valeur
                            
                            // Afficher plus d'informations pour une meilleure identification
                            let displayText = client.name;
                            if (client.company) {
                                displayText += ` - ${client.company}`;
                            }
                            if (client.email) {
                                displayText += ` (${client.email})`;
                            }
                            
                            option.textContent = displayText;
                            option.dataset.client = JSON.stringify(client);
                            this.elements.reportClientSelect.appendChild(option);
                        }
                    });
                    
                    // Trier les clients par nom (ordre alphabétique)
                    this.clientsList.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Trier également les options dans le select
                    if (this.elements.reportClientSelect) {
                        const options = Array.from(this.elements.reportClientSelect.options);
                        const defaultOption = options.shift(); // Garder l'option par défaut
                        
                        options.sort((a, b) => a.textContent.localeCompare(b.textContent));
                        
                        this.elements.reportClientSelect.innerHTML = '';
                        if (defaultOption) {
                            this.elements.reportClientSelect.appendChild(defaultOption);
                        }
                        options.forEach(option => this.elements.reportClientSelect.appendChild(option));
                    }
                    
                    // Gestion du cas "aucun client"
                    if (this.clientsList.length === 0) {
                        if (this.elements.reportClientSelect) {
                            this.elements.reportClientSelect.innerHTML = '<option value="">Aucun client disponible</option>';
                            this.elements.reportClientSelect.disabled = true;
                        }
                        this.showNotification('Aucun client trouvé dans la base de données', 'info');
                    } else {
                        if (this.elements.reportClientSelect) {
                            this.elements.reportClientSelect.disabled = false;
                        }
                        console.log(`${this.clientsList.length} clients chargés avec succès`);
                    }
                    
                } catch (error) {
                    console.error('Erreur de chargement des clients:', error);
                    
                    // Réinitialiser en cas d'erreur
                    this.clientsList = [];
                    
                    if (this.elements.reportClientSelect) {
                        this.elements.reportClientSelect.innerHTML = '<option value="">Erreur de chargement</option>';
                        this.elements.reportClientSelect.disabled = true;
                    }
                    
                    this.showNotification('Erreur de chargement des clients. Veuillez réessayer.', 'error');
                }
            }
            
            async loadSoftware() {
                try {
                    // Afficher un indicateur de chargement
                    if (this.elements.reportSoftwareSelect) {
                        this.elements.reportSoftwareSelect.innerHTML = '<option value="">Chargement des logiciels...</option>';
                        this.elements.reportSoftwareSelect.disabled = true;
                    }
                    
                    // Récupérer les logiciels depuis Firestore
                    const querySnapshot = await getDocs(collection(db, 'software'));
                    this.softwareList = [];
                    
                    // Réinitialiser la liste déroulante
                    if (this.elements.reportSoftwareSelect) {
                        this.elements.reportSoftwareSelect.innerHTML = '<option value="">Sélectionnez le logiciel</option>';
                    }
                    
                    // Traiter chaque document
                    querySnapshot.forEach((doc) => {
                        const softwareData = doc.data();
                        const software = { 
                            id: doc.id, 
                            ...softwareData,
                            // Assurer que les champs essentiels existent avec des valeurs par défaut
                            name: softwareData.name || 'Logiciel sans nom',
                            version: softwareData.version || '',
                            category: softwareData.category || 'Non catégorisé',
                            publisher: softwareData.publisher || '',
                            description: softwareData.description || '',
                            licenseType: softwareData.licenseType || 'Standard',
                            isActive: softwareData.isActive !== undefined ? softwareData.isActive : true
                        };
                        
                        this.softwareList.push(software);
                        
                        // Ajouter l'option au select
                        if (this.elements.reportSoftwareSelect) {
                            const option = document.createElement('option');
                            option.value = software.id; // Utiliser l'ID unique comme valeur
                            
                            // Afficher plus d'informations pour une meilleure identification
                            let displayText = software.name;
                            if (software.version) {
                                displayText += ` v${software.version}`;
                            }
                            if (software.category && software.category !== 'Non catégorisé') {
                                displayText += ` (${software.category})`;
                            }
                            
                            option.textContent = displayText;
                            option.dataset.software = JSON.stringify(software);
                            
                            // Désactiver les logiciels inactifs
                            if (!software.isActive) {
                                option.disabled = true;
                                option.textContent += ' [Inactif]';
                            }
                            
                            this.elements.reportSoftwareSelect.appendChild(option);
                        }
                    });
                    
                    // Trier les logiciels par nom (ordre alphabétique)
                    this.softwareList.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Trier également les options dans le select
                    if (this.elements.reportSoftwareSelect) {
                        const options = Array.from(this.elements.reportSoftwareSelect.options);
                        const defaultOption = options.shift(); // Garder l'option par défaut
                        
                        options.sort((a, b) => {
                            // Trier d'abord par statut (actifs en premier), puis par nom
                            const aActive = a.disabled ? 1 : 0;
                            const bActive = b.disabled ? 1 : 0;
                            if (aActive !== bActive) return aActive - bActive;
                            return a.textContent.localeCompare(b.textContent);
                        });
                        
                        this.elements.reportSoftwareSelect.innerHTML = '';
                        if (defaultOption) {
                            this.elements.reportSoftwareSelect.appendChild(defaultOption);
                        }
                        options.forEach(option => this.elements.reportSoftwareSelect.appendChild(option));
                    }
                    
                    // Gestion du cas "aucun logiciel"
                    if (this.softwareList.length === 0) {
                        if (this.elements.reportSoftwareSelect) {
                            this.elements.reportSoftwareSelect.innerHTML = '<option value="">Aucun logiciel disponible</option>';
                            this.elements.reportSoftwareSelect.disabled = true;
                        }
                        this.showNotification('Aucun logiciel trouvé dans la base de données', 'info');
                    } else {
                        if (this.elements.reportSoftwareSelect) {
                            this.elements.reportSoftwareSelect.disabled = false;
                        }
                        console.log(`${this.softwareList.length} logiciels chargés`);
                    }
                    
                } catch (error) {
                    console.error('Erreur de chargement des logiciels:', error);
                    
                    // Réinitialiser en cas d'erreur
                    this.softwareList = [];
                    
                    if (this.elements.reportSoftwareSelect) {
                        this.elements.reportSoftwareSelect.innerHTML = '<option value="">Erreur de chargement</option>';
                        this.elements.reportSoftwareSelect.disabled = true;
                    }
                    
                    this.showNotification('Erreur de chargement des logiciels. Veuillez réessayer.', 'error');
                }
            }
            
            // =================================================================
            // MÉTHODES MANQUANTES AJOUTÉES
            // =================================================================
            
            // Méthode pour charger les rapports sans index (méthode alternative)
            async loadAgentReportsWithoutIndex() {
                try {
                    if (!this.currentAgent?.uid) return;
                    
                    console.log('Chargement des rapports (méthode sans index) pour:', this.currentAgent.uid);
                    
                    // Charger tous les rapports puis filtrer côté client
                    const querySnapshot = await getDocs(collection(db, 'reports'));
                    
                    this.agentReports = [];
                    let pendingCount = 0;
                    let weekCount = 0;
    
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        // Filtrer côté client par agent UID
                        if (data.agentUid === this.currentAgent.uid) {
                            const report = { 
                                id: doc.id, 
                                ...data,
                                isValidated: data.isValidated || false,
                                canEdit: data.canEdit !== undefined ? data.canEdit : true
                            };
                            this.agentReports.push(report);
                            
                            if (report.status === 'En Cours') {
                                pendingCount++;
                            }
                            
                            const reportDate = new Date(report.date || report.createdAt?.toDate?.() || new Date());
                            if (reportDate >= oneWeekAgo) {
                                weekCount++;
                            }
                        }
                    });
                    
                    // Trier par date (plus récent en premier)
                    this.agentReports.sort((a, b) => {
                        const dateA = new Date(a.date || a.createdAt?.toDate?.() || 0);
                        const dateB = new Date(b.date || b.createdAt?.toDate?.() || 0);
                        return dateB - dateA;
                    });
                    
                    this.displayAgentReports();
                    this.updateAgentStatistics(pendingCount, weekCount);
                    console.log(`${this.agentReports.length} rapport(s) chargé(s) avec filtrage côté client`);
    
                } catch (error) {
                    console.error('Erreur de chargement des rapports (sans index):', error);
                    this.showNotification('Erreur lors du chargement des rapports', 'error');
                    if (this.elements.noAgentReports) {
                        this.elements.noAgentReports.classList.remove('hidden');
                    }
                }
            }
            
            // Méthode pour formater la date du rapport
            formatReportDate(report) {
                if (!report) return 'N/A';
                
                try {
                    if (report.date) {
                        const dateObj = new Date(report.date);
                        return dateObj.toLocaleDateString('fr-FR');
                    } else if (report.createdAt?.toDate) {
                        return report.createdAt.toDate().toLocaleDateString('fr-FR');
                    } else if (typeof report.createdAt === 'string') {
                        return new Date(report.createdAt).toLocaleDateString('fr-FR');
                    }
                    return 'N/A';
                } catch (error) {
                    console.error('Erreur de formatage de date:', error);
                    return 'N/A';
                }
            }
            
            // Méthode pour obtenir les informations de statut
            getStatusInfo(report) {
                if (!report) return { class: '', text: 'N/A' };
                
                let statusText = report.status || 'N/A';
                let statusClass = this.getStatusClass(statusText);
                
                // Si le rapport est validé, afficher "Validé" au lieu du statut original
                if (report.isValidated) {
                    statusText = 'Validé';
                    statusClass = 'bg-green-100 text-green-800';
                }
                
                return {
                    text: statusText,
                    class: statusClass
                };
            }
            
            // Méthode pour mettre à jour les statistiques
            updateAgentStatistics(pendingCount, weekCount) {
                if (this.elements.agentTotalReports) {
                    this.elements.agentTotalReports.textContent = this.agentReports.length;
                }
                
                if (this.elements.agentWeekReports) {
                    this.elements.agentWeekReports.textContent = weekCount;
                }
                
                if (this.elements.agentPendingReports) {
                    this.elements.agentPendingReports.textContent = pendingCount;
                }
            }
            
            // Méthode pour basculer l'affichage du message "aucune donnée"
            toggleNoDataMessage(show) {
                if (!this.elements.agentReportsTableBody || !this.elements.noAgentReports) return;
                
                if (show) {
                    this.elements.agentReportsTableBody.innerHTML = '';
                    this.elements.noAgentReports.classList.remove('hidden');
                } else {
                    this.elements.noAgentReports.classList.add('hidden');
                }
            }
            
            // =================================================================
            // AFFICHAGE DES RAPPORTS
            // =================================================================
            displayAgentReports() {
                if (!this.elements.agentReportsTableBody) return;
                
                // Sécurité : fonction d'échappement
                const escape = (str) => {
                    if (str == null) return 'N/A';
                    const div = document.createElement('div');
                    div.textContent = str;
                    return div.innerHTML;
                };
                
                // Vider le tableau
                this.elements.agentReportsTableBody.innerHTML = '';
                
                // Gérer état vide
                if (this.agentReports.length === 0) {
                    this.toggleNoDataMessage(true);
                    return;
                }
                
                this.toggleNoDataMessage(false);
                
                // Créer les lignes de manière sécurisée
                const fragment = document.createDocumentFragment();
                
                this.agentReports.forEach(report => {
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-gray-50 transition-colors duration-150';
                    row.dataset.reportId = report.id;
                    
                    // Formater la date
                    const formattedDate = this.formatReportDate(report);
                    
                    // Obtenir les infos du statut
                    const statusInfo = this.getStatusInfo(report);
                    
                    // Créer le contenu de la ligne
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${escape(formattedDate)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">
                                ${escape(report.clientName)}
                            </div>
                            <div class="text-sm text-gray-500">
                                ${escape(report.site)}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                ${escape(report.interventionType || report.type)}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${escape(report.duration)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.class}">
                                ${escape(statusInfo.text)}
                                ${report.isValidated ? 
                                    '<span class="validation-badge bg-white text-green-800 ml-1">✓</span>' : 
                                    ''}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                            <div class="flex space-x-2 justify-end">
                                <button class="view-btn text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded hover:bg-indigo-50" title="Voir les détails">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="print-btn text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50" title="Imprimer">
                                    <i class="fas fa-print"></i>
                                </button>
                                <button class="email-btn text-green-600 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50" title="Envoyer par email">
                                    <i class="fas fa-envelope"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    
                    // Ajouter les événements aux boutons
                    const viewBtn = row.querySelector('.view-btn');
                    const printBtn = row.querySelector('.print-btn');
                    const emailBtn = row.querySelector('.email-btn');
                    
                    if (viewBtn) {
                        viewBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.viewReportDetails(report.id);
                        });
                    }
                    
                    if (printBtn) {
                        printBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.printReport(report.id);
                        });
                    }
                    
                    if (emailBtn) {
                        emailBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.sendReportEmail(report.id);
                        });
                    }
                    
                    fragment.appendChild(row);
                });
                
                this.elements.agentReportsTableBody.appendChild(fragment);
            }
    
            // =================================================================
            // GESTION DE LA DURÉE
            // =================================================================
            toggleDurationFields() {
                if (!this.elements.reportDurationUnit || !this.elements.hourDurationFields || !this.elements.dayDurationFields) return;
                
                const durationUnit = this.elements.reportDurationUnit.value;
                
                this.elements.hourDurationFields.classList.add('hidden');
                this.elements.dayDurationFields.classList.add('hidden');
                
                if (durationUnit === 'Heure') {
                    this.elements.hourDurationFields.classList.remove('hidden');
                } else if (durationUnit === 'Jour') {
                    this.elements.dayDurationFields.classList.remove('hidden');
                }
            }
    
            // =================================================================
            // GESTION DES MODALS
            // =================================================================
            openReportModal() {
                if (!this.elements.newReportForm || !this.elements.reportModal) return;
                
                this.elements.newReportForm.reset();
                
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                this.elements.reportDate.value = today;
                this.elements.reportStatus.value = 'En Cours';
                this.elements.reportContract.value = 'OUI';
                
                this.currentEditingReportId = null;
                this.elements.modalTitle.textContent = 'Créer un Nouveau Rapport d\'Intervention';
                
                this.toggleDurationFields();
                
                this.elements.reportModal.classList.remove('hidden');
                this.elements.modalBackdrop.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
    
            closeReportModal() {
                this.elements.reportModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
    
            // =================================================================
            // MÉTHODES COMPLÉTÉES POUR SUBMITREPORT
            // =================================================================
            async submitReport() {
                const saveBtn = this.elements.saveReportBtn;
                if (!saveBtn) return;
                
                // État loading
                this.setButtonLoading(saveBtn, true, 'Enregistrement...');
                
                try {
                    // Validation améliorée
                    if (!this.validateReportForm()) {
                        this.setButtonLoading(saveBtn, false);
                        return;
                    }
                    
                    // Construction sécurisée des données
                    const formData = this.buildReportData();
                    
                    // Sauvegarde (optimiste + Firebase)
                    await this.saveReportData(formData);
                    
                    // Notification et fermeture
                    this.showNotification(
                        this.currentEditingReportId ? 
                        'Rapport modifié avec succès' : 
                        'Rapport créé avec succès', 
                        'success'
                    );
                    
                    this.closeReportModal();
                    
                } catch (error) {
                    this.handleReportError(error);
                } finally {
                    this.setButtonLoading(saveBtn, false, '<i class="fas fa-save mr-2"></i>Enregistrer');
                }
            }
            
            // Méthode de validation du formulaire
            validateReportForm() {
                const requiredFields = [
                    { id: 'reportClientSelect', name: 'Client' },
                    { id: 'reportInterlocutor', name: 'Interlocuteur' },
                    { id: 'reportContact', name: 'Contact' },
                    { id: 'reportDate', name: 'Date d\'intervention' },
                    { id: 'reportSite', name: 'Site géographique' },
                    { id: 'reportSoftwareSelect', name: 'Logiciel' },
                    { id: 'reportInterventionType', name: 'Type d\'intervention' },
                    { id: 'reportContract', name: 'Sous contrat' },
                    { id: 'reportDurationUnit', name: 'Unité de mesure' },
                    { id: 'reportStatus', name: 'Statut' },
                    { id: 'reportObject', name: 'Objet de mission' }
                ];
                
                for (const field of requiredFields) {
                    const element = document.getElementById(field.id);
                    if (!element || !element.value.trim()) {
                        this.showNotification(`Le champ "${field.name}" est obligatoire`, 'error');
                        element?.focus();
                        return false;
                    }
                }
                
                // Validation spécifique pour la durée
                const durationUnit = this.elements.reportDurationUnit.value;
                if (durationUnit === 'Heure') {
                    const hourCount = parseFloat(this.elements.reportHourCount.value);
                    if (isNaN(hourCount) || hourCount <= 0) {
                        this.showNotification('Le nombre d\'heures doit être supérieur à 0', 'error');
                        this.elements.reportHourCount.focus();
                        return false;
                    }
                } else if (durationUnit === 'Jour') {
                    const dayCount = parseFloat(this.elements.reportDayCount.value);
                    if (isNaN(dayCount) || dayCount <= 0) {
                        this.showNotification('Le nombre de jours doit être supérieur à 0', 'error');
                        this.elements.reportDayCount.focus();
                        return false;
                    }
                }
                
                return true;
            }
            
            // Méthode pour construire les données du rapport
            buildReportData() {
                const durationUnit = this.elements.reportDurationUnit.value;
                let duration = '';
                let hourCount = null;
                let dayCount = null;
                
                if (durationUnit === 'Heure') {
                    const hours = parseFloat(this.elements.reportHourCount.value);
                    hourCount = hours;
                    duration = `${hours} heure${hours > 1 ? 's' : ''}`;
                } else if (durationUnit === 'Jour') {
                    const days = parseFloat(this.elements.reportDayCount.value);
                    dayCount = days;
                    duration = `${days} jour${days > 1 ? 's' : ''}`;
                }
                
                // Récupérer les informations client et logiciel sélectionnées
                const clientSelect = this.elements.reportClientSelect;
                const softwareSelect = this.elements.reportSoftwareSelect;
                
                const selectedClient = this.clientsList.find(c => c.id === clientSelect.value);
                const selectedSoftware = this.softwareList.find(s => s.id === softwareSelect.value);
                
                return {
                    // Informations de base
                    agentUid: this.currentAgent.uid,
                    agentName: this.currentAgent.name,
                    date: this.elements.reportDate.value,
                    status: this.elements.reportStatus.value,
                    
                    // Informations client
                    clientId: clientSelect.value,
                    clientName: selectedClient?.name || clientSelect.options[clientSelect.selectedIndex]?.text || 'Client inconnu',
                    interlocutor: this.elements.reportInterlocutor.value.trim(),
                    contact: this.elements.reportContact.value.trim(),
                    site: this.elements.reportSite.value.trim(),
                    
                    // Détails de l'intervention
                    softwareId: softwareSelect.value,
                    software: selectedSoftware?.name || softwareSelect.options[softwareSelect.selectedIndex]?.text || 'Logiciel inconnu',
                    interventionType: this.elements.reportInterventionType.value,
                    contract: this.elements.reportContract.value,
                    
                    // Durée
                    durationUnit: durationUnit,
                    hourCount: hourCount,
                    dayCount: dayCount,
                    duration: duration,
                    
                    // Description
                    object: this.elements.reportObject.value.trim(),
                    
                    // Métadonnées
                    isValidated: false,
                    canEdit: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
            }
            
            // Méthode pour sauvegarder les données
            async saveReportData(formData) {
                if (this.currentEditingReportId) {
                    // Mise à jour d'un rapport existant
                    const reportRef = doc(db, 'reports', this.currentEditingReportId);
                    await updateDoc(reportRef, {
                        ...formData,
                        updatedAt: serverTimestamp()
                    });
                } else {
                    // Création d'un nouveau rapport
                    await addDoc(collection(db, 'reports'), formData);
                }
                
                // Recharger les rapports après sauvegarde
                await this.loadAgentReportsWithoutIndex();
            }
            
            // Méthode pour gérer les erreurs
            handleReportError(error) {
                console.error('Erreur lors de la sauvegarde du rapport:', error);
                
                let errorMessage = 'Erreur lors de la sauvegarde du rapport';
                
                if (error.code === 'permission-denied') {
                    errorMessage = 'Vous n\'avez pas la permission de sauvegarder ce rapport';
                } else if (error.code === 'unavailable') {
                    errorMessage = 'Problème de connexion. Veuillez vérifier votre connexion internet';
                }
                
                this.showNotification(errorMessage, 'error');
            }
            
            // Méthode utilitaire pour gérer l'état du bouton
            setButtonLoading(button, isLoading, text = '') {
                if (!button) return;
                
                if (isLoading) {
                    button.disabled = true;
                    button.classList.add('btn-loading');
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>' + text;
                } else {
                    button.disabled = false;
                    button.classList.remove('btn-loading');
                    button.innerHTML = text;
                }
            }
    
            // =================================================================
            // DÉTAILS DU RAPPORT
            // =================================================================
            viewReportDetails(reportId) {
                const report = this.agentReports.find(r => r.id === reportId);
                if (!report) {
                    this.showNotification('Rapport non trouvé', 'error');
                    return;
                }
        
                this.currentReportDetails = report;
                
                if (this.elements.editReportButton) {
                    if (report.isValidated || !report.canEdit) {
                        this.elements.editReportButton.style.display = 'none';
                    } else {
                        this.elements.editReportButton.style.display = 'block';
                    }
                }
                
                const formattedDate = report.date ? new Date(report.date).toLocaleDateString('fr-FR') : 'Non spécifiée';
                const createdAt = this.formatFirebaseTimestamp(report.createdAt);
                const updatedAt = this.formatFirebaseTimestamp(report.updatedAt);
                const validatedAt = this.formatFirebaseTimestamp(report.validatedAt);
                
                if (this.elements.reportDetails) {
                    this.elements.reportDetails.innerHTML = `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div class="space-y-4">
                                <div class="bg-blue-50 p-4 rounded-lg">
                                    <h4 class="font-bold text-blue-800 mb-2 flex items-center">
                                        <i class="fas fa-user-tie mr-2"></i>Informations Agent
                                    </h4>
                                    <p><strong>Nom:</strong> ${report.agentName || 'N/A'}</p>
                                    <p><strong>Date intervention:</strong> ${formattedDate}</p>
                                    <p><strong>Durée:</strong> ${report.duration || 'N/A'}</p>
                                </div>
                                <div class="bg-green-50 p-4 rounded-lg">
                                    <h4 class="font-bold text-green-800 mb-2 flex items-center">
                                        <i class="fas fa-building mr-2"></i>Informations Client
                                    </h4>
                                    <p><strong>Client:</strong> ${report.clientName || 'N/A'}</p>
                                    <p><strong>Site:</strong> ${report.site || 'Non spécifié'}</p>
                                    <p><strong>Interlocuteur:</strong> ${report.interlocutor || 'Non spécifié'}</p>
                                    <p><strong>Contact:</strong> ${report.contact || 'Non spécifié'}</p>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div class="bg-purple-50 p-4 rounded-lg">
                                    <h4 class="font-bold text-purple-800 mb-2 flex items-center">
                                        <i class="fas fa-tools mr-2"></i>Détails Intervention
                                    </h4>
                                    <p><strong>Logiciel:</strong> ${report.software || 'N/A'}</p>
                                    <p><strong>Type:</strong> ${report.interventionType || report.type || 'N/A'}</p>
                                    <p><strong>Sous contrat:</strong> ${report.contract || 'N/A'}</p>
                                    <p><strong>Statut:</strong> 
                                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(report.status)}">
                                            ${report.isValidated ? 'Validé' : report.status || 'N/A'}
                                            ${report.isValidated ? '<span class="validation-badge bg-white text-green-800 ml-1"><i class="fas fa-check"></i></span>' : ''}
                                        </span>
                                    </p>
                                    ${report.isValidated ? `
                                    <p class="text-sm text-green-600 mt-2">
                                        <i class="fas fa-lock mr-1"></i>Ce rapport a été validé et ne peut plus être modifié
                                    </p>
                                    ` : ''}
                                </div>
                                <div class="bg-orange-50 p-4 rounded-lg">
                                    <h4 class="font-bold text-orange-800 mb-2 flex items-center">
                                        <i class="fas fa-clock mr-2"></i>Durée
                                    </h4>
                                    ${report.durationUnit === 'Heure' ? `
                                        <p><strong>Nombre d'heures:</strong> ${report.hourCount || '0'}</p>
                                    ` : report.durationUnit === 'Jour' ? `
                                        <p><strong>Nombre de jours:</strong> ${report.dayCount || '0'}</p>
                                    ` : ''}
                                    <p><strong>Durée totale:</strong> ${report.duration || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-bold text-gray-800 mb-2 flex items-center">
                                <i class="fas fa-file-alt mr-2"></i>Objet de la mission
                            </h4>
                            <div class="whitespace-pre-wrap bg-white p-4 rounded border border-gray-200 min-h-[100px]">
                                ${report.object || 'Aucune description fournie'}
                            </div>
                        </div>
                        <div class="mt-6 text-sm text-gray-500 text-center border-t pt-4">
                            <p>Rapport créé le ${createdAt}</p>
                            ${updatedAt !== 'Date inconnue' && updatedAt !== createdAt ? `<p>Dernière modification le ${updatedAt}</p>` : ''}
                            ${report.isValidated && validatedAt !== 'Date inconnue' ? `<p class="text-green-600">Validé le ${validatedAt}</p>` : ''}
                        </div>
                    `;
                }
                
                this.elements.detailsModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
    
            closeDetailsModal() {
                this.elements.detailsModal?.classList.add('hidden');
                this.elements.modalBackdrop?.classList.add('hidden');
                document.body.style.overflow = 'auto';
                this.currentReportDetails = null;
            }
    
            editCurrentReport() {
                if (!this.currentReportDetails) {
                    this.showNotification('Aucun rapport sélectionné', 'error');
                    return;
                }
                
                if (this.currentReportDetails.isValidated || !this.currentReportDetails.canEdit) {
                    this.showNotification('Ce rapport a été validé et ne peut plus être modifié', 'error');
                    return;
                }
        
                // Remplir le formulaire avec les données du rapport
                this.elements.reportClientSelect.value = this.currentReportDetails.clientId || '';
                this.elements.reportInterlocutor.value = this.currentReportDetails.interlocutor || '';
                this.elements.reportContact.value = this.currentReportDetails.contact || '';
                this.elements.reportDate.value = this.currentReportDetails.date || '';
                this.elements.reportSite.value = this.currentReportDetails.site || '';
                this.elements.reportSoftwareSelect.value = this.currentReportDetails.softwareId || '';
                this.elements.reportInterventionType.value = this.currentReportDetails.interventionType || this.currentReportDetails.type || '';
                this.elements.reportContract.value = this.currentReportDetails.contract || '';
                this.elements.reportDurationUnit.value = this.currentReportDetails.durationUnit || '';
                this.elements.reportStatus.value = this.currentReportDetails.status || '';
                this.elements.reportObject.value = this.currentReportDetails.object || '';
        
                if (this.currentReportDetails.durationUnit === 'Heure') {
                    this.elements.reportHourCount.value = this.currentReportDetails.hourCount || '';
                } else if (this.currentReportDetails.durationUnit === 'Jour') {
                    this.elements.reportDayCount.value = this.currentReportDetails.dayCount || '';
                }
                
                this.toggleDurationFields();
                this.currentEditingReportId = this.currentReportDetails.id;
                this.elements.modalTitle.textContent = 'Modifier le Rapport d\'Intervention';
        
                this.closeDetailsModal();
                this.elements.reportModal?.classList.remove('hidden');
                this.elements.modalBackdrop?.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
    
            // =================================================================
            // IMPRESSION ET EMAIL
            // =================================================================
            printReport(reportId) {
                const report = this.agentReports.find(r => r.id === reportId);
                if (!report) {
                    this.showNotification('Rapport non trouvé', 'error');
                    return;
                }
        
                this.currentReportDetails = report;
                this.preparePrintContent();
                window.print();
            }
    
            printCurrentReport() {
                if (!this.currentReportDetails) {
                    this.showNotification('Aucun rapport à imprimer', 'error');
                    return;
                }
                this.preparePrintContent();
                window.print();
            }
    
            preparePrintContent() {
                if (!this.currentReportDetails) return;
        
                const report = this.currentReportDetails;
                
                if (this.elements.printDate) {
                    this.elements.printDate.textContent = new Date().toLocaleDateString('fr-FR');
                }
                
                const formattedDate = report.date ? new Date(report.date).toLocaleDateString('fr-FR') : 'Non spécifiée';
                const createdAt = this.formatFirebaseTimestamp(report.createdAt);
                
                if (this.elements.printContent) {
                    this.elements.printContent.innerHTML = `
                        <div class="mb-8">
                            <h3 class="text-2xl font-bold text-gray-800 mb-4">Rapport d'Intervention</h3>
                            
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="border-b pb-2">
                                    <strong>Agent:</strong> ${report.agentName || 'N/A'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Date:</strong> ${formattedDate}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Client:</strong> ${report.clientName || 'N/A'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Site:</strong> ${report.site || 'Non spécifié'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Interlocuteur:</strong> ${report.interlocutor || 'Non spécifié'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Contact:</strong> ${report.contact || 'Non spécifié'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Logiciel:</strong> ${report.software || 'N/A'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Type:</strong> ${report.interventionType || report.type || 'N/A'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Durée:</strong> ${report.duration || 'N/A'}
                                </div>
                                <div class="border-b pb-2">
                                    <strong>Statut:</strong> ${report.isValidated ? 'Validé' : report.status || 'N/A'}
                                </div>
                            </div>
                            
                            ${report.durationUnit === 'Heure' ? `
                            <div class="mb-6">
                                <h4 class="text-lg font-semibold mb-2">Détails de la durée</h4>
                                <p><strong>Nombre d'heures:</strong> ${report.hourCount || '0'}</p>
                            </div>
                            ` : report.durationUnit === 'Jour' ? `
                            <div class="mb-6">
                                <h4 class="text-lg font-semibold mb-2">Détails de la durée</h4>
                                <p><strong>Nombre de jours:</strong> ${report.dayCount || '0'}</p>
                            </div>
                            ` : ''}
                            
                            <div class="mb-6">
                                <h4 class="text-lg font-semibold mb-2">Objet de la mission</h4>
                                <div class="whitespace-pre-wrap border border-gray-300 p-4 rounded bg-gray-50">
                                    ${report.object || 'Aucune description fournie'}
                                </div>
                            </div>
                            
                            ${report.isValidated ? `
                            <div class="bg-green-50 p-4 rounded border border-green-200 mb-6">
                                <p class="text-green-800 font-semibold">
                                    <i class="fas fa-check-circle mr-2"></i>Rapport validé
                                </p>
                            </div>
                            ` : ''}
                            
                            <div class="text-sm text-gray-500 mt-8 border-t pt-4">
                                <p>Créé le ${createdAt}</p>
                                <p class="mt-2">Document généré automatiquement par InovaReport</p>
                            </div>
                        </div>
                    `;
                }
                
                this.elements.printSection?.classList.remove('hidden');
            }
    
            sendReportEmail(reportId) {
                const report = this.agentReports.find(r => r.id === reportId);
                if (!report) {
                    this.showNotification('Rapport non trouvé', 'error');
                    return;
                }
        
                const subject = `Rapport d'intervention - ${report.clientName || 'Client'} - ${report.date ? new Date(report.date).toLocaleDateString('fr-FR') : 'Date inconnue'}`;
                const body = `
        Bonjour,
        
        Veuillez trouver ci-joint le rapport d'intervention technique.
        
        Client: ${report.clientName || 'N/A'}
        Date: ${report.date ? new Date(report.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
        Agent: ${report.agentName || 'N/A'}
        Type: ${report.interventionType || report.type || 'N/A'}
        Durée: ${report.duration || 'N/A'}
        Statut: ${report.isValidated ? 'Validé' : report.status || 'N/A'}
        
        Objet de la mission:
        ${report.object || 'Aucune description fournie'}
        
        Cordialement,
        ${report.agentName || 'L\'équipe InovaReport'}
                `.trim();
        
                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(mailtoLink, '_blank');
            }
    
            sendReportByEmail() {
                if (!this.currentReportDetails) {
                    this.showNotification('Aucun rapport à envoyer', 'error');
                    return;
                }
                this.sendReportEmail(this.currentReportDetails.id);
            }
    
            // =================================================================
            // GESTION DES ÉVÉNEMENTS
            // =================================================================
            handleKeydown(event) {
                if (event.key === 'Escape') {
                    this.closeReportModal();
                    this.closeDetailsModal();
                }
            }
    
            // =================================================================
            // DÉCONNEXION
            // =================================================================
            async logout() {
                try {
                    await this.authService.logout();
                } catch (error) {
                    console.error("Erreur de déconnexion:", error);
                    this.showNotification('Erreur lors de la déconnexion', 'error');
                }
            }
        }
        
        // =================================================================
        // INITIALISATION DE L'APPLICATION
        // =================================================================
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                // Créer l'instance du dashboard
                const dashboardManager = new DashboardManager();
                
                // Initialiser le dashboard
                await dashboardManager.initialize();
                
                // Exposer globalement les fonctions nécessaires
                window.openReportModal = () => dashboardManager.openReportModal();
                window.closeReportModal = () => dashboardManager.closeReportModal();
                window.submitReport = () => dashboardManager.submitReport();
                window.toggleDurationFields = () => dashboardManager.toggleDurationFields();
                window.printCurrentReport = () => dashboardManager.printCurrentReport();
                window.sendReportByEmail = () => dashboardManager.sendReportByEmail();
                window.editCurrentReport = () => dashboardManager.editCurrentReport();
                window.closeDetailsModal = () => dashboardManager.closeDetailsModal();
                window.logout = () => dashboardManager.logout();
                
                console.log('Dashboard Agent initialisé avec succès');
                
            } catch (error) {
                console.error('Erreur lors de l\'initialisation:', error);
                
                // Afficher un message d'erreur
                const errorDiv = document.createElement('div');
                errorDiv.className = 'fixed inset-0 bg-white flex items-center justify-center z-50';
                errorDiv.innerHTML = `
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
                `;
                
                document.body.appendChild(errorDiv);
            }
        });