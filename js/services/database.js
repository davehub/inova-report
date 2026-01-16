// js/services/database.js

import { db } from '../config/firebase.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    startAfter,
    serverTimestamp,
    writeBatch,
    onSnapshot,
    arrayUnion,
    arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Fonction utilitaire pour les notifications
function showNotification(message, type = 'info') {
    // Vérifier si la fonction de notification existe déjà
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
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
        notification.classList.add('opacity-100');
    }, 10);
    
    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Constantes pour les collections
const FIRESTORE_COLLECTIONS = {
    USERS: 'users',
    CLIENTS: 'clients',
    SOFTWARE: 'software',
    REPORTS: 'reports'
};

// Messages de succès
const SUCCESS_MESSAGES = {
    USER_CREATED: 'Utilisateur créé avec succès',
    USER_UPDATED: 'Utilisateur mis à jour avec succès',
    USER_DELETED: 'Utilisateur supprimé avec succès',
    CLIENT_CREATED: 'Client créé avec succès',
    CLIENT_UPDATED: 'Client mis à jour avec succès',
    CLIENT_DELETED: 'Client supprimé avec succès',
    SOFTWARE_CREATED: 'Logiciel créé avec succès',
    SOFTWARE_UPDATED: 'Logiciel mis à jour avec succès',
    SOFTWARE_DELETED: 'Logiciel supprimé avec succès',
    REPORT_CREATED: 'Rapport créé avec succès',
    REPORT_UPDATED: 'Rapport mis à jour avec succès',
    REPORT_DELETED: 'Rapport supprimé avec succès',
    REPORT_VALIDATED: 'Rapport validé avec succès',
    EXPORT_SUCCESS: 'Export réalisé avec succès',
    IMPORT_SUCCESS: 'Import réalisé avec succès'
};

// Messages d'erreur
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion internet.',
    PERMISSION_DENIED: 'Permission refusée. Vous n\'avez pas les droits nécessaires.',
    NOT_FOUND: 'Document non trouvé.',
    ALREADY_EXISTS: 'Ce document existe déjà.',
    INVALID_DATA: 'Données invalides.',
    UNAUTHORIZED: 'Accès non autorisé.',
    UNKNOWN_ERROR: 'Une erreur inconnue est survenue.'
};

