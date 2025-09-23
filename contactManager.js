// contactManager.js - Gestor de contactos del usuario
const fs = require('fs').promises;
const path = require('path');

class ContactManager {
    constructor() {
        this.contactsFile = path.join(__dirname, 'data', 'contacts.json');
        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        try {
            await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        } catch (error) {
            console.log('Directorio de datos listo');
        }
    }

    // Cargar contactos de un usuario
    async loadContacts(userId) {
        try {
            const data = await fs.readFile(this.contactsFile, 'utf8');
            const allContacts = JSON.parse(data);
            return allContacts[userId] || [];
        } catch (error) {
            return [];
        }
    }

    // Guardar contactos de un usuario
    async saveContacts(userId, contacts) {
        try {
            let allContacts = {};
            try {
                const data = await fs.readFile(this.contactsFile, 'utf8');
                allContacts = JSON.parse(data);
            } catch (error) {
                // Archivo no existe, se creará nuevo
            }

            allContacts[userId] = contacts;
            await fs.writeFile(this.contactsFile, JSON.stringify(allContacts, null, 2));
            return true;
        } catch (error) {
            console.error('Error guardando contactos:', error);
            return false;
        }
    }

    // Agregar contacto
    async addContact(userId, name, walletAddress, description = '') {
        const contacts = await this.loadContacts(userId);
        
        // Verificar si ya existe
        if (contacts.find(c => c.walletAddress === walletAddress)) {
            return { success: false, error: 'El contacto ya existe' };
        }

        const newContact = {
            id: Date.now().toString(),
            name: name,
            walletAddress: walletAddress,
            description: description,
            createdAt: new Date().toISOString()
        };

        contacts.push(newContact);
        const saved = await this.saveContacts(userId, contacts);
        
        return saved ? 
            { success: true, contact: newContact } : 
            { success: false, error: 'Error guardando contacto' };
    }

    // Eliminar contacto
    async removeContact(userId, contactId) {
        const contacts = await this.loadContacts(userId);
        const filteredContacts = contacts.filter(c => c.id !== contactId);
        
        if (filteredContacts.length === contacts.length) {
            return { success: false, error: 'Contacto no encontrado' };
        }

        const saved = await this.saveContacts(userId, filteredContacts);
        return saved ? 
            { success: true } : 
            { success: false, error: 'Error eliminando contacto' };
    }

    // Listar contactos
    async listContacts(userId) {
        return await this.loadContacts(userId);
    }

    // Obtener contacto por ID
    async getContact(userId, contactId) {
        const contacts = await this.loadContacts(userId);
        return contacts.find(c => c.id === contactId);
    }
}

module.exports = ContactManager;