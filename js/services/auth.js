// js/services/auth.js

import { auth, db } from '../config/firebase.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { showNotification, handleFirebaseError } from '../utils/helpers.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, FIRESTORE_COLLECTIONS } from '../utils/constants.js';

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    // Inscription d'un nouvel utilisateur
    async register(userData) {
        try {
            const { email, password, fullName, role = 'agent' } = userData;

            // Validation du rôle
        const allowedRoles = ['agent', 'responsable', 'admin'];
        if (!allowedRoles.includes(role)) {
            throw new Error('Rôle non autorisé');
        }

            // Créer l'utilisateur dans Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Mettre à jour le profil avec le nom complet
            await updateProfile(user, {
                displayName: fullName
            });

            // Créer le document utilisateur dans Firestore
            await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid), {
                uid: user.uid,
                email: email,
                fullName: fullName,
                role: role,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                stats: {
                    totalReports: 0,
                    weekReports: 0,
                    monthReports: 0,
                    pendingReports: 0
                }
            });

            showNotification(`Inscription réussie! Vous êtes ${role === 'agent' ? 'un Agent' : 'un Responsable IT'}`);
            
        } catch (error) {
            console.error('Erreur inscription:', error);
            const message = this.getAuthErrorMessage(error);
            showNotification(message, 'error');
            return { success: false, error: message };
        }
    }

    // Connexion
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Vérifier que l'utilisateur existe dans Firestore et est actif
            const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid));
            
            if (!userDoc.exists()) {
                await signOut(auth);
                showNotification('Compte non trouvé dans le système', 'error');
                return { success: false, error: 'Compte non trouvé' };
            }

            const userData = userDoc.data();
            if (!userData.isActive) {
                await signOut(auth);
                showNotification('Ce compte a été désactivé', 'error');
                return { success: false, error: 'Compte désactivé' };
            }

            this.currentUser = { ...user, ...userData };
            showNotification(SUCCESS_MESSAGES.LOGIN_SUCCESS);
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Erreur connexion:', error);
            const message = this.getAuthErrorMessage(error);
            showNotification(message, 'error');
            return { success: false, error: message };
        }
    }

    // Déconnexion
    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            showNotification('Déconnexion réussie', 'success');
            return { success: true };
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            showNotification('Erreur lors de la déconnexion', 'error');
            return { success: false, error: error.message };
        }
    }

    // Vérifier l'état d'authentification
    onAuthStateChange(callback) {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Récupérer les données supplémentaires depuis Firestore
                try {
                    const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        this.currentUser = { ...user, ...userData };
                        callback({ success: true, user: this.currentUser });
                    } else {
                        // Si le document n'existe pas, déconnecter l'utilisateur
                        await this.logout();
                        callback({ success: false, error: 'Profil utilisateur non trouvé' });
                    }
                } catch (error) {
                    console.error('Erreur récupération profil:', error);
                    callback({ success: false, error: error.message });
                }
            } else {
                this.currentUser = null;
                callback({ success: false, user: null });
            }
        });
    }

    // Obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.currentUser;
    }

    // Vérifier si l'utilisateur est connecté
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Vérifier le rôle de l'utilisateur
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // Messages d'erreur d'authentification
    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return ERROR_MESSAGES.AUTH_EMAIL_EXISTS;
            case 'auth/invalid-email':
                return ERROR_MESSAGES.AUTH_INVALID_EMAIL;
            case 'auth/weak-password':
                return ERROR_MESSAGES.AUTH_WEAK_PASSWORD;
            case 'auth/user-not-found':
                return ERROR_MESSAGES.AUTH_USER_NOT_FOUND;
            case 'auth/wrong-password':
                return ERROR_MESSAGES.AUTH_WRONG_PASSWORD;
            case 'auth/too-many-requests':
                return ERROR_MESSAGES.AUTH_TOO_MANY_REQUESTS;
            case 'auth/network-request-failed':
                return ERROR_MESSAGES.NETWORK_ERROR;
            default:
                return error.message || ERROR_MESSAGES.GENERIC_ERROR;
        }
    }

  // Dans js/services/auth.js - Ajouter cette méthode
  // Réinitialiser le mot de passe
  async resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('Un email de réinitialisation a été envoyé', 'success');
        return { success: true };
    } catch (error) {
        console.error('Erreur réinitialisation mot de passe:', error);
        const message = this.getAuthErrorMessage(error);
        showNotification(message, 'error');
        return { success: false, error: message };
    }
}

}

const authService = new AuthService();
export default authService