 // =================================================================
        // IMPORTS FIRESTORE (en premier)
        // =================================================================
        import { auth, db, initializeFirebase } from './js/config/firebase.js';
        import { 
            createUserWithEmailAndPassword,
            sendEmailVerification,
            onAuthStateChanged
        } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
        import { 
            doc,
            setDoc,
            serverTimestamp
        } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
        
        // =================================================================
        // INITIALISATION GLOBALE
        // =================================================================
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                console.log('Démarrage de l\'initialisation...');
                
                // 1. Initialiser Firebase d'abord
                if (!auth) {
                    await initializeFirebase();
                    console.log('Firebase initialisé');
                }
                
                // 2. Initialiser le gestionnaire d'inscription
                window.registerManager = new RegisterManager();
                await window.registerManager.initialize();
                
                console.log('Inscription initialisée avec succès');
                
            } catch (error) {
                console.error('Erreur initialisation inscription:', error);
                
                // Afficher un message d'erreur à l'utilisateur
                const messageDiv = document.getElementById('message');
                if (messageDiv) {
                    messageDiv.textContent = 'Erreur de chargement de l\'application. Veuillez recharger la page.';
                    messageDiv.className = 'p-3 rounded text-sm bg-red-100 text-red-700 border border-red-200';
                    messageDiv.classList.remove('hidden');
                } else {
                    alert('Erreur de chargement de l\'application. Veuillez recharger la page.');
                }
                
                // Désactiver le formulaire
                const registerForm = document.getElementById('registerForm');
                const registerBtn = document.getElementById('registerBtn');
                if (registerForm) registerForm.style.opacity = '0.5';
                if (registerBtn) {
                    registerBtn.disabled = true;
                    registerBtn.textContent = 'Application non disponible';
                }
            }
        });

        // =================================================================
        // CLASSE REGISTER MANAGER
        // =================================================================
        class RegisterManager {
            constructor() {
                this.elements = {};
                this.isInitialized = false;
            }

            // =================================================================
            // MÉTHODES D'INITIALISATION
            // =================================================================
            async initialize() {
                console.log('Initialisation du RegisterManager...');
                this.initElements();
                this.initEventListeners();
                this.setupAuthListener();
                this.isInitialized = true;
            }

            initElements() {
                this.elements = {
                    registerForm: document.getElementById('registerForm'),
                    fullNameInput: document.getElementById('fullName'),
                    emailInput: document.getElementById('email'),
                    roleSelect: document.getElementById('role'),
                    passwordInput: document.getElementById('password'),
                    confirmPasswordInput: document.getElementById('confirmPassword'),
                    registerBtn: document.getElementById('registerBtn'),
                    messageDiv: document.getElementById('message'),
                    togglePasswordBtn: document.getElementById('togglePassword'),
                    togglePasswordIcon: document.getElementById('togglePasswordIcon'),
                    toggleConfirmPasswordBtn: document.getElementById('toggleConfirmPassword'),
                    toggleConfirmPasswordIcon: document.getElementById('toggleConfirmPasswordIcon'),
                    passwordStrength: document.getElementById('passwordStrength'),
                    passwordMatch: document.getElementById('passwordMatch'),
                    roleInfo: document.getElementById('roleInfo')
                };
            }

            initEventListeners() {
                // Formulaire d'inscription
                this.elements.registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
                
                // Toggle password visibility
                this.elements.togglePasswordBtn?.addEventListener('click', () => 
                    this.togglePasswordVisibility('password'));
                
                this.elements.toggleConfirmPasswordBtn?.addEventListener('click', () => 
                    this.togglePasswordVisibility('confirmPassword'));
                
                // Validation en temps réel
                this.elements.passwordInput?.addEventListener('input', () => this.validatePasswordStrength());
                this.elements.confirmPasswordInput?.addEventListener('input', () => this.validatePasswordMatch());
                
                // Sélection du rôle
                this.elements.roleSelect?.addEventListener('change', (e) => {
                    this.handleRoleChange(e.target.value);
                });
            }

            setupAuthListener() {
                // Vérifier si l'utilisateur est déjà connecté
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        console.log('Utilisateur déjà connecté, redirection...');
                        // Rediriger vers la page appropriée
                        // Note: Nous ne savons pas encore le rôle, donc on redirige vers le login
                        window.location.href = 'login.html';
                    }
                });
            }

            // =================================================================
            // GESTION DE L'INSCRIPTION
            // =================================================================
            async handleRegister(event) {
                event.preventDefault();
                
                const fullName = this.elements.fullNameInput?.value.trim();
                const email = this.elements.emailInput?.value.trim();
                const role = this.elements.roleSelect?.value;
                const password = this.elements.passwordInput?.value;
                const confirmPassword = this.elements.confirmPasswordInput?.value;
                
                this.resetMessage();
                
                // Validation
                if (!this.validateForm(fullName, email, role, password, confirmPassword)) {
                    return;
                }
                
                this.setLoadingState(true);
                
                try {
                    console.log('Tentative d\'inscription pour:', email, 'role:', role);
                    
                    // 1. Créer l'utilisateur dans Firebase Authentication
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    
                    console.log('Utilisateur créé dans Auth:', user.uid);
                    
                    // 2. Créer le document utilisateur dans Firestore
                    const userData = {
                        uid: user.uid,
                        email: user.email,
                        fullName: fullName,
                        role: role,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        isActive: true,
                        emailVerified: false
                    };
                    
                    await setDoc(doc(db, 'users', user.uid), userData);
                    console.log('Document utilisateur créé dans Firestore');
                    
                    // 3. Envoyer l'email de vérification
                    try {
                        await sendEmailVerification(user);
                        console.log('Email de vérification envoyé');
                    } catch (emailError) {
                        console.warn('Impossible d\'envoyer l\'email de vérification:', emailError);
                        // Ne pas bloquer l'inscription pour cette erreur
                    }
                    
                    // 4. Afficher le message de succès
                    this.showMessage('Inscription réussie! Redirection vers la connexion...', 'success');
                    
                    // 5. Déconnexion automatique et redirection
                    setTimeout(async () => {
                        try {
                            await auth.signOut();
                            window.location.href = 'login.html';
                        } catch (logoutError) {
                            console.error('Erreur déconnexion:', logoutError);
                            window.location.href = 'login.html';
                        }
                    }, 2000);
                    
                } catch (error) {
                    console.error('Erreur d\'inscription complète:', error);
                    this.handleRegistrationError(error);
                    this.setLoadingState(false);
                }
            }

            validateForm(fullName, email, role, password, confirmPassword) {
                // Validation du nom complet
                if (!fullName) {
                    this.showMessage('Le nom complet est requis', 'error');
                    this.elements.fullNameInput?.focus();
                    return false;
                }

                if (fullName.length < 2) {
                    this.showMessage('Le nom complet doit contenir au moins 2 caractères', 'error');
                    this.elements.fullNameInput?.focus();
                    return false;
                }

                // Validation de l'email
                if (!this.validateEmail(email)) {
                    this.showMessage('Veuillez entrer une adresse email valide', 'error');
                    this.elements.emailInput?.focus();
                    return false;
                }

                // Validation du rôle
                if (!role) {
                    this.showMessage('Veuillez sélectionner un rôle', 'error');
                    this.elements.roleSelect?.focus();
                    return false;
                }

                // Validation du mot de passe
                if (!this.validatePassword(password)) {
                    this.showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
                    this.elements.passwordInput?.focus();
                    return false;
                }

                // Validation de la confirmation
                if (password !== confirmPassword) {
                    this.showMessage('Les mots de passe ne correspondent pas', 'error');
                    this.elements.confirmPasswordInput?.focus();
                    return false;
                }

                return true;
            }

            validateEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }

            validatePassword(password) {
                return password.length >= 6;
            }

            // =================================================================
            // UTILITAIRES UI
            // =================================================================
            togglePasswordVisibility(fieldType) {
                const elements = {
                    password: {
                        input: this.elements.passwordInput,
                        icon: this.elements.togglePasswordIcon
                    },
                    confirmPassword: {
                        input: this.elements.confirmPasswordInput,
                        icon: this.elements.toggleConfirmPasswordIcon
                    }
                };
                
                const field = elements[fieldType];
                if (!field.input || !field.icon) return;
                
                if (field.input.type === 'password') {
                    field.input.type = 'text';
                    field.icon.classList.replace('fa-eye', 'fa-eye-slash');
                    field.icon.setAttribute('title', 'Masquer le mot de passe');
                } else {
                    field.input.type = 'password';
                    field.icon.classList.replace('fa-eye-slash', 'fa-eye');
                    field.icon.setAttribute('title', 'Afficher le mot de passe');
                }
            }

            validatePasswordStrength() {
                const password = this.elements.passwordInput?.value;
                if (!password) return;
                
                if (this.elements.passwordStrength) {
                    let strength = 'Faible';
                    let color = 'text-red-500';
                    
                    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
                        strength = 'Fort';
                        color = 'text-green-500';
                    } else if (password.length >= 6) {
                        strength = 'Moyen';
                        color = 'text-yellow-500';
                    }
                    
                    this.elements.passwordStrength.textContent = `Force : ${strength}`;
                    this.elements.passwordStrength.className = `${color}`;
                }
            }

            validatePasswordMatch() {
                const password = this.elements.passwordInput?.value;
                const confirmPassword = this.elements.confirmPasswordInput?.value;
                
                if (!password || !confirmPassword || !this.elements.passwordMatch) return;
                
                if (password === confirmPassword) {
                    this.elements.passwordMatch.textContent = '✓ Les mots de passe correspondent';
                    this.elements.passwordMatch.className = 'text-green-500';
                } else {
                    this.elements.passwordMatch.textContent = '✗ Les mots de passe ne correspondent pas';
                    this.elements.passwordMatch.className = 'text-red-500';
                }
            }

            handleRoleChange(role) {
                if (this.elements.roleInfo) {
                    const info = {
                        agent: 'L\'agent peut gérer les interventions et consulter les données.',
                        responsable: 'Le responsable peut gérer les agents, les interventions et les rapports.'
                    };
                    
                    this.elements.roleInfo.textContent = info[role] || '';
                    this.elements.roleInfo.classList.remove('hidden');
                }
            }

            handleRegistrationError(error) {
                console.error('Erreur d\'inscription détaillée:', error);
                
                let errorMessage = 'Erreur lors de l\'inscription';
                
                if (error.code) {
                    switch(error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Cette adresse email est déjà utilisée';
                            this.elements.emailInput?.focus();
                            this.elements.emailInput?.select();
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Adresse email invalide';
                            this.elements.emailInput?.focus();
                            this.elements.emailInput?.select();
                            break;
                        case 'auth/operation-not-allowed':
                            errorMessage = 'L\'inscription est temporairement désactivée';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Le mot de passe est trop faible. Utilisez au moins 6 caractères';
                            this.elements.passwordInput?.focus();
                            this.elements.passwordInput?.select();
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
                            break;
                        case 'permission-denied':
                            errorMessage = 'Permission refusée. Vérifiez vos autorisations.';
                            break;
                        default:
                            errorMessage = `Erreur: ${error.code || error.message}`;
                    }
                } else if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                
                this.showMessage(errorMessage, 'error');
            }

            resetMessage() {
                this.elements.messageDiv?.classList.add('hidden');
            }

            showMessage(message, type) {
                if (!this.elements.messageDiv) return;
                
                this.elements.messageDiv.textContent = message;
                this.elements.messageDiv.className = `p-3 rounded text-sm ${
                    type === 'success' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                }`;
                this.elements.messageDiv.classList.remove('hidden');
                
                // Faire défiler jusqu'au message
                this.elements.messageDiv.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Auto-hide pour les messages de succès
                if (type === 'success') {
                    setTimeout(() => {
                        this.elements.messageDiv?.classList.add('hidden');
                    }, 5000);
                }
            }

            setLoadingState(isLoading) {
                if (!this.elements.registerBtn) return;
                
                if (isLoading) {
                    this.elements.registerBtn.disabled = true;
                    this.elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Inscription...';
                    this.elements.registerBtn.classList.add('opacity-75', 'cursor-not-allowed');
                } else {
                    this.elements.registerBtn.disabled = false;
                    this.elements.registerBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i> S\'inscrire';
                    this.elements.registerBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
            }
        }

        // =================================================================
        // FONCTIONS GLOBALES POUR LES ATTRIBUTS HTML
        // =================================================================
        window.togglePassword = function() {
            if (window.registerManager) {
                window.registerManager.togglePasswordVisibility('password');
            }
        };
        
        window.toggleConfirmPassword = function() {
            if (window.registerManager) {
                window.registerManager.togglePasswordVisibility('confirmPassword');
            }
        };
        