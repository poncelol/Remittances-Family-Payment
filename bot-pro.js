const TelegramBot = require('node-telegram-bot-api');
const openPayments = require('./openPaymentsService');

// Token del bot
const token = '8239862376:AAFw_fejAJLWwoMzHv8qAoYG3gBVB119GIY';

// Crear instancia del bot
const bot = new TelegramBot(token, { polling: true });

// Manejar errores de polling
bot.on('polling_error', (error) => {
    console.log('Error de polling:', error);
});

// Escuchar el comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '¡Hola! Tu bot está conectado y funcionando 🚀');
});

// Escuchar cualquier mensaje de texto (evita duplicados con /start)
bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/start')) return;
    
    console.log(`Mensaje recibido de ${msg.chat.username || msg.chat.first_name || msg.chat.id}: ${msg.text}`);
    
    bot.sendMessage(msg.chat.id, `Recibí tu mensaje: "${msg.text}"`);
});

// Comando para agregar contactos autorizados
bot.onText(/\/agregar (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const destination = match[1];

    try {
        openPayments.registerRecipient(chatId, destination);
        bot.sendMessage(chatId, `✅ Contacto "${destination}" agregado a tu lista de destinatarios autorizados.`);
    } catch (error) {
        bot.sendMessage(chatId, `❌ No se pudo agregar el contacto: ${error.message}`);
    }
});

// Comando para realizar pagos
bot.onText(/\/pagar (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const amount = match[1];
    const destination = match[2];

    try {
        await bot.sendMessage(chatId, `Procesando pago de ${amount} a ${destination}... ⏳`);
        
        const paymentResult = await openPayments.createPayment(amount, destination, chatId);

        const confirmationMessage = `✅ ¡Pago exitoso!
- ID de Transacción: ${paymentResult.id}
- Estado: ${paymentResult.status}`;
        
        await bot.sendMessage(chatId, confirmationMessage);

    } catch (error) {
        await bot.sendMessage(chatId, `❌ Hubo un error al procesar tu pago: ${error.message}`);
    }
});

// Inicializar las claves criptográficas para Open Payments
openPayments.initializeKeys();

console.log('Bot iniciado... 🤖');
