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

let clients = [];
let editingClientId = null;

// Charger les clients
async function loadClients() {
    try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        clients = [];
        const tableBody = document.getElementById('clientsTableBody');
        tableBody.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const client = { id: doc.id, ...doc.data() };
            clients.push(client);
            
            const row = tableBody.insertRow();
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${client.contact || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${client.email || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${client.phone || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editClient('${client.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteClient('${client.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erreur de chargement des clients:', error);
        alert('Erreur lors du chargement des clients');
    }
}

// Ajouter un client
window.addClient = async function() {
    const formData = {
        name: document.getElementById('clientName').value.trim(),
        contact: document.getElementById('clientContact').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (!formData.name) {
        alert('Veuillez saisir la raison sociale du client');
        return;
    }

    try {
        if (editingClientId) {
            // Mise à jour
            await updateDoc(doc(db, 'clients', editingClientId), formData);
            alert('Client modifié avec succès');
        } else {
            // Nouveau client
            await addDoc(collection(db, 'clients'), formData);
            alert('Client ajouté avec succès');
        }

        resetForm();
        await loadClients();
        
        // Informer le dashboard parent
        if (window.opener && window.opener.refreshLists) {
            window.opener.refreshLists();
        }
    } catch (error) {
        console.error('Erreur sauvegarde client:', error);
        alert('Erreur lors de la sauvegarde du client');
    }
}

// Éditer un client
window.editClient = function(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientContact').value = client.contact || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientPhone').value = client.phone || '';
    document.getElementById('clientAddress').value = client.address || '';

    editingClientId = clientId;
}

// Supprimer un client
window.deleteClient = async function(clientId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
        await deleteDoc(doc(db, 'clients', clientId));
        await loadClients();
        
        // Informer le dashboard parent
        if (window.opener && window.opener.refreshLists) {
            window.opener.refreshLists();
        }
        
        alert('Client supprimé avec succès');
    } catch (error) {
        console.error('Erreur suppression client:', error);
        alert('Erreur lors de la suppression du client');
    }
}

// Réinitialiser le formulaire
window.resetForm = function() {
    document.getElementById('clientForm').reset();
    editingClientId = null;
}

// Initialisation
document.addEventListener('DOMContentLoaded', loadClients);