// Gestion des erreurs Firebase
function handleFirebaseError(error) {
    console.error('Erreur Firebase:', error);
    
    switch (error.code) {
        case 'permission-denied':
            return ERROR_MESSAGES.PERMISSION_DENIED;
        case 'not-found':
            return ERROR_MESSAGES.NOT_FOUND;
        case 'already-exists':
            return ERROR_MESSAGES.ALREADY_EXISTS;
        case 'invalid-argument':
            return ERROR_MESSAGES.INVALID_DATA;
        case 'unauthenticated':
            return ERROR_MESSAGES.UNAUTHORIZED;
        case 'unavailable':
        case 'deadline-exceeded':
            return ERROR_MESSAGES.NETWORK_ERROR;
        case 'failed-precondition':
            return 'Index en cours de création, veuillez patienter...';
        case 'resource-exhausted':
            return 'Limite de requêtes atteinte, réessayez plus tard';
        default:
            return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
}

// Service de base de données
class DatabaseService {
    constructor() {
        this.unsubscribers = new Map();
        this.collections = FIRESTORE_COLLECTIONS;
    }

    // ==================== GESTION DES ERREURS ====================

    handleError(error, context) {
        console.error(`Erreur ${context}:`, error);
        const message = handleFirebaseError(error);
        showNotification(`${context}: ${message}`, 'error');
        return { success: false, error: message };
    }

    // ==================== UTILISATEURS ====================

    // Créer un utilisateur
    async createUser(userData) {
        try {
            // Validation des données
            if (!userData.email || !userData.fullName || !userData.role) {
                return { 
                    success: false, 
                    error: 'Tous les champs obligatoires doivent être remplis' 
                };
            }

            // Vérifier si l'utilisateur existe déjà
            const existingQuery = query(
                collection(db, this.collections.USERS),
                where('email', '==', userData.email)
            );
            const existingUser = await getDocs(existingQuery);
            
            if (!existingUser.empty) {
                return { 
                    success: false, 
                    error: 'Un utilisateur avec cet email existe déjà' 
                };
            }

            const userRef = await addDoc(collection(db, this.collections.USERS), {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true,
                lastLogin: null,
                stats: {
                    totalReports: 0,
                    validatedReports: 0,
                    pendingReports: 0,
                    totalHours: 0
                }
            });
            
            showNotification(SUCCESS_MESSAGES.USER_CREATED, 'success');
            return { 
                success: true, 
                id: userRef.id,
                message: 'Utilisateur créé avec succès'
            };
        } catch (error) {
            return this.handleError(error, 'création utilisateur');
        }
    }

    // Obtenir un utilisateur par ID
    async getUserById(userId) {
        try {
            const userDoc = await getDoc(doc(db, this.collections.USERS, userId));
            if (userDoc.exists()) {
                return { 
                    success: true, 
                    data: { id: userDoc.id, ...userDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Utilisateur non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'récupération utilisateur');
        }
    }

    // Obtenir un utilisateur par email
    async getUserByEmail(email) {
        try {
            const q = query(
                collection(db, this.collections.USERS), 
                where('email', '==', email)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                return { 
                    success: true, 
                    data: { id: userDoc.id, ...userDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Utilisateur non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'recherche utilisateur');
        }
    }

    // Obtenir tous les utilisateurs
    async getAllUsers(includeInactive = false) {
        try {
            let q;
            if (includeInactive) {
                q = query(
                    collection(db, this.collections.USERS), 
                    orderBy('fullName', 'asc')
                );
            } else {
                q = query(
                    collection(db, this.collections.USERS), 
                    where('isActive', '==', true),
                    orderBy('fullName', 'asc')
                );
            }
            
            const querySnapshot = await getDocs(q);
            const users = [];
            
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            
            return { 
                success: true, 
                data: users 
            };
        } catch (error) {
            return this.handleError(error, 'récupération utilisateurs');
        }
    }

    // Obtenir tous les agents
    async getAllAgents(includeInactive = false) {
        try {
            let constraints = [
                where('role', '==', 'agent')
            ];
            
            if (!includeInactive) {
                constraints.push(where('isActive', '==', true));
            }
            
            constraints.push(orderBy('fullName', 'asc'));
            
            const q = query(collection(db, this.collections.USERS), ...constraints);
            const querySnapshot = await getDocs(q);
            const agents = [];
            
            querySnapshot.forEach((doc) => {
                agents.push({ id: doc.id, ...doc.data() });
            });
            
            return { 
                success: true, 
                data: agents 
            };
        } catch (error) {
            return this.handleError(error, 'récupération agents');
        }
    }

    // Obtenir tous les responsables
    async getAllResponsables() {
        try {
            const q = query(
                collection(db, this.collections.USERS), 
                where('role', 'in', ['responsable', 'admin', 'manager', 'superviseur', 'responsableIT']),
                where('isActive', '==', true),
                orderBy('fullName', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const responsables = [];
            
            querySnapshot.forEach((doc) => {
                responsables.push({ id: doc.id, ...doc.data() });
            });
            
            return { 
                success: true, 
                data: responsables 
            };
        } catch (error) {
            return this.handleError(error, 'récupération responsables');
        }
    }

    // Mettre à jour un utilisateur
    async updateUser(userId, updates) {
        try {
            await updateDoc(doc(db, this.collections.USERS, userId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            
            showNotification(SUCCESS_MESSAGES.USER_UPDATED, 'success');
            return { 
                success: true, 
                message: 'Utilisateur mis à jour avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'mise à jour utilisateur');
        }
    }

    // Désactiver un utilisateur
    async deactivateUser(userId) {
        try {
            await updateDoc(doc(db, this.collections.USERS, userId), {
                isActive: false,
                updatedAt: serverTimestamp(),
                deactivatedAt: serverTimestamp()
            });
            
            showNotification('Utilisateur désactivé avec succès', 'success');
            return { 
                success: true, 
                message: 'Utilisateur désactivé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'désactivation utilisateur');
        }
    }

    // Activer un utilisateur
    async activateUser(userId) {
        try {
            await updateDoc(doc(db, this.collections.USERS, userId), {
                isActive: true,
                updatedAt: serverTimestamp(),
                reactivatedAt: serverTimestamp()
            });
            
            showNotification('Utilisateur activé avec succès', 'success');
            return { 
                success: true, 
                message: 'Utilisateur activé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'activation utilisateur');
        }
    }

    // Mettre à jour les statistiques d'un agent
    async updateAgentStats(agentUid, updates) {
        try {
            const userRef = doc(db, this.collections.USERS, agentUid);
            
            await updateDoc(userRef, {
                'stats': updates,
                updatedAt: serverTimestamp()
            });
            
            return { 
                success: true 
            };
        } catch (error) {
            console.error('Erreur mise à jour stats agent:', error);
            return { 
                success: false, 
                error: 'Erreur mise à jour statistiques' 
            };
        }
    }

    // Obtenir les utilisateurs avec statistiques
    async getUsersWithStats() {
        try {
            const usersResult = await this.getAllUsers();
            if (!usersResult.success) {
                return usersResult;
            }

            const users = usersResult.data;
            
            // Pour chaque agent, obtenir ses statistiques
            const usersWithStats = await Promise.all(
                users.map(async (user) => {
                    if (user.role === 'agent') {
                        const statsResult = await this.getAgentStatistics(user.uid || user.id);
                        if (statsResult.success) {
                            return {
                                ...user,
                                stats: statsResult.data
                            };
                        }
                    }
                    return user;
                })
            );

            return { 
                success: true, 
                data: usersWithStats 
            };
        } catch (error) {
            return this.handleError(error, 'récupération utilisateurs avec stats');
        }
    }

    // ==================== CLIENTS ====================

    // Obtenir tous les clients
    async getAllClients() {
        try {
            const q = query(
                collection(db, this.collections.CLIENTS),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const clients = [];
            
            querySnapshot.forEach((doc) => {
                clients.push({ id: doc.id, ...doc.data() });
            });
            
            return { 
                success: true, 
                data: clients 
            };
        } catch (error) {
            return this.handleError(error, 'récupération clients');
        }
    }

    // Obtenir un client par ID
    async getClientById(clientId) {
        try {
            const clientDoc = await getDoc(doc(db, this.collections.CLIENTS, clientId));
            if (clientDoc.exists()) {
                return { 
                    success: true, 
                    data: { id: clientDoc.id, ...clientDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Client non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'récupération client');
        }
    }

    // Obtenir un client par nom
    async getClientByName(clientName) {
        try {
            const q = query(
                collection(db, this.collections.CLIENTS),
                where('name', '==', clientName)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clientDoc = querySnapshot.docs[0];
                return { 
                    success: true, 
                    data: { id: clientDoc.id, ...clientDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Client non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'recherche client');
        }
    }

    // Ajouter un nouveau client
    async addClient(clientName, createdBy) {
        try {
            // Vérifier si le client existe déjà
            const existingResult = await this.getClientByName(clientName);
            if (existingResult.success) {
                return { 
                    success: false, 
                    error: 'Ce client existe déjà dans la base de données' 
                };
            }

            const clientRef = await addDoc(collection(db, this.collections.CLIENTS), {
                name: clientName,
                createdBy: createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true,
                contactInfo: {
                    address: '',
                    phone: '',
                    email: '',
                    contactPerson: ''
                },
                notes: '',
                contractType: 'Standard',
                contractStart: '',
                contractEnd: ''
            });

            showNotification(SUCCESS_MESSAGES.CLIENT_CREATED, 'success');
            return { 
                success: true, 
                id: clientRef.id,
                message: 'Client créé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'ajout client');
        }
    }

    // Mettre à jour un client
    async updateClient(clientId, updates) {
        try {
            await updateDoc(doc(db, this.collections.CLIENTS, clientId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            
            showNotification(SUCCESS_MESSAGES.CLIENT_UPDATED, 'success');
            return { 
                success: true, 
                message: 'Client mis à jour avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'mise à jour client');
        }
    }

    // Supprimer un client
    async deleteClient(clientId) {
        try {
            // Vérifier si le client est utilisé dans des rapports
            const clientResult = await this.getClientById(clientId);
            if (!clientResult.success) {
                return clientResult;
            }

            const clientName = clientResult.data.name;
            
            const reportsQuery = query(
                collection(db, this.collections.REPORTS),
                where('clientName', '==', clientName),
                limit(1)
            );
            const reportsSnapshot = await getDocs(reportsQuery);
            
            if (!reportsSnapshot.empty) {
                return { 
                    success: false, 
                    error: 'Impossible de supprimer ce client car il est utilisé dans des rapports' 
                };
            }

            await deleteDoc(doc(db, this.collections.CLIENTS, clientId));
            
            showNotification(SUCCESS_MESSAGES.CLIENT_DELETED, 'success');
            return { 
                success: true, 
                message: 'Client supprimé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'suppression client');
        }
    }

    // Obtenir les statistiques d'un client
    async getClientStatistics(clientName) {
        try {
            const reportsQuery = query(
                collection(db, this.collections.REPORTS),
                where('clientName', '==', clientName)
            );
            
            const querySnapshot = await getDocs(reportsQuery);
            const stats = {
                totalReports: 0,
                totalHours: 0,
                validatedReports: 0,
                pendingReports: 0,
                byAgent: {},
                bySoftware: {},
                byType: {}
            };

            querySnapshot.forEach((doc) => {
                const report = doc.data();
                stats.totalReports++;
                
                if (report.isValidated) stats.validatedReports++;
                if (report.status === 'En Cours') stats.pendingReports++;

                // Par agent
                const agent = report.agentName || 'Inconnu';
                stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

                // Par logiciel
                const software = report.software || 'Inconnu';
                stats.bySoftware[software] = (stats.bySoftware[software] || 0) + 1;

                // Par type
                const type = report.type || report.interventionType || 'Inconnu';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Calcul du temps
                if (report.duration) {
                    const match = report.duration.match(/(\d+(\.\d+)?)\s*(heure|jour)/i);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[3].toLowerCase();
                        stats.totalHours += unit === 'jour' ? value * 8 : value;
                    }
                }
            });

            return { 
                success: true, 
                data: stats 
            };
        } catch (error) {
            console.error('Erreur statistiques client:', error);
            return { 
                success: false, 
                error: 'Erreur calcul statistiques client' 
            };
        }
    }

    // ==================== LOGICIELS ====================

    // Obtenir tous les logiciels
    async getAllSoftware() {
        try {
            const q = query(
                collection(db, this.collections.SOFTWARE),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const software = [];
            
            querySnapshot.forEach((doc) => {
                software.push({ id: doc.id, ...doc.data() });
            });
            
            return { 
                success: true, 
                data: software 
            };
        } catch (error) {
            return this.handleError(error, 'récupération logiciels');
        }
    }

    // Obtenir un logiciel par ID
    async getSoftwareById(softwareId) {
        try {
            const softwareDoc = await getDoc(doc(db, this.collections.SOFTWARE, softwareId));
            if (softwareDoc.exists()) {
                return { 
                    success: true, 
                    data: { id: softwareDoc.id, ...softwareDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Logiciel non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'récupération logiciel');
        }
    }

    // Obtenir un logiciel par nom
    async getSoftwareByName(softwareName) {
        try {
            const q = query(
                collection(db, this.collections.SOFTWARE),
                where('name', '==', softwareName)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const softwareDoc = querySnapshot.docs[0];
                return { 
                    success: true, 
                    data: { id: softwareDoc.id, ...softwareDoc.data() } 
                };
            }
            return { 
                success: false, 
                error: 'Logiciel non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'recherche logiciel');
        }
    }

    // Ajouter un nouveau logiciel
    async addSoftware(softwareName, createdBy, description = '') {
        try {
            // Vérifier si le logiciel existe déjà
            const existingResult = await this.getSoftwareByName(softwareName);
            if (existingResult.success) {
                return { 
                    success: false, 
                    error: 'Ce logiciel existe déjà dans la base de données' 
                };
            }

            const softwareRef = await addDoc(collection(db, this.collections.SOFTWARE), {
                name: softwareName,
                description: description,
                createdBy: createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true,
                version: '1.0',
                category: 'Général',
                vendor: '',
                supportContact: '',
                licenseType: 'Standard'
            });

            showNotification(SUCCESS_MESSAGES.SOFTWARE_CREATED, 'success');
            return { 
                success: true, 
                id: softwareRef.id,
                message: 'Logiciel créé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'ajout logiciel');
        }
    }

    // Mettre à jour un logiciel
    async updateSoftware(softwareId, updates) {
        try {
            await updateDoc(doc(db, this.collections.SOFTWARE, softwareId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            
            showNotification(SUCCESS_MESSAGES.SOFTWARE_UPDATED, 'success');
            return { 
                success: true, 
                message: 'Logiciel mis à jour avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'mise à jour logiciel');
        }
    }

    // Supprimer un logiciel
    async deleteSoftware(softwareId) {
        try {
            // Vérifier si le logiciel est utilisé dans des rapports
            const softwareResult = await this.getSoftwareById(softwareId);
            if (!softwareResult.success) {
                return softwareResult;
            }

            const softwareName = softwareResult.data.name;
            
            const reportsQuery = query(
                collection(db, this.collections.REPORTS),
                where('software', '==', softwareName),
                limit(1)
            );
            const reportsSnapshot = await getDocs(reportsQuery);
            
            if (!reportsSnapshot.empty) {
                return { 
                    success: false, 
                    error: 'Impossible de supprimer ce logiciel car il est utilisé dans des rapports' 
                };
            }

            await deleteDoc(doc(db, this.collections.SOFTWARE, softwareId));
            
            showNotification(SUCCESS_MESSAGES.SOFTWARE_DELETED, 'success');
            return { 
                success: true, 
                message: 'Logiciel supprimé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'suppression logiciel');
        }
    }

    // Obtenir les statistiques d'un logiciel
    async getSoftwareStatistics(softwareName) {
        try {
            const reportsQuery = query(
                collection(db, this.collections.REPORTS),
                where('software', '==', softwareName)
            );
            
            const querySnapshot = await getDocs(reportsQuery);
            const stats = {
                totalReports: 0,
                totalHours: 0,
                validatedReports: 0,
                pendingReports: 0,
                byAgent: {},
                byClient: {},
                byType: {}
            };

            querySnapshot.forEach((doc) => {
                const report = doc.data();
                stats.totalReports++;
                
                if (report.isValidated) stats.validatedReports++;
                if (report.status === 'En Cours') stats.pendingReports++;

                // Par agent
                const agent = report.agentName || 'Inconnu';
                stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

                // Par client
                const client = report.clientName || 'Inconnu';
                stats.byClient[client] = (stats.byClient[client] || 0) + 1;

                // Par type
                const type = report.type || report.interventionType || 'Inconnu';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Calcul du temps
                if (report.duration) {
                    const match = report.duration.match(/(\d+(\.\d+)?)\s*(heure|jour)/i);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[3].toLowerCase();
                        stats.totalHours += unit === 'jour' ? value * 8 : value;
                    }
                }
            });

            return { 
                success: true, 
                data: stats 
            };
        } catch (error) {
            console.error('Erreur statistiques logiciel:', error);
            return { 
                success: false, 
                error: 'Erreur calcul statistiques logiciel' 
            };
        }
    }

    // ==================== RAPPORTS ====================

    // Créer un rapport
    async createReport(reportData) {
        try {
            console.log('Création rapport avec données:', reportData);
            
            // Validation des données obligatoires
            const requiredFields = ['agentUid', 'agentName', 'clientName', 'date', 'site', 'software', 'object', 'status'];
            for (const field of requiredFields) {
                if (!reportData[field]) {
                    return { 
                        success: false, 
                        error: `Le champ ${field} est obligatoire` 
                    };
                }
            }

            const reportDataWithDefaults = {
                ...reportData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isValidated: false,
                canEdit: true,
                validatedBy: null,
                validatedByName: null,
                validatedAt: null,
                // Assurer la compatibilité des noms de champs
                type: reportData.type || reportData.interventionType || 'Non spécifié',
                duration: reportData.duration || 'Non spécifié',
                interlocutor: reportData.interlocutor || 'Non spécifié',
                contact: reportData.contact || 'Non spécifié',
                technicalDetails: reportData.technicalDetails || '',
                contract: reportData.contract || 'OUI',
                durationUnit: reportData.durationUnit || null,
                hourCount: reportData.hourCount || null,
                dayCount: reportData.dayCount || null
            };

            const reportRef = await addDoc(collection(db, this.collections.REPORTS), reportDataWithDefaults);
            
            showNotification(SUCCESS_MESSAGES.REPORT_CREATED, 'success');
            
            console.log('Rapport créé avec ID:', reportRef.id);
            return { 
                success: true, 
                id: reportRef.id,
                message: 'Rapport créé avec succès' 
            };
        } catch (error) {
            console.error('Erreur création rapport:', error);
            return this.handleError(error, 'création rapport');
        }
    }

    // Obtenir un rapport par ID
    async getReportById(reportId) {
        try {
            const reportDoc = await getDoc(doc(db, this.collections.REPORTS, reportId));
            if (reportDoc.exists()) {
                const data = reportDoc.data();
                return { 
                    success: true, 
                    data: { 
                        id: reportDoc.id, 
                        ...data,
                        type: data.type || data.interventionType || 'Non spécifié'
                    } 
                };
            }
            return { 
                success: false, 
                error: 'Rapport non trouvé' 
            };
        } catch (error) {
            return this.handleError(error, 'récupération rapport');
        }
    }

    // Obtenir les rapports d'un agent
    async getAgentReports(agentUid, filters = {}) {
        try {
            let constraints = [
                where('agentUid', '==', agentUid),
                orderBy('createdAt', 'desc')
            ];

            // Appliquer les filtres
            if (filters.startDate) {
                constraints.push(where('date', '>=', filters.startDate));
            }
            if (filters.endDate) {
                constraints.push(where('date', '<=', filters.endDate));
            }
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            if (filters.clientName) {
                constraints.push(where('clientName', '==', filters.clientName));
            }
            if (filters.isValidated !== undefined) {
                constraints.push(where('isValidated', '==', filters.isValidated));
            }

            let q = query(collection(db, this.collections.REPORTS), ...constraints);
            
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }

            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                reports.push({ 
                    id: doc.id, 
                    ...data,
                    // Normalisation des champs
                    type: data.type || data.interventionType || 'Non spécifié'
                });
            });
            
            return { 
                success: true, 
                data: reports,
                count: reports.length 
            };
        } catch (error) {
            return this.handleError(error, 'récupération rapports agent');
        }
    }

    // Obtenir tous les rapports (pour le responsable)
    async getAllReports(filters = {}) {
        try {
            let constraints = [orderBy('createdAt', 'desc')];

            // Appliquer les filtres
            if (filters.agentUid) {
                constraints.push(where('agentUid', '==', filters.agentUid));
            }
            if (filters.agentName) {
                constraints.push(where('agentName', '==', filters.agentName));
            }
            if (filters.clientName) {
                constraints.push(where('clientName', '==', filters.clientName));
            }
            if (filters.startDate) {
                constraints.push(where('date', '>=', filters.startDate));
            }
            if (filters.endDate) {
                constraints.push(where('date', '<=', filters.endDate));
            }
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            if (filters.isValidated !== undefined) {
                constraints.push(where('isValidated', '==', filters.isValidated));
            }
            if (filters.type) {
                constraints.push(where('type', '==', filters.type));
            }
            if (filters.software) {
                constraints.push(where('software', '==', filters.software));
            }

            let q = query(collection(db, this.collections.REPORTS), ...constraints);
            
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }

            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                reports.push({ 
                    id: doc.id, 
                    ...data,
                    // Normalisation des champs
                    type: data.type || data.interventionType || 'Non spécifié'
                });
            });
            
            return { 
                success: true, 
                data: reports,
                count: reports.length 
            };
        } catch (error) {
            return this.handleError(error, 'récupération tous les rapports');
        }
    }

    // Mettre à jour un rapport
    async updateReport(reportId, updates) {
        try {
            const reportRef = doc(db, this.collections.REPORTS, reportId);
            
            // Préparer les mises à jour
            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };
            
            await updateDoc(reportRef, updateData);
            
            showNotification(SUCCESS_MESSAGES.REPORT_UPDATED, 'success');
            return { 
                success: true, 
                message: 'Rapport mis à jour avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'mise à jour rapport');
        }
    }

    // Valider un rapport
    async validateReport(reportId, validatedByUid, validatedByName) {
        try {
            const reportRef = doc(db, this.collections.REPORTS, reportId);
            
            await updateDoc(reportRef, {
                isValidated: true,
                validatedBy: validatedByUid,
                validatedByName: validatedByName,
                validatedAt: serverTimestamp(),
                canEdit: false, // Les agents ne peuvent plus modifier après validation
                updatedAt: serverTimestamp()
            });
            
            showNotification(SUCCESS_MESSAGES.REPORT_VALIDATED, 'success');
            return { 
                success: true, 
                message: 'Rapport validé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'validation rapport');
        }
    }

    // Dévalider un rapport
    async unvalidateReport(reportId) {
        try {
            const reportRef = doc(db, this.collections.REPORTS, reportId);
            
            await updateDoc(reportRef, {
                isValidated: false,
                validatedBy: null,
                validatedByName: null,
                validatedAt: null,
                canEdit: true, // Les agents peuvent à nouveau modifier
                updatedAt: serverTimestamp()
            });
            
            showNotification('Rapport dévalidé avec succès', 'success');
            return { 
                success: true, 
                message: 'Rapport dévalidé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'dévalidation rapport');
        }
    }

    // Supprimer un rapport
    async deleteReport(reportId) {
        try {
            await deleteDoc(doc(db, this.collections.REPORTS, reportId));
            
            showNotification(SUCCESS_MESSAGES.REPORT_DELETED, 'success');
            return { 
                success: true, 
                message: 'Rapport supprimé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'suppression rapport');
        }
    }

    // Valider plusieurs rapports en lot
    async validateReportsBatch(reportIds, validatedByUid, validatedByName) {
        try {
            const batch = writeBatch(db);
            
            for (const reportId of reportIds) {
                const reportRef = doc(db, this.collections.REPORTS, reportId);
                batch.update(reportRef, {
                    isValidated: true,
                    validatedBy: validatedByUid,
                    validatedByName: validatedByName,
                    validatedAt: serverTimestamp(),
                    canEdit: false,
                    updatedAt: serverTimestamp()
                });
            }
            
            await batch.commit();
            
            showNotification(`${reportIds.length} rapports validés avec succès`, 'success');
            return { 
                success: true, 
                message: `${reportIds.length} rapports validés avec succès` 
            };
        } catch (error) {
            return this.handleError(error, 'validation lot rapports');
        }
    }

    // ==================== STATISTIQUES ====================

    // Obtenir les statistiques globales
    async getGlobalStatistics() {
        try {
            const [reportsResult, agentsResult, clientsResult, softwareResult] = await Promise.all([
                this.getAllReports(),
                this.getAllAgents(),
                this.getAllClients(),
                this.getAllSoftware()
            ]);

            if (!reportsResult.success) {
                return reportsResult;
            }

            const reports = reportsResult.data;
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const stats = {
                totalReports: reports.length,
                totalAgents: agentsResult.success ? agentsResult.data.length : 0,
                totalClients: clientsResult.success ? clientsResult.data.length : 0,
                totalSoftware: softwareResult.success ? softwareResult.data.length : 0,
                weekReports: 0,
                monthReports: 0,
                pendingReports: 0,
                validatedReports: 0,
                totalHours: 0,
                byType: {},
                byStatus: {},
                bySoftware: {},
                byClient: {},
                recentActivity: []
            };

            reports.forEach(report => {
                const reportDate = new Date(report.date || report.createdAt?.toDate?.() || now);
                
                if (reportDate >= oneWeekAgo) stats.weekReports++;
                if (reportDate >= oneMonthAgo) stats.monthReports++;
                
                if (report.status === 'En Cours') stats.pendingReports++;
                if (report.isValidated) stats.validatedReports++;

                // Par type
                const type = report.type || 'Non spécifié';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Par statut
                const status = report.status || 'Terminé';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Par logiciel
                const software = report.software || 'Non spécifié';
                stats.bySoftware[software] = (stats.bySoftware[software] || 0) + 1;

                // Par client
                const client = report.clientName || 'Non spécifié';
                stats.byClient[client] = (stats.byClient[client] || 0) + 1;

                // Calcul du temps total
                if (report.duration) {
                    const match = report.duration.match(/(\d+(\.\d+)?)\s*(heure|jour)/i);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[3].toLowerCase();
                        stats.totalHours += unit === 'jour' ? value * 8 : value;
                    }
                }
            });

            // Activité récente (10 derniers rapports)
            stats.recentActivity = reports
                .slice(0, 10)
                .map(report => ({
                    id: report.id,
                    client: report.clientName,
                    agent: report.agentName,
                    date: report.date,
                    type: report.type,
                    status: report.status,
                    isValidated: report.isValidated
                }));

            return { 
                success: true, 
                data: stats 
            };
        } catch (error) {
            return this.handleError(error, 'calcul statistiques');
        }
    }

    // Obtenir les statistiques d'un agent
    async getAgentStatistics(agentUid) {
        try {
            const reportsResult = await this.getAgentReports(agentUid);
            if (!reportsResult.success) {
                return reportsResult;
            }

            const reports = reportsResult.data;
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const stats = {
                totalReports: reports.length,
                weekReports: 0,
                monthReports: 0,
                pendingReports: 0,
                validatedReports: 0,
                byClient: {},
                bySoftware: {},
                byStatus: {},
                totalHours: 0
            };

            reports.forEach(report => {
                const reportDate = new Date(report.date || report.createdAt?.toDate?.() || now);
                
                if (reportDate >= oneWeekAgo) stats.weekReports++;
                if (reportDate >= oneMonthAgo) stats.monthReports++;
                
                if (report.status === 'En Cours') stats.pendingReports++;
                if (report.isValidated) stats.validatedReports++;

                // Par client
                const client = report.clientName || 'Non spécifié';
                stats.byClient[client] = (stats.byClient[client] || 0) + 1;

                // Par logiciel
                const software = report.software || 'Non spécifié';
                stats.bySoftware[software] = (stats.bySoftware[software] || 0) + 1;

                // Par statut
                const status = report.status || 'Terminé';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Calcul du temps (si disponible)
                if (report.duration && typeof report.duration === 'string') {
                    const match = report.duration.match(/(\d+(\.\d+)?)\s*(heure|jour)/i);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[3].toLowerCase();
                        if (unit === 'jour') {
                            stats.totalHours += value * 8; // 8 heures par jour
                        } else {
                            stats.totalHours += value;
                        }
                    }
                }
            });

            return { 
                success: true, 
                data: stats 
            };
        } catch (error) {
            return this.handleError(error, 'calcul statistiques agent');
        }
    }

    // Obtenir les statistiques mensuelles
    async getMonthlyStatistics(year, month) {
        try {
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const filters = {
                startDate: startDate,
                endDate: endDate
            };

            const reportsResult = await this.getAllReports(filters);
            if (!reportsResult.success) {
                return reportsResult;
            }

            const reports = reportsResult.data;
            const stats = {
                totalReports: reports.length,
                totalHours: 0,
                validatedReports: 0,
                pendingReports: 0,
                byDay: {},
                byAgent: {},
                byClient: {},
                bySoftware: {}
            };

            // Initialiser tous les jours du mois
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                stats.byDay[day] = 0;
            }

            reports.forEach(report => {
                // Par jour
                const reportDate = new Date(report.date);
                const day = reportDate.getDate();
                stats.byDay[day] = (stats.byDay[day] || 0) + 1;
                
                if (report.isValidated) stats.validatedReports++;
                if (report.status === 'En Cours') stats.pendingReports++;

                // Par agent
                const agent = report.agentName || 'Inconnu';
                stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

                // Par client
                const client = report.clientName || 'Inconnu';
                stats.byClient[client] = (stats.byClient[client] || 0) + 1;

                // Par logiciel
                const software = report.software || 'Inconnu';
                stats.bySoftware[software] = (stats.bySoftware[software] || 0) + 1;

                // Calcul du temps
                if (report.duration) {
                    const match = report.duration.match(/(\d+(\.\d+)?)\s*(heure|jour)/i);
                    if (match) {
                        const value = parseFloat(match[1]);
                        const unit = match[3].toLowerCase();
                        stats.totalHours += unit === 'jour' ? value * 8 : value;
                    }
                }
            });

            return { 
                success: true, 
                data: stats 
            };
        } catch (error) {
            return this.handleError(error, 'calcul statistiques mensuelles');
        }
    }

    // ==================== TEMPS RÉEL ====================

    // Écouter les changements de rapports
    subscribeToReports(callback, filters = {}) {
        try {
            let constraints = [orderBy('createdAt', 'desc')];

            if (filters.agentUid) {
                constraints.push(where('agentUid', '==', filters.agentUid));
            }
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            if (filters.clientName) {
                constraints.push(where('clientName', '==', filters.clientName));
            }
            if (filters.isValidated !== undefined) {
                constraints.push(where('isValidated', '==', filters.isValidated));
            }

            const q = query(collection(db, this.collections.REPORTS), ...constraints);
            
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const reports = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        reports.push({ 
                            id: doc.id, 
                            ...data,
                            type: data.type || data.interventionType || 'Non spécifié'
                        });
                    });
                    callback({ 
                        success: true, 
                        data: reports,
                        count: reports.length 
                    });
                },
                (error) => {
                    console.error('Erreur souscription rapports:', error);
                    callback({ 
                        success: false, 
                        error: 'Erreur de connexion aux données' 
                    });
                }
            );

            // Stocker la fonction de désinscription
            this.unsubscribers.set('reports', unsubscribe);

            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription rapports:', error);
            callback({ 
                success: false, 
                error: 'Erreur configuration souscription' 
            });
            return null;
        }
    }

    // Écouter les changements de clients
    subscribeToClients(callback) {
        try {
            const q = query(
                collection(db, this.collections.CLIENTS),
                orderBy('name', 'asc')
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const clients = [];
                    snapshot.forEach((doc) => {
                        clients.push({ id: doc.id, ...doc.data() });
                    });
                    callback({ 
                        success: true, 
                        data: clients 
                    });
                },
                (error) => {
                    console.error('Erreur souscription clients:', error);
                    callback({ 
                        success: false, 
                        error: 'Erreur de connexion aux données clients' 
                    });
                }
            );

            this.unsubscribers.set('clients', unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription clients:', error);
            callback({ 
                success: false, 
                error: 'Erreur configuration souscription clients' 
            });
            return null;
        }
    }

    // Écouter les changements de logiciels
    subscribeToSoftware(callback) {
        try {
            const q = query(
                collection(db, this.collections.SOFTWARE),
                orderBy('name', 'asc')
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const software = [];
                    snapshot.forEach((doc) => {
                        software.push({ id: doc.id, ...doc.data() });
                    });
                    callback({ 
                        success: true, 
                        data: software 
                    });
                },
                (error) => {
                    console.error('Erreur souscription logiciels:', error);
                    callback({ 
                        success: false, 
                        error: 'Erreur de connexion aux données logiciels' 
                    });
                }
            );

            this.unsubscribers.set('software', unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription logiciels:', error);
            callback({ 
                success: false, 
                error: 'Erreur configuration souscription logiciels' 
            });
            return null;
        }
    }

    // Écouter les changements d'utilisateurs
    subscribeToUsers(callback) {
        try {
            const q = query(
                collection(db, this.collections.USERS),
                orderBy('fullName', 'asc')
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const users = [];
                    snapshot.forEach((doc) => {
                        users.push({ id: doc.id, ...doc.data() });
                    });
                    callback({ 
                        success: true, 
                        data: users 
                    });
                },
                (error) => {
                    console.error('Erreur souscription utilisateurs:', error);
                    callback({ 
                        success: false, 
                        error: 'Erreur de connexion aux données utilisateurs' 
                    });
                }
            );

            this.unsubscribers.set('users', unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription utilisateurs:', error);
            callback({ 
                success: false, 
                error: 'Erreur configuration souscription utilisateurs' 
            });
            return null;
        }
    }

    // Se désinscrire de toutes les souscriptions
    unsubscribeAll() {
        this.unsubscribers.forEach((unsubscribe, key) => {
            if (unsubscribe) {
                unsubscribe();
                console.log(`Désinscription de: ${key}`);
            }
        });
        this.unsubscribers.clear();
    }

    // Se désinscrire d'une souscription spécifique
    unsubscribeFrom(key) {
        const unsubscribe = this.unsubscribers.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.unsubscribers.delete(key);
            console.log(`Désinscription de: ${key}`);
        }
    }

    // ==================== EXPORT/IMPORT ====================

    // Exporter les données
    async exportData(format = 'json', collectionName, filters = {}) {
        try {
            let data = [];
            
            if (collectionName === 'reports') {
                const result = await this.getAllReports(filters);
                if (result.success) {
                    data = result.data;
                }
            } else if (collectionName === 'clients') {
                const result = await this.getAllClients();
                if (result.success) {
                    data = result.data;
                }
            } else if (collectionName === 'software') {
                const result = await this.getAllSoftware();
                if (result.success) {
                    data = result.data;
                }
            } else if (collectionName === 'users') {
                const result = await this.getAllUsers(true);
                if (result.success) {
                    data = result.data;
                }
            }

            if (data.length === 0) {
                return { 
                    success: false, 
                    error: 'Aucune donnée à exporter' 
                };
            }

            const timestamp = new Date().toISOString().split('T')[0];
            let content, mimeType, extension;

            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
            } else if (format === 'csv') {
                // Conversion simple en CSV
                if (data.length === 0) {
                    return { success: false, error: 'Aucune donnée à convertir' };
                }
                
                const headers = Object.keys(data[0]);
                const csvContent = [
                    headers.join(','),
                    ...data.map(row => 
                        headers.map(header => {
                            const value = row[header];
                            if (value === null || value === undefined) {
                                return '';
                            }
                            const stringValue = String(value);
                            return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
                                ? `"${stringValue.replace(/"/g, '""')}"`
                                : stringValue;
                        }).join(',')
                    )
                ].join('\n');
                content = csvContent;
                mimeType = 'text/csv;charset=utf-8;';
                extension = 'csv';
            }

            // Créer et télécharger le fichier
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `export_${collectionName}_${timestamp}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showNotification(`${data.length} éléments exportés avec succès`, 'success');
            return { 
                success: true, 
                count: data.length,
                message: 'Export réalisé avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'export données');
        }
    }

    // ==================== UTILITAIRES ====================

    // Vérifier la connexion à la base de données
    async checkConnection() {
        try {
            // Essayer de lire un document simple
            const testQuery = query(collection(db, this.collections.USERS), limit(1));
            await getDocs(testQuery);
            return { 
                success: true, 
                connected: true,
                message: 'Connexion à la base de données réussie'
            };
        } catch (error) {
            return { 
                success: false, 
                connected: false, 
                error: 'Impossible de se connecter à la base de données' 
            };
        }
    }

    // Nettoyer les données temporaires
    cleanup() {
        this.unsubscribeAll();
        console.log('Service de base de données nettoyé');
    }

    // Obtenir les rapports avec pagination
    async getReportsWithPagination(limitCount = 20, lastDoc = null, filters = {}) {
        try {
            let constraints = [orderBy('createdAt', 'desc'), limit(limitCount)];

            // Appliquer les filtres
            if (filters.agentUid) {
                constraints.push(where('agentUid', '==', filters.agentUid));
            }
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            if (filters.clientName) {
                constraints.push(where('clientName', '==', filters.clientName));
            }
            if (filters.isValidated !== undefined) {
                constraints.push(where('isValidated', '==', filters.isValidated));
            }

            let q = query(collection(db, this.collections.REPORTS), ...constraints);
            
            // Ajouter le startAfter si on a un dernier document
            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const reports = [];
            let lastVisible = null;
            
            querySnapshot.forEach((doc) => {
                reports.push({ id: doc.id, ...doc.data() });
                lastVisible = doc;
            });

            return {
                success: true,
                data: reports,
                lastDoc: lastVisible,
                hasMore: reports.length === limitCount
            };
        } catch (error) {
            return this.handleError(error, 'récupération pagination rapports');
        }
    }

    // Recherche avancée de rapports
    async searchReports(searchCriteria) {
        try {
            let constraints = [orderBy('createdAt', 'desc')];

            // Ajouter les critères de recherche
            if (searchCriteria.clientName) {
                constraints.push(where('clientName', '==', searchCriteria.clientName));
            }
            if (searchCriteria.agentName) {
                constraints.push(where('agentName', '==', searchCriteria.agentName));
            }
            if (searchCriteria.software) {
                constraints.push(where('software', '==', searchCriteria.software));
            }
            if (searchCriteria.type) {
                constraints.push(where('type', '==', searchCriteria.type));
            }
            if (searchCriteria.status) {
                constraints.push(where('status', '==', searchCriteria.status));
            }
            if (searchCriteria.startDate) {
                constraints.push(where('date', '>=', searchCriteria.startDate));
            }
            if (searchCriteria.endDate) {
                constraints.push(where('date', '<=', searchCriteria.endDate));
            }
            if (searchCriteria.isValidated !== undefined) {
                constraints.push(where('isValidated', '==', searchCriteria.isValidated));
            }

            const q = query(collection(db, this.collections.REPORTS), ...constraints);
            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                reports.push({ 
                    id: doc.id, 
                    ...data,
                    type: data.type || data.interventionType || 'Non spécifié'
                });
            });

            // Recherche textuelle dans l'objet si spécifié
            if (searchCriteria.keyword && reports.length > 0) {
                const keyword = searchCriteria.keyword.toLowerCase();
                return {
                    success: true,
                    data: reports.filter(report => 
                        report.object?.toLowerCase().includes(keyword) ||
                        report.technicalDetails?.toLowerCase().includes(keyword) ||
                        report.interlocutor?.toLowerCase().includes(keyword) ||
                        report.site?.toLowerCase().includes(keyword)
                    ),
                    count: reports.length
                };
            }

            return { 
                success: true, 
                data: reports,
                count: reports.length 
            };
        } catch (error) {
            return this.handleError(error, 'recherche rapports');
        }
    }

    // Générer un rapport PDF
    async generateReportPDF(reportId) {
        try {
            const reportResult = await this.getReportById(reportId);
            if (!reportResult.success) {
                return reportResult;
            }

            const report = reportResult.data;
            
            // Ici vous intégreriez une bibliothèque de génération PDF
            // Pour l'instant, retournons les données pour génération côté client
            return {
                success: true,
                data: {
                    report: report,
                    template: 'default',
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            return this.handleError(error, 'génération PDF');
        }
    }

    // Sauvegarder les paramètres utilisateur
    async saveUserSettings(userId, settings) {
        try {
            await updateDoc(doc(db, this.collections.USERS, userId), {
                settings: settings,
                updatedAt: serverTimestamp()
            });
            
            return { 
                success: true, 
                message: 'Paramètres sauvegardés avec succès' 
            };
        } catch (error) {
            return this.handleError(error, 'sauvegarde paramètres');
        }
    }

    // Récupérer les paramètres utilisateur
    async getUserSettings(userId) {
        try {
            const userResult = await this.getUserById(userId);
            if (!userResult.success) {
                return userResult;
            }
            
            return {
                success: true,
                data: userResult.data.settings || {}
            };
        } catch (error) {
            return this.handleError(error, 'récupération paramètres');
        }
    }
}

// Créer une instance unique du service
const databaseService = new DatabaseService();

// Exporter le service
export default databaseService;