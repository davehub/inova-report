// js/utils/helpers.js

import { 
    VALIDATION_PATTERNS, 
    DATE_FORMATS, 
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FIRESTORE_COLLECTIONS 
} from './constants.js';

// Formatage de date
export function formatDate(date, format = DATE_FORMATS.SHORT) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date invalide';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    switch (format) {
        case DATE_FORMATS.SHORT:
            return `${day}/${month}/${year}`;
        case DATE_FORMATS.LONG:
            return `${day} ${monthNames[d.getMonth()]} ${year}`;
        case DATE_FORMATS.WITH_TIME:
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        case DATE_FORMATS.TIME_ONLY:
            return `${hours}:${minutes}`;
        case DATE_FORMATS.MONTH_YEAR:
            return `${monthNames[d.getMonth()]} ${year}`;
        default:
            return `${day}/${month}/${year}`;
    }
}

// Validation email
export function validateEmail(email) {
    return VALIDATION_PATTERNS.EMAIL.test(email);
}

// Validation numéro de téléphone CI
export function validatePhoneCI(phone) {
    return VALIDATION_PATTERNS.PHONE_CI.test(phone);
}

// Formatage numéro de téléphone
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Enlever tous les caractères non numériques
    let cleaned = phone.replace(/\D/g, '');
    
    // Ajouter le code pays si nécessaire
    if (cleaned.length === 10) {
        cleaned = '225' + cleaned;
    }
    
    // Formater: +225 XX XX XX XX XX
    if (cleaned.length === 13) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11, 13)}`;
    }
    
    return phone;
}

// Calcul de la durée en heures
export function calculateDurationInHours(value, unit) {
    const val = parseInt(value) || 0;
    
    switch (unit) {
        case 'heures':
            return val;
        case 'jours':
            return val * 8; // 8 heures par jour ouvrable
        case 'semaines':
            return val * 40; // 40 heures par semaine
        case 'mois':
            return val * 160; // 160 heures par mois (environ)
        default:
            return val;
    }
}

// Génération d'ID unique
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Tri des rapports
export function sortReports(reports, sortBy = 'date', order = 'desc') {
    return [...reports].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
            case 'date':
                aVal = new Date(a.date || a.dateIntervention);
                bVal = new Date(b.date || b.dateIntervention);
                break;
            case 'client':
                aVal = a.clientName || a.raisonSociale;
                bVal = b.clientName || b.raisonSociale;
                break;
            case 'agent':
                aVal = a.agentName;
                bVal = b.agentName;
                break;
            case 'statut':
                aVal = a.status || a.statut;
                bVal = b.status || b.statut;
                break;
            default:
                aVal = a.createdAt;
                bVal = b.createdAt;
        }
        
        if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

// Filtrage des rapports
export function filterReports(reports, filters) {
    return reports.filter(report => {
        // Filtre par agent
        if (filters.agent && report.agentName !== filters.agent) {
            return false;
        }
        
        // Filtre par client
        if (filters.client && report.clientName !== filters.client) {
            return false;
        }
        
        // Filtre par date de début
        if (filters.startDate && new Date(report.date) < new Date(filters.startDate)) {
            return false;
        }
        
        // Filtre par date de fin
        if (filters.endDate && new Date(report.date) > new Date(filters.endDate)) {
            return false;
        }
        
        // Filtre par statut
        if (filters.status && report.status !== filters.status) {
            return false;
        }
        
        // Filtre par type d'intervention
        if (filters.type && report.interventionType !== filters.type) {
            return false;
        }
        
        // Filtre par ville
        if (filters.ville && report.site !== filters.ville) {
            return false;
        }
        
        // Recherche textuelle
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            return (
                (report.object && report.object.toLowerCase().includes(searchTerm)) ||
                (report.clientName && report.clientName.toLowerCase().includes(searchTerm)) ||
                (report.interlocutor && report.interlocutor.toLowerCase().includes(searchTerm)) ||
                (report.site && report.site.toLowerCase().includes(searchTerm)) ||
                (report.software && report.software.toLowerCase().includes(searchTerm))
            );
        }
        
        return true;
    });
}

// Calcul des statistiques
export function calculateStatistics(reports) {
    const stats = {
        total: reports.length,
        byStatus: {},
        byType: {},
        byClient: {},
        byAgent: {},
        byCity: {},
        bySoftware: {},
        totalHours: 0,
        averageDuration: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0
    };
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    reports.forEach(report => {
        const reportDate = new Date(report.date);
        
        // Par statut
        const status = report.status || 'Terminé';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
        // Par type
        const type = report.interventionType || 'Sur site';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        
        // Par client
        stats.byClient[report.clientName] = (stats.byClient[report.clientName] || 0) + 1;
        
        // Par agent
        stats.byAgent[report.agentName] = (stats.byAgent[report.agentName] || 0) + 1;
        
        // Par ville
        stats.byCity[report.site] = (stats.byCity[report.site] || 0) + 1;
        
        // Par logiciel
        stats.bySoftware[report.software] = (stats.bySoftware[report.software] || 0) + 1;
        
        // Durée totale (estimation basée sur startTime/endTime)
        if (report.startTime && report.endTime) {
            const start = new Date(`${report.date}T${report.startTime}`);
            const end = new Date(`${report.date}T${report.endTime}`);
            const durationHours = (end - start) / (1000 * 60 * 60);
            stats.totalHours += Math.max(0, durationHours);
        }
        
        // Cette semaine
        if (reportDate >= oneWeekAgo) {
            stats.thisWeek++;
        }
        
        // Ce mois
        if (reportDate >= oneMonthAgo) {
            stats.thisMonth++;
        }
        
        // Mois dernier
        if (reportDate >= twoMonthsAgo && reportDate < oneMonthAgo) {
            stats.lastMonth++;
        }
    });
    
    // Durée moyenne
    stats.averageDuration = stats.total > 0 ? Math.round(stats.totalHours / stats.total) : 0;
    
    return stats;
}

// Export CSV
export function exportToCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
        showNotification('Aucune donnée à exporter', 'error');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                // Échapper les guillemets et entourer de guillemets si nécessaire
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        
        showNotification(SUCCESS_MESSAGES.EXPORT_SUCCESS, 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export CSV:', error);
        showNotification('Erreur lors de l\'export', 'error');
    }
}

// Import CSV
export function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    } catch (error) {
        console.error('Erreur lors du parsing CSV:', error);
        showNotification('Erreur lors de l\'import CSV', 'error');
        return [];
    }
}

// Affichage de notification
export function showNotification(message, type = 'success', duration = 3000) {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `custom-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${
        type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
        type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
        type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
        'bg-blue-50 border-blue-500 text-blue-700'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
        notification.style.transition = 'all 0.3s ease-out';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Gestion du localStorage avec expiration
export function setLocalStorageWithExpiry(key, value, ttl = 86400000) {
    try {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        console.error('Erreur localStorage:', error);
    }
}

export function getLocalStorageWithExpiry(key) {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        const now = new Date();
        
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    } catch (error) {
        console.error('Erreur localStorage:', error);
        return null;
    }
}

