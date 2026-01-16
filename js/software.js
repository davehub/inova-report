import { db } from './js/config/firebase.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let softwareList = [];
let editingSoftwareId = null;

// Charger les logiciels
async function loadSoftware() {
    try {
        const querySnapshot = await getDocs(collection(db, 'software'));
        softwareList = [];
        const tableBody = document.getElementById('softwareTableBody');
        tableBody.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const software = { id: doc.id, ...doc.data() };
            softwareList.push(software);
            
            const row = tableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${software.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${software.version || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${software.description || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editSoftware('${software.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteSoftware('${software.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erreur de chargement des logiciels:', error);
        alert('Erreur lors du chargement des logiciels');
    }
}

// Ajouter un logiciel
window.addSoftware = async function() {
    const formData = {
        name: document.getElementById('softwareName').value.trim(),
        version: document.getElementById('softwareVersion').value.trim(),
        description: document.getElementById('softwareDescription').value.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (!formData.name) {
        alert('Veuillez saisir le nom du logiciel');
        return;
    }

    try {
        if (editingSoftwareId) {
            // Mise à jour
            await updateDoc(doc(db, 'software', editingSoftwareId), formData);
            alert('Logiciel modifié avec succès');
        } else {
            // Nouveau logiciel
            await addDoc(collection(db, 'software'), formData);
            alert('Logiciel ajouté avec succès');
        }

        resetForm();
        await loadSoftware();
        
        // Informer le dashboard parent
        if (window.opener && window.opener.refreshLists) {
            window.opener.refreshLists();
        }
    } catch (error) {
        console.error('Erreur sauvegarde logiciel:', error);
        alert('Erreur lors de la sauvegarde du logiciel');
    }
}

// Éditer un logiciel
window.editSoftware = function(softwareId) {
    const software = softwareList.find(s => s.id === softwareId);
    if (!software) return;

    document.getElementById('softwareName').value = software.name || '';
    document.getElementById('softwareVersion').value = software.version || '';
    document.getElementById('softwareDescription').value = software.description || '';

    editingSoftwareId = softwareId;
}

// Supprimer un logiciel
window.deleteSoftware = async function(softwareId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce logiciel ?')) return;

    try {
        await deleteDoc(doc(db, 'software', softwareId));
        await loadSoftware();
        
        // Informer le dashboard parent
        if (window.opener && window.opener.refreshLists) {
            window.opener.refreshLists();
        }
        
        alert('Logiciel supprimé avec succès');
    } catch (error) {
        console.error('Erreur suppression logiciel:', error);
        alert('Erreur lors de la suppression du logiciel');
    }
}

// Réinitialiser le formulaire
window.resetForm = function() {
    document.getElementById('softwareForm').reset();
    editingSoftwareId = null;
}

// Initialisation
document.addEventListener('DOMContentLoaded', loadSoftware);