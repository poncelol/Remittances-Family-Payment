// bot.js - Bot de Telegram con Open Payments integrado
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const OpenPaymentsClient = require('./openPayments');

// Crear bot de Telegram
const bot = new TelegramBot(config.telegram.token, { polling: true });

// Variable global para el cliente de Open Payments
let openPaymentsClient = null;

// FUNCIÓN DE INICIALIZACIÓN CORREGIDA
async function initializeBot() {
    try {
        console.log('🤖 Iniciando Bot de Pagos Interledger...');

        // Inicializar cliente OpenPayments
        openPaymentsClient = new OpenPaymentsClient(config.openPayments);

        // Mostrar wallets (verificación básica de conexión)
        const walletA = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressA);
        const walletB = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressB);

        console.log('✅ Conexión básica verificada con Open Payments');
        console.log(`   Wallet A: ${walletA.id}`);
        console.log(`   Wallet B: ${walletB.id}`);

        console.log('🚀 Bot iniciado y listo para recibir comandos');
        console.log('📱 Busca tu bot en Telegram y envía /start');

        return openPaymentsClient;
    } catch (error) {
        console.error('❌ Error inicializando:', error.message);
        throw error;
    }
}

// FUNCIÓN PARA MANEJAR PAGOS
async function handlePayment(amount, description, chatId) {
    try {
        if (!openPaymentsClient) {
            throw new Error('Cliente no inicializado');
        }

        await bot.sendMessage(chatId, '⏳ Procesando pago...');

        const result = await openPaymentsClient.sendPayment(amount, description);

        if (result.success) {
            const successMessage = `
✅ *¡Pago exitoso!*

💰 Cantidad: $${result.amount}
📝 Descripción: ${description}
🆔 ID del pago: \`${result.paymentId}\`
📊 Estado: ${result.state}
🔗 Incoming Payment: \`${result.incomingPaymentId}\`
📋 Quote: \`${result.quoteId}\`

✨ Pago completado exitosamente
            `;
            await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
            return result;
        } else {
            const errorMessage = `
❌ *Error en el pago*

💰 Cantidad: $${amount}
📝 Descripción: ${description}
⚠️ Error: ${result.error}

Por favor, intenta nuevamente o contacta soporte.
            `;
            await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
            return result;
        }
    } catch (error) {
        const criticalErrorMessage = `
🚨 *Error crítico*

No se pudo procesar el pago.
Error: ${error.message}

Por favor, verifica tu configuración.
        `;
        await bot.sendMessage(chatId, criticalErrorMessage, { parse_mode: 'Markdown' });
        return { success: false, error: error.message };
    }
}

// COMANDOS DEL BOT
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🤖 *Bot de Pagos Interledger*

¡Hola! Puedo ayudarte a realizar pagos usando Open Payments.

*Comandos disponibles:*
/balance - Ver información de wallets
/send [cantidad] [descripción] - Enviar pago
/test - Probar conexión
/help - Ver esta ayuda

*Ejemplo:*
\`/send 10.50 Pago de prueba\`
    `;
    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/test/, async (msg) => {
    const chatId = msg.chat.id;

    if (!openPaymentsClient) {
        await bot.sendMessage(chatId, '❌ Cliente no inicializado');
        return;
    }

    await bot.sendMessage(chatId, '🧪 Probando conexión con wallets...');

    try {
        const walletA = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressA);
        const walletB = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressB);

        const message = `
✅ *Conexión verificada*

🔹 Wallet A (Remitente):
   ID: \`${walletA.id}\`
   Asset: ${walletA.assetCode || 'USD'}
   Scale: ${walletA.assetScale || 2}

🔹 Wallet B (Receptor):
   ID: \`${walletB.id}\`
   Asset: ${walletB.assetCode || 'USD'}
   Scale: ${walletB.assetScale || 2}

⚠️ *Nota:* Para realizar pagos reales necesitas configurar tokens GNAP
        `;
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Error consultando wallets: ${error.message}`);
    }
});

bot.onText(/\/send (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1].split(' ');

    if (params.length < 1) {
        await bot.sendMessage(chatId, '❌ Formato: /send [cantidad] [descripción opcional]');
        return;
    }

    const amount = parseFloat(params[0]);
    const description = params.slice(1).join(' ') || 'Pago vía bot Telegram';

    if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId, '❌ La cantidad debe ser un número positivo');
        return;
    }

    if (amount > 1000) {
        await bot.sendMessage(chatId, '❌ Cantidad máxima permitida: $1000');
        return;
    }

    console.log(`💸 Procesando pago de $${amount} - "${description}"`);
    await handlePayment(amount, description, chatId);
});

bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;

    if (!openPaymentsClient) {
        await bot.sendMessage(chatId, '❌ Cliente no inicializado');
        return;
    }

    try {
        await bot.sendMessage(chatId, '📊 Consultando información de wallets...');

        const walletA = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressA);
        const walletB = await openPaymentsClient.getWalletAddress(openPaymentsClient.walletAddressB);

        const message = `
📊 *Información de Wallets*

🔹 *Wallet Remitente (A):*
   Address: \`${openPaymentsClient.walletAddressA}\`
   ID: \`${walletA.id}\`
   Asset: ${walletA.assetCode || 'USD'}
   Scale: ${walletA.assetScale || 2}

🔹 *Wallet Receptor (B):*
   Address: \`${openPaymentsClient.walletAddressB}\`
   ID: \`${walletB.id}\`
   Asset: ${walletB.assetCode || 'USD'}
   Scale: ${walletB.assetScale || 2}

ℹ️ *Nota:* Los balances específicos requieren autenticación adicional
        `;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        await bot.sendMessage(chatId, `❌ Error consultando wallets: ${error.message}`);
    }
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
🤖 *Ayuda - Bot de Pagos Interledger*

*Comandos disponibles:*

/start - Iniciar el bot
/test - Verificar conexión con wallets
/balance - Ver información de wallets
/send [cantidad] [descripción] - Enviar pago
/help - Ver esta ayuda

*Ejemplos de uso:*
\`/send 5.00\`
\`/send 10.50 Pago de prueba\`
\`/send 25 Transferencia urgente\`

*Límites:*
• Cantidad mínima: $0.01
• Cantidad máxima: $1000.00
• Moneda: USD

*Estado actual:*
${openPaymentsClient ? '✅ Cliente inicializado' : '❌ Cliente no inicializado'}

⚠️ *Importante:* Para pagos reales necesitas configurar tokens GNAP
    `;
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Manejar errores del bot
bot.on('error', (error) => console.error('❌ Error del bot:', error));
bot.on('polling_error', (error) => console.error('❌ Error de polling:', error));

// INICIALIZAR APLICACIÓN
async function main() {
    try {
        await initializeBot();

        console.log('\n🎯 Bot listo para usar!');
        console.log('📝 Comandos de prueba:');
        console.log('   /test - Verificar conexión');
        console.log('   /balance - Ver wallets');
        console.log('   /send 1.00 Prueba - Enviar $1');
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    }
}

// Ejecutar aplicación
if (require.main === module) {
    main();
}

module.exports = {
    bot,
    openPaymentsClient,
    handlePayment,
    initializeBot
};
