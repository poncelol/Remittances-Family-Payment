// Cargar la librería
const TelegramBot = require('node-telegram-bot-api');

// Token que te dio BotFather
const token = '8239862376:AAFw_fejAJLWwoMzHv8qAoYG3gBVB119GIY';

// Crear la instancia del bot usando polling
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
    // Solo procesar si no es un comando /start para evitar duplicados
    if (!msg.text || msg.text.startsWith('/start')) {
        return;
    }
    
    console.log(`Mensaje recibido de ${msg.chat.username || msg.chat.first_name || msg.chat.id}: ${msg.text}`);
    
    // Responder al mensaje (opcional)
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Recibí tu mensaje: "${msg.text}"`);
});

console.log('Bot iniciado... 🤖');