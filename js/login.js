// =================================================================
        // IMPORTS FIRESTORE
        // =================================================================
        import { auth, db, initializeFirebase } from './js/config/firebase.js';
        import { 
            signInWithEmailAndPassword,
            sendPasswordResetEmail,
            onAuthStateChanged,
            signOut
        } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
        import { 
            doc,
            getDoc
        } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
        
        // =================================================================
        // INITIALISATION GLOBALE
        // =================================================================
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🚀 Démarrage de l\'application de connexion...');
            
            try {
                // 1. Initialiser Firebase
                console.log('1. Initialisation Firebase...');
                await initializeFirebase();
                console.log('✅ Firebase initialisé');
                
                // 2. Initialiser le gestionnaire de login
                console.log('2. Création LoginManager...');
                window.loginManager = new LoginManager();
                await window.loginManager.initialize();
                
                console.log('✅ Application de connexion initialisée avec succès');
                
            } catch (error) {
                console.error('💥 ERREUR initialisation connexion:', error);
                
                // Afficher un message d'erreur à l'utilisateur
                const errorDiv = document.getElementById('errorMessage');
                if (errorDiv) {
                    errorDiv.textContent = 'Erreur de chargement de l\'application. Veuillez recharger la page.';
                    errorDiv.classList.remove('hidden');
                } else {
                    alert('Erreur de chargement de l\'application. Veuillez recharger la page.');
                }
                
                // Désactiver le formulaire
                const loginForm = document.getElementById('loginForm');
                const loginBtn = document.getElementById('loginBtn');
                if (loginForm) loginForm.style.opacity = '0.5';
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = 'Application non disponible';
                }
            }
        });

        // =================================================================
        // CLASSE LOGIN MANAGER
        // =================================================================
        class LoginManager {
            constructor() {
                this.elements = {};
                this.isInitialized = false;
            }

            // =================================================================
            // MÉTHODES D'INITIALISATION
            // =================================================================
            async initialize() {
                console.log('🔄 Initialisation du LoginManager...');
                this.initElements();
                this.initEventListeners();
                this.loadSavedEmail();
                await this.setupAuthListener();
                this.isInitialized = true;
                console.log('✅ LoginManager initialisé');
            }

            initElements() {
                this.elements = {
                    loginForm: document.getElementById('loginForm'),
                    emailInput: document.getElementById('email'),
                    passwordInput: document.getElementById('password'),
                    rememberCheckbox: document.getElementById('remember'),
                    loginBtn: document.getElementById('loginBtn'),
                    togglePasswordBtn: document.getElementById('togglePassword'),
                    toggleIcon: document.getElementById('toggleIcon'),
                    errorDiv: document.getElementById('errorMessage'),
                    successDiv: document.getElementById('successMessage'),
                    resetBtn: document.getElementById('resetBtn'),
                    resetModal: document.getElementById('resetModal'),
                    resetEmailInput: document.getElementById('resetEmail'),
                    resetErrorDiv: document.getElementById('resetErrorMessage'),
                    resetSuccessDiv: document.getElementById('resetSuccessMessage'),
                    resetPasswordForm: document.getElementById('resetPasswordForm'),
                    closeModal: document.getElementById('closeModal'),
                    cancelReset: document.getElementById('cancelReset')
                };
            }

            initEventListeners() {
                // Formulaire de connexion
                this.elements.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
                
                // Toggle password visibility
                this.elements.togglePasswordBtn?.addEventListener('click', () => this.togglePassword());
                
                // Reset password
                this.elements.resetBtn?.addEventListener('click', () => this.openResetModal());
                
                // Modal events
                this.elements.closeModal?.addEventListener('click', () => this.closeResetModal());
                this.elements.cancelReset?.addEventListener('click', () => this.closeResetModal());
                this.elements.resetPasswordForm?.addEventListener('submit', (e) => this.handlePasswordReset(e));
                
                // Fermer modal avec ESC
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.elements.resetModal?.classList.contains('hidden') === false) {
                        this.closeResetModal();
                    }
                });
                
                // Fermer modal en cliquant à l'extérieur
                this.elements.resetModal?.addEventListener('click', (e) => {
                    if (e.target === this.elements.resetModal) {
                        this.closeResetModal();
                    }
                });
                
                // Entrée rapide - Se connecter avec Enter
                this.elements.passwordInput?.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !this.elements.loginBtn?.disabled) {
                        e.preventDefault();
                        this.elements.loginForm?.requestSubmit();
                    }
                });
            }

            async setupAuthListener() {
                console.log('👀 Configuration de l\'écouteur d\'authentification...');
                
                return new Promise((resolve) => {
                    onAuthStateChanged(auth, (user) => {
                        console.log('🔄 État auth changé:', user ? `✅ Connecté (${user.email})` : '❌ Déconnecté');
                        
                        if (user) {
                            console.log('📥 Utilisateur déjà connecté, vérification du rôle...');
                            this.getUserRoleAndRedirect(user.uid);
                        }
                        resolve();
                    });
                });
            }

            async getUserRoleAndRedirect(userId) {
                console.log('🎯 getUserRoleAndRedirect pour UID:', userId);
                
                try {
                    // 1. Récupérer les données utilisateur
                    console.log('📥 Récupération du document utilisateur...');
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    
                    if (!userDoc.exists()) {
                        console.warn('⚠️ Document utilisateur non trouvé dans Firestore');
                        console.log('ℹ️ Création du document utilisateur par défaut...');
                        
                        // Créer un document utilisateur par défaut
                        const user = auth.currentUser;
                        const defaultUserData = {
                            email: user.email,
                            fullName: user.email.split('@')[0],
                            role: 'technicien', // Rôle par défaut
                            createdAt: new Date(),
                            lastLogin: new Date()
                        };
                        
                        // IMPORTANT: Ici vous devriez utiliser addDoc ou setDoc
                        // Mais pour l'instant, on redirige avec le rôle par défaut
                        console.log('➡️ Redirection vers agent-dashboard (rôle par défaut)');
                        window.location.href = 'agent-dashboard.html';
                        return;
                    }
                    
                    // 2. Récupérer les données
                    const userData = userDoc.data();
                    console.log('📄 Données utilisateur:', userData);
                    
                    const role = userData.role || 'technicien';
                    const fullName = userData.fullName || userData.email || 'Utilisateur';
                    
                    console.log('🎭 Rôle détecté:', role, 'Nom:', fullName);
                    
                    // 3. Mettre à jour la dernière connexion
                    console.log('🕒 Mise à jour lastLogin...');
                    
                    // 4. Déterminer la redirection
                    console.log('🔀 Détermination de la redirection...');
                    
                    // Liste des rôles qui accèdent au dashboard responsable
                    const responsableRoles = [
                        'responsableit', 'responsable', 'admin', 
                        'manager', 'superviseur', 'chef_equipe',
                        'responsable it', 'Responsable IT'
                    ];
                    
                    const normalizedRole = String(role).toLowerCase().replace(/\s+/g, '');
                    const isResponsable = responsableRoles.some(r => 
                        normalizedRole.includes(r.toLowerCase()) || 
                        r.toLowerCase().includes(normalizedRole)
                    );
                    
                    const targetPage = isResponsable ? 'responsable-dashboard.html' : 'agent-dashboard.html';
                    console.log(`🎯 Redirection vers: ${targetPage} (rôle: ${role})`);
                    
                    // 5. Rediriger
                    setTimeout(() => {
                        console.log(`📍 Navigation vers ${targetPage}`);
                        window.location.href = targetPage;
                    }, 500);
                    
                } catch (error) {
                    console.error('💥 Erreur récupération rôle:', error);
                    console.log('➡️ Redirection de secours vers agent-dashboard');
                    window.location.href = 'agent-dashboard.html';
                }
            }

            // =================================================================
            // GESTION DE LA CONNEXION
            // =================================================================
            async handleLogin(event) {
                event.preventDefault();
                console.log('🔑 Tentative de connexion...');
                
                const email = this.elements.emailInput?.value.trim();
                const password = this.elements.passwordInput?.value;
                const remember = this.elements.rememberCheckbox?.checked;
                
                this.resetMessages();
                
                // Validation
                if (!email || !this.validateEmail(email)) {
                    this.showError('Veuillez entrer une adresse email valide');
                    this.elements.emailInput?.focus();
                    return;
                }
                
                if (!password) {
                    this.showError('Veuillez entrer votre mot de passe');
                    this.elements.passwordInput?.focus();
                    return;
                }
                
                this.setLoadingState(true);
                
                try {
                    console.log(`📧 Connexion pour: ${email}`);
                    
                    // Authentification Firebase
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    
                    console.log('✅ Authentification réussie:', user.uid);
                    
                    // Sauvegarder l'email si "Se souvenir de moi"
                    this.handleRememberMe(email, remember);
                    
                    // Afficher message de succès
                    this.showSuccess('Connexion réussie ! Redirection en cours...');
                    
                    // La redirection se fera via onAuthStateChanged
                    
                } catch (error) {
                    console.error('❌ Erreur de connexion:', error);
                    this.handleLoginError(error);
                    this.setLoadingState(false);
                }
            }

            validateEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }

            handleRememberMe(email, remember) {
                if (remember) {
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('rememberMe');
                }
            }

            handleLoginError(error) {
                let errorMessage = 'Erreur de connexion';
                
                if (error.code) {
                    switch(error.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'Aucun compte trouvé avec cet email';
                            break;
                        case 'auth/wrong-password':
                            errorMessage = 'Mot de passe incorrect';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Format d\'email invalide';
                            break;
                        case 'auth/user-disabled':
                            errorMessage = 'Ce compte a été désactivé';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Trop de tentatives. Veuillez patienter';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Problème de connexion internet';
                            break;
                        case 'auth/invalid-credential':
                            errorMessage = 'Identifiants invalides';
                            break;
                        default:
                            errorMessage = `Erreur: ${error.code}`;
                    }
                }
                
                this.showError(errorMessage);
            }

            // =================================================================
            // RÉINITIALISATION MOT DE PASSE
            // =================================================================
            openResetModal() {
                this.elements.resetModal?.classList.remove('hidden');
                this.elements.resetErrorDiv?.classList.add('hidden');
                this.elements.resetSuccessDiv?.classList.add('hidden');
                
                // Pré-remplir avec l'email actuel
                const currentEmail = this.elements.emailInput?.value.trim();
                if (currentEmail && this.validateEmail(currentEmail)) {
                    this.elements.resetEmailInput.value = currentEmail;
                }
                
                setTimeout(() => {
                    this.elements.resetEmailInput?.focus();
                }, 100);
            }

            closeResetModal() {
                this.elements.resetModal?.classList.add('hidden');
                this.elements.resetEmailInput.value = '';
            }

            async handlePasswordReset(event) {
                event.preventDefault();
                
                const email = this.elements.resetEmailInput?.value.trim();
                
                if (!this.validateEmail(email)) {
                    this.showResetError('Veuillez entrer une adresse email valide');
                    this.elements.resetEmailInput?.focus();
                    return;
                }
                
                try {
                    console.log('📧 Envoi de réinitialisation pour:', email);
                    await sendPasswordResetEmail(auth, email);
                    
                    this.elements.resetErrorDiv?.classList.add('hidden');
                    this.elements.resetSuccessDiv.textContent = `Un email de réinitialisation a été envoyé à ${email}`;
                    this.elements.resetSuccessDiv?.classList.remove('hidden');
                    
                    setTimeout(() => {
                        this.closeResetModal();
                    }, 3000);
                    
                } catch (error) {
                    console.error('❌ Erreur réinitialisation:', error);
                    this.handleResetError(error);
                }
            }

            handleResetError(error) {
                let errorMessage = 'Erreur lors de l\'envoi de l\'email';
                
                if (error.code) {
                    switch(error.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'Aucun compte trouvé avec cet email';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Adresse email invalide';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Trop de tentatives. Réessayez plus tard';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Erreur de connexion réseau';
                            break;
                    }
                }
                
                this.showResetError(errorMessage);
            }

            // =================================================================
            // UTILITAIRES
            // =================================================================
            loadSavedEmail() {
                const savedEmail = localStorage.getItem('userEmail');
                const rememberMe = localStorage.getItem('rememberMe') === 'true';
                
                if (savedEmail && rememberMe && this.elements.emailInput) {
                    this.elements.emailInput.value = savedEmail;
                    this.elements.rememberCheckbox.checked = true;
                    this.elements.passwordInput?.focus();
                } else {
                    this.elements.emailInput?.focus();
                }
            }

            togglePassword() {
                const passwordField = this.elements.passwordInput;
                const toggleIcon = this.elements.toggleIcon;
                
                if (!passwordField || !toggleIcon) return;
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
                    toggleIcon.setAttribute('title', 'Masquer le mot de passe');
                } else {
                    passwordField.type = 'password';
                    toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
                    toggleIcon.setAttribute('title', 'Afficher le mot de passe');
                }
                
                passwordField.focus();
            }

            resetMessages() {
                this.elements.errorDiv?.classList.add('hidden');
                this.elements.successDiv?.classList.add('hidden');
            }

            showError(message) {
                if (!this.elements.errorDiv) return;
                
                this.elements.errorDiv.textContent = message;
                this.elements.errorDiv.classList.remove('hidden');
                
                setTimeout(() => {
                    this.elements.errorDiv.classList.add('hidden');
                }, 5000);
            }

            showSuccess(message) {
                if (!this.elements.successDiv) return;
                
                this.elements.successDiv.textContent = message;
                this.elements.successDiv.classList.remove('hidden');
            }

            showResetError(message) {
                if (!this.elements.resetErrorDiv) return;
                
                this.elements.resetErrorDiv.textContent = message;
                this.elements.resetErrorDiv.classList.remove('hidden');
            }

            setLoadingState(isLoading) {
                if (!this.elements.loginBtn) return;
                
                if (isLoading) {
                    this.elements.loginBtn.disabled = true;
                    this.elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Connexion...';
                    this.elements.loginBtn.classList.add('opacity-75', 'cursor-not-allowed');
                } else {
                    this.elements.loginBtn.disabled = false;
                    this.elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Se connecter';
                    this.elements.loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
            }
        }

        // =================================================================
        // FONCTIONS GLOBALES
        // =================================================================
        window.togglePassword = function() {
            if (window.loginManager) {
                window.loginManager.togglePassword();
            }
        };
        
        window.resetPassword = function() {
            if (window.loginManager) {
                window.loginManager.openResetModal();
            }
        };