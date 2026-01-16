import { auth, db, initializeFirebase, isFirebaseReady } from '../config/firebase.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
        
        // Initialiser Firebase si ce n'est pas déjà fait
        this.ensureFirebaseInitialized();
        
        // Démarrer l'écouteur d'authentification
        this.initAuthListener();
    }

    // S'assurer que Firebase est initialisé
    ensureFirebaseInitialized() {
        if (!isFirebaseReady()) {
            console.log('Initialisation de Firebase...');
            try {
                initializeFirebase();
                console.log('Firebase initialisé pour AuthService');
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de Firebase:', error);
                // Retenter l'initialisation après un délai
                setTimeout(() => {
                    try {
                        initializeFirebase();
                    } catch (retryError) {
                        console.error('Échec de la réinitialisation de Firebase:', retryError);
                        this.showNotification('Erreur de connexion au serveur. Veuillez rafraîchir la page.', 'error');
                    }
                }, 2000);
            }
        }
    }

    // Écouteur simple pour les changements d'authentification
    initAuthListener() {
        try {
            // Vérifier que l'objet auth existe
            if (!auth) {
                console.error('L\'objet auth de Firebase n\'est pas disponible');
                // Réessayer après un délai
                setTimeout(() => this.initAuthListener(), 1000);
                return;
            }
            
            console.log('Configuration de l\'écouteur d\'authentification...');
            
            onAuthStateChanged(auth, async (user) => {
                console.log('État d\'authentification changé:', user ? 'Connecté' : 'Déconnecté');
                
                if (user) {
                    // Utilisateur connecté, récupérer ses données Firestore
                    try {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            
                            // Vérifier si compte actif
                            if (userData.isActive === false) {
                                await this.logout();
                                this.currentUser = null;
                                this.notifyListeners(null, false);
                                return;
                            }
                            
                            this.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                fullName: userData.fullName || user.displayName || 'Utilisateur',
                                role: userData.role || 'agent',
                                isActive: userData.isActive === undefined ? true : userData.isActive
                            };
                            
                            console.log('Utilisateur connecté:', this.currentUser);
                            this.notifyListeners(this.currentUser, true);
                        } else {
                            // Pas de document utilisateur, déconnecter
                            console.warn('Document utilisateur non trouvé pour:', user.uid);
                            await this.logout();
                            this.currentUser = null;
                            this.notifyListeners(null, false);
                        }
                    } catch (error) {
                        console.error('Erreur chargement profil:', error);
                        this.currentUser = null;
                        this.notifyListeners(null, false);
                    }
                } else {
                    // Pas d'utilisateur connecté
                    console.log('Aucun utilisateur connecté');
                    this.currentUser = null;
                    this.notifyListeners(null, false);
                }
            }, (error) => {
                console.error('Erreur dans l\'écouteur d\'authentification:', error);
            });
            
            console.log('Écouteur d\'authentification configuré avec succès');
            
        } catch (error) {
            console.error('Erreur configuration écouteur auth:', error);
            // Réessayer après un délai
            setTimeout(() => this.initAuthListener(), 2000);
        }
    }

    // Méthode pour écouter les changements d'état d'authentification (compatibilité)
    onAuthStateChange(callback) {
        return this.subscribe(callback);
    }

    // Connexion
    async login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email et mot de passe requis');
            }
            
            // Vérifier que Firebase est prêt
            if (!auth) {
                throw new Error('Service d\'authentification non disponible');
            }
            
            // Valider le format de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Format d\'email invalide');
            }
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Récupérer données Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                console.error('Document utilisateur non trouvé pour:', user.uid);
                await this.logout();
                throw new Error('Compte non trouvé');
            }
            
            const userData = userDoc.data();
            
            // Vérifier si compte actif
            if (userData.isActive === false) {
                await this.logout();
                throw new Error('Ce compte a été désactivé');
            }
            
            // Mettre à jour currentUser
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                fullName: userData.fullName || user.displayName,
                role: userData.role || 'agent',
                isActive: userData.isActive === undefined ? true : userData.isActive
            };
            
            this.notifyListeners(this.currentUser, true);
            this.showNotification('Connexion réussie !', 'success');
            
            return {
                success: true,
                user: this.currentUser
            };
            
        } catch (error) {
            const message = this.getErrorMessage(error);
            this.showNotification(message, 'error');
            return { success: false, error: message };
        }
    }

    // Déconnexion
    async logout() {
        try {
            if (auth) {
                await signOut(auth);
            }
            this.currentUser = null;
            this.notifyListeners(null, false);
            this.showNotification('Déconnexion réussie', 'success');
            return { success: true };
        } catch (error) {
            const message = this.getErrorMessage(error);
            this.showNotification(message, 'error');
            return { success: false, error: message };
        }
    }

    // Réinitialiser mot de passe
    async resetPassword(email) {
        try {
            if (!email) {
                throw new Error('Email requis');
            }
            
            // Vérifier que Firebase est prêt
            if (!auth) {
                throw new Error('Service d\'authentification non disponible');
            }
            
            // Valider le format de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Format d\'email invalide');
            }
            
            await sendPasswordResetEmail(auth, email);
            this.showNotification('Email de réinitialisation envoyé', 'success');
            return { success: true };
        } catch (error) {
            const message = this.getErrorMessage(error);
            this.showNotification(message, 'error');
            return { success: false, error: message };
        }
    }

    // S'abonner aux changements
    subscribe(callback) {
        this.listeners.push(callback);
    
        if (typeof callback === 'function') {
            const result = {
                success: this.currentUser !== null,
                user: this.currentUser
            };
            callback(result);
        }
    
        // Fonction de désabonnement
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    

    // Notifier les abonnés
    notifyListeners(user, isLoggedIn) {
        const result = {
            success: !!isLoggedIn,
            user: isLoggedIn ? user : null
        };
    
        this.listeners.forEach(callback => {
            try {
                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                console.error('Erreur dans le callback:', error);
            }
        });
    }
    

    // Messages d'erreur
    getErrorMessage(error) {
        if (!error) return 'Erreur inconnue';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Email déjà utilisé';
            case 'auth/invalid-email':
                return 'Email invalide';
            case 'auth/weak-password':
                return 'Mot de passe trop faible (6 caractères minimum)';
            case 'auth/user-not-found':
                return 'Utilisateur non trouvé';
            case 'auth/wrong-password':
                return 'Mot de passe incorrect';
            case 'auth/too-many-requests':
                return 'Trop de tentatives, réessayez plus tard';
            case 'auth/user-disabled':
                return 'Compte désactivé';
            case 'auth/operation-not-allowed':
                return 'Opération non autorisée';
            case 'auth/network-request-failed':
                return 'Erreur réseau. Vérifiez votre connexion.';
            case 'auth/invalid-credential':
                return 'Identifiants invalides';
            default:
                // Si c'est une erreur personnalisée, retourner le message
                if (error.message && !error.code) {
                    return error.message;
                }
                return 'Erreur d\'authentification. Veuillez réessayer.';
        }
    }

    // Notification simple
    showNotification(message, type = 'info') {
        console.log(`Notification [${type}]: ${message}`);
        
        try {
            // Créer une notification simple
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                word-wrap: break-word;
            `;
            
            // Couleurs selon le type
            if (type === 'success') {
                notification.style.backgroundColor = '#10b981'; // vert
            } else if (type === 'error') {
                notification.style.backgroundColor = '#ef4444'; // rouge
            } else if (type === 'warning') {
                notification.style.backgroundColor = '#f59e0b'; // orange
            } else {
                notification.style.backgroundColor = '#3b82f6'; // bleu
            }
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Supprimer après 3 secondes
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
            
            // Ajouter les animations CSS si pas déjà présentes
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (error) {
            console.error('Erreur création notification:', error);
        }
    }

    // Obtenir l'utilisateur actuel
    getUser() {
        return this.currentUser;
    }

    // Vérifier si connecté
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Vérifier l'accès par rôle
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // Vérifier plusieurs rôles
    hasAnyRole(roles) {
        if (!this.currentUser) return false;
        return roles.includes(this.currentUser.role);
    }

    // Vérifier si administrateur ou responsable
    isAdminOrManager() {
        if (!this.currentUser) return false;
        return ['admin', 'manager', 'responsableIT', 'responsable'].includes(this.currentUser.role);
    }

    // Vérifier si le compte est actif
    isAccountActive() {
        return this.currentUser && this.currentUser.isActive !== false;
    }

    // Obtenir le nom d'affichage de l'utilisateur
    getDisplayName() {
        if (!this.currentUser) return 'Invité';
        return this.currentUser.fullName || this.currentUser.email || 'Utilisateur';
    }

    // Obtenir le rôle formaté
    getFormattedRole() {
        if (!this.currentUser) return 'Non connecté';
        
        const roleMap = {
            'agent': 'Agent',
            'responsable': 'Responsable IT',
            'admin': 'Administrateur'
        };
        
        return roleMap[this.currentUser.role] || this.currentUser.role;
    }

    // Vérifier si l'utilisateur peut créer/modifier des rapports
    canManageReports() {
        if (!this.currentUser) return false;
        
        // Tous les rôles connectés peuvent gérer des rapports
        return ['agent', 'responsable', 'admin'].includes(this.currentUser.role);
    }

    // Vérifier si l'utilisateur peut valider des rapports
    canValidateReports() {
        if (!this.currentUser) return false;
        
        // Seuls les responsables et admins peuvent valider
        return ['responsable', 'admin'].includes(this.currentUser.role);
    }

    // Vérifier si l'utilisateur peut gérer les clients et logiciels
    canManageResources() {
        if (!this.currentUser) return false;
        
        // Seuls les responsables et admins peuvent gérer les ressources
        return ['responsable', 'admin'].includes(this.currentUser.role);
    }

    // Méthode pour nettoyer les écouteurs (utile pour les tests)
    cleanup() {
        this.listeners = [];
    }
}

// Créer une instance unique du service
const authService = new AuthService();

// Exporter
export default authService;