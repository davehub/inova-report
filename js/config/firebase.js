// js/config/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuration Firebase
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

// Fonction d'initialisation
async function initializeFirebase() {
    console.log('Firebase déjà initialisé');
    return { app, auth, db };
}

export { app, auth, db, initializeFirebase };