// Génération de PDF simple
export function generatePDF(reportData) {
    try {
        const printWindow = window.open('', '_blank');
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rapport InovaReport</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                    h1 { color: #1F2937; text-align: center; margin-bottom: 20px; }
                    .header { border-bottom: 2px solid #3B82F6; padding-bottom: 10px; margin-bottom: 30px; }
                    .section { margin-bottom: 25px; }
                    .section-title { font-weight: bold; color: #3B82F6; margin-bottom: 10px; font-size: 18px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .label { font-weight: bold; color: #6B7280; }
                    .value { color: #1F2937; }
                    .full-width { grid-column: 1 / -1; }
                    .signature { margin-top: 50px; text-align: right; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>InovaReport - Rapport d'Intervention</h1>
                    <p style="text-align: center;">Généré le ${formatDate(new Date(), DATE_FORMATS.LONG)}</p>
                </div>
                
                <div class="section">
                    <div class="section-title">Informations Générales</div>
                    <div class="grid">
                        <div><span class="label">Client:</span><span class="value"> ${reportData.clientName}</span></div>
                        <div><span class="label">Date:</span><span class="value"> ${formatDate(reportData.date, DATE_FORMATS.LONG)}</span></div>
                        <div><span class="label">Lieu:</span><span class="value"> ${reportData.site}</span></div>
                        <div><span class="label">Type:</span><span class="value"> ${reportData.interventionType}</span></div>
                        <div><span class="label">Interlocuteur:</span><span class="value"> ${reportData.interlocutor}</span></div>
                        <div><span class="label">Contact:</span><span class="value"> ${reportData.contact}</span></div>
                        <div><span class="label">Logiciel:</span><span class="value"> ${reportData.software}</span></div>
                        <div><span class="label">Durée:</span><span class="value"> ${reportData.duration}</span></div>
                    </div>
                </div>
                
                <div class="section full-width">
                    <div class="section-title">Objet de la mission</div>
                    <p>${reportData.object || 'Non spécifié'}</p>
                </div>
                
                <div class="signature">
                    <p>Signature de l'agent</p>
                    <p>${reportData.agentName}</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    } catch (error) {
        console.error('Erreur génération PDF:', error);
        showNotification('Erreur lors de la génération du PDF', 'error');
    }
}

// Vérification de la connectivité
export function checkConnectivity() {
    return navigator.onLine;
}

// Gestion du mode hors ligne
export function handleOfflineMode(callback) {
    window.addEventListener('online', () => {
        showNotification('Connexion rétablie', 'success');
        if (callback) callback(true);
    });
    
    window.addEventListener('offline', () => {
        showNotification('Mode hors ligne - Les données seront synchronisées à la reconnexion', 'info');
        if (callback) callback(false);
    });
}

// Gestion des erreurs Firebase
export function handleFirebaseError(error) {
    console.error('Erreur Firebase:', error);
    
    let message = ERROR_MESSAGES.GENERIC_ERROR;
    
    switch (error.code) {
        case 'permission-denied':
            message = ERROR_MESSAGES.PERMISSION_DENIED;
            break;
        case 'unauthenticated':
            message = 'Session expirée. Veuillez vous reconnecter.';
            break;
        case 'not-found':
            message = 'Ressource non trouvée.';
            break;
        case 'already-exists':
            message = 'Cet élément existe déjà.';
            break;
        default:
            if (error.message.includes('network')) {
                message = ERROR_MESSAGES.NETWORK_ERROR;
            }
    }
    
    showNotification(message, 'error');
    return message;
}

// Validation de formulaire
export function validateForm(formData, requiredFields) {
    const errors = {};
    
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].toString().trim() === '') {
            errors[field] = `${field} est requis`;
        }
    });
    
    if (formData.email && !validateEmail(formData.email)) {
        errors.email = 'Email invalide';
    }
    
    if (formData.phone && !validatePhoneCI(formData.phone)) {
        errors.phone = 'Numéro de téléphone invalide';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Formatage de la durée
export function formatDuration(startTime, endTime, date) {
    if (!startTime || !endTime || !date) return 'N/A';
    
    try {
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        
        // Gérer le cas où endTime est le lendemain
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        
        const durationMs = end - start;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}min`;
    } catch (error) {
        console.error('Erreur formatage durée:', error);
        return 'N/A';
    }
}

// Export des fonctions
export default {
    formatDate,
    validateEmail,
    validatePhoneCI,
    formatPhoneNumber,
    calculateDurationInHours,
    generateUniqueId,
    debounce,
    throttle,
    sortReports,
    filterReports,
    calculateStatistics,
    exportToCSV,
    parseCSV,
    showNotification,
    setLocalStorageWithExpiry,
    getLocalStorageWithExpiry,
    generatePDF,
    checkConnectivity,
    handleOfflineMode,
    handleFirebaseError,
    validateForm,
    formatDuration
};