const crypto = require('crypto');
const jose = require('jose');

// Variables de sesión
let privateKey;
let publicKeyJwk;
let accessToken = null;
let tokenExpiryTime = 0;

// Variables de entorno
const AUTH_URL = process.env.OPEN_PAYMENTS_AUTH_URL;
const API_URL = process.env.OPEN_PAYMENTS_API_URL;

// Almacenamiento de contactos autorizados por usuario (chatId)
const authorizedRecipients = {};

// Inicializar claves GNAP
async function initializeKeys() {
    const { publicKey, privateKey: pk } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' });
    privateKey = pk;
    publicKeyJwk = await jose.exportJWK(publicKey);
    console.log('Claves criptográficas generadas para la sesión.');
}

// Registrar contacto autorizado
function registerRecipient(userChatId, destination) {
    if (!authorizedRecipients[userChatId]) authorizedRecipients[userChatId] = [];
    if (!authorizedRecipients[userChatId].includes(destination)) {
        authorizedRecipients[userChatId].push(destination);
    }
    console.log(`Contactos de ${userChatId}:`, authorizedRecipients[userChatId]);
}

// Validar whitelist
function isWhitelisted(userChatId, destination) {
    const userContacts = authorizedRecipients[userChatId] || [];
    return userContacts.includes(destination);
}

// Solicitar token GNAP (simulado en sandbox)
async function getAccessToken() {
    console.log('Solicitando token GNAP (sandbox)...');
    // Simulación de token
    accessToken = 'sandbox-token';
    tokenExpiryTime = Date.now() + 60 * 60 * 1000; // 1 hora
    console.log('✅ Token GNAP obtenido (sandbox).');
    return accessToken;
}

// Crear pago con validación whitelist y simulación sandbox
async function createPayment(amount, destination, userChatId) {
    if (!isWhitelisted(userChatId, destination)) {
        console.error(`❌ Intento de pago a cuenta no autorizada: ${destination}`);
        throw new Error('Cuenta destino no autorizada.');
    }

    if (!accessToken || Date.now() >= tokenExpiryTime) {
        await getAccessToken();
    }

    // Simulamos un quoteUrl válido de sandbox
    const paymentDetails = { 
        quoteUrl: `https://sandbox.openpayments.dev/quotes/${encodeURIComponent(destination)}`,
        amount 
    };

    // Simulación de respuesta exitosa en sandbox
    const response = { data: { id: `sandbox-${Date.now()}`, status: 'completed' } };

    console.log('💸 Pago creado (sandbox):', response.data);
    return response.data;
}

module.exports = {
    initializeKeys,
    createPayment,
    registerRecipient,
    isWhitelisted
};
