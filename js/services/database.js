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
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { showNotification, handleFirebaseError } from '../utils/helpers.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, FIRESTORE_COLLECTIONS } from '../utils/constants.js';

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
        showNotification(message, 'error');
        return { success: false, error: message };
    }

    // ==================== UTILISATEURS ====================

    // Créer un utilisateur
    async createUser(userData) {
        try {
            const userRef = await addDoc(collection(db, this.collections.USERS), {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true,
                stats: {
                    totalReports: 0,
                    weekReports: 0,
                    monthReports: 0,
                    pendingReports: 0
                }
            });
            return { success: true, id: userRef.id };
        } catch (error) {
            return this.handleError(error, 'création utilisateur');
        }
    }

    // Obtenir un utilisateur par ID
    async getUserById(userId) {
        try {
            const userDoc = await getDoc(doc(db, this.collections.USERS, userId));
            if (userDoc.exists()) {
                return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
            }
            return { success: false, error: 'Utilisateur non trouvé' };
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
                return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
            }
            return { success: false, error: 'Utilisateur non trouvé' };
        } catch (error) {
            return this.handleError(error, 'recherche utilisateur');
        }
    }

    // Mettre à jour un utilisateur
    async updateUser(userId, updates) {
        try {
            await updateDoc(doc(db, this.collections.USERS, userId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return this.handleError(error, 'mise à jour utilisateur');
        }
    }

    // Obtenir tous les agents
    async getAllAgents() {
        try {
            const q = query(
                collection(db, this.collections.USERS), 
                where('role', '==', 'agent'),
                where('isActive', '==', true),
                orderBy('fullName', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const agents = [];
            
            querySnapshot.forEach((doc) => {
                agents.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: agents };
        } catch (error) {
            return this.handleError(error, 'récupération agents');
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
            
            return { success: true, data: clients };
        } catch (error) {
            return this.handleError(error, 'récupération clients');
        }
    }

    // Ajouter un nouveau client
    async addClient(clientName, createdBy) {
        try {
            // Vérifier si le client existe déjà
            const existingClientQuery = query(
                collection(db, this.collections.CLIENTS),
                where('name', '==', clientName)
            );
            const existingClient = await getDocs(existingClientQuery);
            
            if (!existingClient.empty) {
                return { 
                    success: false, 
                    error: 'Ce client existe déjà dans la base de données' 
                };
            }

            const clientRef = await addDoc(collection(db, this.collections.CLIENTS), {
                name: clientName,
                createdBy: createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showNotification(SUCCESS_MESSAGES.CLIENT_ADDED);
            return { success: true, id: clientRef.id };
        } catch (error) {
            return this.handleError(error, 'ajout client');
        }
    }

    // ==================== LOGICIELS ====================

    // Obtenir tous les logiciels
    async getAllSoftwares() {
        try {
            const q = query(
                collection(db, this.collections.SOFTWARES),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const softwares = [];
            
            querySnapshot.forEach((doc) => {
                softwares.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: softwares };
        } catch (error) {
            return this.handleError(error, 'récupération logiciels');
        }
    }

    // Ajouter un nouveau logiciel
    async addSoftware(softwareName, createdBy) {
        try {
            // Vérifier si le logiciel existe déjà
            const existingSoftwareQuery = query(
                collection(db, this.collections.SOFTWARES),
                where('name', '==', softwareName)
            );
            const existingSoftware = await getDocs(existingSoftwareQuery);
            
            if (!existingSoftware.empty) {
                return { 
                    success: false, 
                    error: 'Ce logiciel existe déjà dans la base de données' 
                };
            }

            const softwareRef = await addDoc(collection(db, this.collections.SOFTWARES), {
                name: softwareName,
                createdBy: createdBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showNotification(SUCCESS_MESSAGES.SOFTWARE_ADDED);
            return { success: true, id: softwareRef.id };
        } catch (error) {
            return this.handleError(error, 'ajout logiciel');
        }
    }

    // ==================== RAPPORTS ====================

    // Créer un rapport
    async createReport(reportData) {
        try {
            const reportRef = await addDoc(collection(db, this.collections.REPORTS), {
                ...reportData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Mettre à jour les statistiques de l'agent
            await this.updateAgentStats(reportData.agentUid, 'increment', reportData.status);
            
            showNotification(SUCCESS_MESSAGES.REPORT_CREATED);
            return { success: true, id: reportRef.id };
        } catch (error) {
            return this.handleError(error, 'création rapport');
        }
    }

    // Obtenir un rapport par ID
    async getReportById(reportId) {
        try {
            const reportDoc = await getDoc(doc(db, this.collections.REPORTS, reportId));
            if (reportDoc.exists()) {
                return { success: true, data: { id: reportDoc.id, ...reportDoc.data() } };
            }
            return { success: false, error: 'Rapport non trouvé' };
        } catch (error) {
            return this.handleError(error, 'récupération rapport');
        }
    }

    // Obtenir les rapports d'un agent
    async getAgentReports(agentUid, filters = {}) {
        try {
            let q = query(
                collection(db, this.collections.REPORTS),
                where('agentUid', '==', agentUid),
                orderBy('createdAt', 'desc')
            );

            // Ajouter des filtres supplémentaires si nécessaire
            if (filters.startDate) {
                q = query(q, where('date', '>=', filters.startDate));
            }
            if (filters.endDate) {
                q = query(q, where('date', '<=', filters.endDate));
            }
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }
            if (filters.client) {
                q = query(q, where('clientName', '==', filters.client));
            }

            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }

            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                reports.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: reports };
        } catch (error) {
            return this.handleError(error, 'récupération rapports agent');
        }
    }

    // Obtenir tous les rapports (pour le responsable)
    async getAllReports(filters = {}) {
        try {
            let q = collection(db, this.collections.REPORTS);
            const constraints = [];

            // Appliquer les filtres
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
            if (filters.interventionType) {
                constraints.push(where('interventionType', '==', filters.interventionType));
            }
            if (filters.software) {
                constraints.push(where('software', '==', filters.software));
            }

            // Ajouter l'ordre et la limite
            constraints.push(orderBy('createdAt', 'desc'));
            
            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            q = query(q, ...constraints);

            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                reports.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: reports };
        } catch (error) {
            return this.handleError(error, 'récupération tous les rapports');
        }
    }

    // Mettre à jour un rapport
    async updateReport(reportId, updates) {
        try {
            const oldReport = await this.getReportById(reportId);
            
            await updateDoc(doc(db, this.collections.REPORTS, reportId), {
                ...updates,
                updatedAt: serverTimestamp()
            });

            // Mettre à jour les stats si le statut a changé
            if (updates.status && oldReport.success) {
                const oldStatus = oldReport.data.status;
                const newStatus = updates.status;
                
                if (oldStatus !== newStatus) {
                    await this.updateAgentStatsOnStatusChange(
                        oldReport.data.agentUid, 
                        oldStatus, 
                        newStatus
                    );
                }
            }
            
            showNotification(SUCCESS_MESSAGES.REPORT_UPDATED);
            return { success: true };
        } catch (error) {
            return this.handleError(error, 'mise à jour rapport');
        }
    }

    // Supprimer un rapport
    async deleteReport(reportId, agentUid) {
        try {
            const report = await this.getReportById(reportId);
            if (!report.success) return report;

            await deleteDoc(doc(db, this.collections.REPORTS, reportId));
            
            // Mettre à jour les statistiques de l'agent
            await this.updateAgentStats(agentUid, 'decrement', report.data.status);
            
            showNotification(SUCCESS_MESSAGES.REPORT_DELETED);
            return { success: true };
        } catch (error) {
            return this.handleError(error, 'suppression rapport');
        }
    }

    // ==================== STATISTIQUES ====================

    // Obtenir les statistiques globales
    async getGlobalStatistics() {
        try {
            const [reportsResult, agentsResult, clientsResult] = await Promise.all([
                this.getAllReports(),
                this.getAllAgents(),
                this.getAllClients()
            ]);

            if (!reportsResult.success) return reportsResult;

            const reports = reportsResult.data;
            const stats = {
                totalReports: 0,
                totalAgents: agentsResult.success ? agentsResult.data.length : 0,
                totalClients: clientsResult.success ? clientsResult.data.length : 0,
                weekReports: 0,
                monthReports: 0,
                pendingReports: 0,
                byType: {},
                byStatus: {},
                bySoftware: {},
                topAgents: [],
                topClients: [],
                recentActivity: []
            };

            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const agentReports = {};
            const clientReports = {};
            const softwareReports = {};

            reports.forEach(report => {
                stats.totalReports++;

                const reportDate = new Date(report.date);
                if (reportDate >= oneWeekAgo) stats.weekReports++;
                if (reportDate >= oneMonthAgo) stats.monthReports++;
                if (report.status === 'En Attente') stats.pendingReports++;

                // Par type
                const type = report.interventionType || 'Non spécifié';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                // Par statut
                const status = report.status || 'Terminé';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Par logiciel
                const software = report.software || 'Non spécifié';
                stats.bySoftware[software] = (stats.bySoftware[software] || 0) + 1;

                // Compter par agent
                agentReports[report.agentName] = (agentReports[report.agentName] || 0) + 1;

                // Compter par client
                clientReports[report.clientName] = (clientReports[report.clientName] || 0) + 1;

                // Compter par logiciel
                softwareReports[report.software] = (softwareReports[report.software] || 0) + 1;
            });

            // Top agents (5 premiers)
            stats.topAgents = Object.entries(agentReports)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            // Top clients (5 premiers)
            stats.topClients = Object.entries(clientReports)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            // Top logiciels (5 premiers)
            stats.topSoftwares = Object.entries(softwareReports)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            // Activité récente (10 derniers rapports)
            stats.recentActivity = reports
                .slice(0, 10)
                .map(report => ({
                    id: report.id,
                    client: report.clientName,
                    agent: report.agentName,
                    date: report.date,
                    type: report.interventionType,
                    status: report.status
                }));

            return { success: true, data: stats };
        } catch (error) {
            return this.handleError(error, 'calcul statistiques');
        }
    }

    // Obtenir les statistiques d'un agent
    async getAgentStatistics(agentUid) {
        try {
            const reportsResult = await this.getAgentReports(agentUid);
            if (!reportsResult.success) return reportsResult;

            const reports = reportsResult.data;
            const stats = {
                totalReports: reports.length,
                weekReports: 0,
                monthReports: 0,
                pendingReports: 0,
                byClient: {},
                bySoftware: {},
                byStatus: {},
                totalHours: 0
            };

            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            reports.forEach(report => {
                const reportDate = new Date(report.date);
                if (reportDate >= oneWeekAgo) stats.weekReports++;
                if (reportDate >= oneMonthAgo) stats.monthReports++;
                if (report.status === 'En Attente') stats.pendingReports++;

                // Par client
                stats.byClient[report.clientName] = (stats.byClient[report.clientName] || 0) + 1;

                // Par logiciel
                stats.bySoftware[report.software] = (stats.bySoftware[report.software] || 0) + 1;

                // Par statut
                stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

                // Calcul du temps total (estimation)
                if (report.startTime && report.endTime) {
                    const start = new Date(`${report.date}T${report.startTime}`);
                    const end = new Date(`${report.date}T${report.endTime}`);
                    const durationHours = (end - start) / (1000 * 60 * 60);
                    stats.totalHours += Math.max(0, durationHours);
                }
            });

            return { success: true, data: stats };
        } catch (error) {
            return this.handleError(error, 'calcul statistiques agent');
        }
    }

    // Mettre à jour les statistiques d'un agent
    async updateAgentStats(agentUid, operation = 'increment', status = null) {
        try {
            const userDoc = await getDoc(doc(db, this.collections.USERS, agentUid));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const stats = userData.stats || { 
                totalReports: 0, 
                weekReports: 0, 
                monthReports: 0,
                pendingReports: 0
            };

            const increment = operation === 'increment' ? 1 : -1;

            stats.totalReports = Math.max(0, stats.totalReports + increment);
            stats.weekReports = Math.max(0, stats.weekReports + increment);
            stats.monthReports = Math.max(0, stats.monthReports + increment);

            if (status === 'En Attente') {
                stats.pendingReports = Math.max(0, stats.pendingReports + increment);
            }

            await updateDoc(doc(db, this.collections.USERS, agentUid), { 
                stats,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur mise à jour stats agent:', error);
        }
    }

    // Mettre à jour les stats lors du changement de statut
    async updateAgentStatsOnStatusChange(agentUid, oldStatus, newStatus) {
        try {
            const userDoc = await getDoc(doc(db, this.collections.USERS, agentUid));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const stats = userData.stats || { pendingReports: 0 };

            // Si l'ancien statut était "En Attente" et le nouveau ne l'est pas
            if (oldStatus === 'En Attente' && newStatus !== 'En Attente') {
                stats.pendingReports = Math.max(0, (stats.pendingReports || 0) - 1);
            }
            // Si le nouveau statut est "En Attente" et l'ancien ne l'était pas
            else if (newStatus === 'En Attente' && oldStatus !== 'En Attente') {
                stats.pendingReports = (stats.pendingReports || 0) + 1;
            }

            await updateDoc(doc(db, this.collections.USERS, agentUid), { 
                stats,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur mise à jour stats statut:', error);
        }
    }

    // ==================== TEMPS RÉEL ====================

    // Écouter les changements de rapports
    subscribeToReports(callback, filters = {}) {
        try {
            let q = collection(db, this.collections.REPORTS);
            const constraints = [];

            if (filters.agentUid) {
                constraints.push(where('agentUid', '==', filters.agentUid));
            }
            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            
            constraints.push(orderBy('createdAt', 'desc'));

            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            q = query(q, ...constraints);

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const reports = [];
                    snapshot.forEach((doc) => {
                        reports.push({ id: doc.id, ...doc.data() });
                    });
                    callback({ success: true, data: reports });
                },
                (error) => {
                    console.error('Erreur souscription rapports:', error);
                    callback({ success: false, error: error.message });
                }
            );

            // Stocker la fonction de désinscription
            this.unsubscribers.set('reports', unsubscribe);

            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription rapports:', error);
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
                    callback({ success: true, data: clients });
                },
                (error) => {
                    console.error('Erreur souscription clients:', error);
                    callback({ success: false, error: error.message });
                }
            );

            this.unsubscribers.set('clients', unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription clients:', error);
            return null;
        }
    }

    // Écouter les changements de logiciels
    subscribeToSoftwares(callback) {
        try {
            const q = query(
                collection(db, this.collections.SOFTWARES),
                orderBy('name', 'asc')
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const softwares = [];
                    snapshot.forEach((doc) => {
                        softwares.push({ id: doc.id, ...doc.data() });
                    });
                    callback({ success: true, data: softwares });
                },
                (error) => {
                    console.error('Erreur souscription logiciels:', error);
                    callback({ success: false, error: error.message });
                }
            );

            this.unsubscribers.set('softwares', unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erreur configuration souscription logiciels:', error);
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

    // ==================== OPÉRATIONS EN LOT ====================

    // Importer plusieurs rapports
    async importReports(reportsData) {
        try {
            const batch = writeBatch(db);
            const results = { success: 0, failed: 0, errors: [] };

            for (let i = 0; i < reportsData.length; i++) {
                try {
                    const reportData = reportsData[i];
                    const reportRef = doc(collection(db, this.collections.REPORTS));
                    batch.set(reportRef, {
                        ...reportData,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({ index: i, error: error.message });
                }
            }

            await batch.commit();
            
            const message = `Import terminé: ${results.success} réussis, ${results.failed} échoués`;
            showNotification(message, results.failed > 0 ? 'warning' : 'success');
            
            return { 
                success: true, 
                results,
                message
            };
        } catch (error) {
            return this.handleError(error, 'import rapports');
        }
    }

    // Exporter les rapports
    async exportReports(format = 'json', filters = {}) {
        try {
            const result = await this.getAllReports(filters);
            if (!result.success) return result;

            const reports = result.data;
            const timestamp = new Date().toISOString().split('T')[0];
            
            if (format === 'json') {
                const dataStr = JSON.stringify(reports, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `rapports_export_${timestamp}.json`;
                
                this.downloadFile(dataUri, exportFileDefaultName);
            } else if (format === 'csv') {
                // Conversion simple en CSV
                if (reports.length === 0) {
                    showNotification('Aucune donnée à exporter', 'warning');
                    return { success: false, error: 'Aucune donnée' };
                }

                const headers = Object.keys(reports[0]);
                const csvContent = [
                    headers.join(','),
                    ...reports.map(row => 
                        headers.map(header => {
                            const value = row[header];
                            return typeof value === 'string' && value.includes(',') 
                                ? `"${value}"` 
                                : value;
                        }).join(',')
                    )
                ].join('\n');

                const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
                const exportFileDefaultName = `rapports_export_${timestamp}.csv`;
                
                this.downloadFile(dataUri, exportFileDefaultName);
            }

            showNotification(SUCCESS_MESSAGES.EXPORT_SUCCESS);
            return { success: true };
        } catch (error) {
            return this.handleError(error, 'export rapports');
        }
    }

    // Télécharger un fichier
    downloadFile(dataUri, filename) {
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.style.display = 'none';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    }

    // ==================== UTILITAIRES ====================

    // Vérifier la connexion à la base de données
    async checkConnection() {
        try {
            // Essayer de lire un document simple
            const testQuery = query(collection(db, this.collections.USERS), limit(1));
            await getDocs(testQuery);
            return { success: true, connected: true };
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
    }
}

// Créer une instance unique du service
const databaseService = new DatabaseService();

// Exporter le service
export default databaseService;