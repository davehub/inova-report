 // Vérifier si l'utilisateur est déjà connecté
 import { auth } from './js/config/firebase.js';
 import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
 
 onAuthStateChanged(auth, (user) => {
     if (user) {
         // Rediriger vers le dashboard approprié
         checkUserRoleAndRedirect(user);
     }
 });
 
 async function checkUserRoleAndRedirect(user) {
     try {
         const idTokenResult = await user.getIdTokenResult();
         const role = idTokenResult.claims.role;
         
         if (role === 'responsable') {
             window.location.href = 'responsable-dashboard.html';
         } else {
             window.location.href = 'agent-dashboard.html';
         }
     } catch (error) {
         console.error('Erreur lors de la vérification du rôle:', error);
     }
 }