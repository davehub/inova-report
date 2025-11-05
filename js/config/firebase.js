import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Initialisation de Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Exportation des services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export des constantes par défaut
export default {
    FIREBASE_CONFIG,
    auth,
    db
};