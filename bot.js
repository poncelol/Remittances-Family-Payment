// bot.js - Bot de Telegram con gestión de contactos
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const WalletService = require('./walletService');
const ContactManager = require('./contactManager');

const bot = new TelegramBot(config.telegram.token, { polling: true });
const walletService = new WalletService(config.openPayments);
const contactManager = new ContactManager();

// Estados de conversación
const userStates = new Map();

// Inicializar el servicio de wallets
async function initializeWallets() {
    try {
        console.log('🤖 Inicializando servicio de wallets...');
        
        // Configurar wallet principal del usuario
        await walletService.createClient(
            config.openPayments.userWallet.walletAddress,
            config.openPayments.userWallet.privateKey,
            config.openPayments.userWallet.keyId
        );

        console.log('✅ Servicio de wallets inicializado');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando wallets:', error);
        return false;
    }
}

// Menú principal
function getMainMenu() {
    return {
        reply_markup: {
            keyboard: [
                ['👤 Mis Contactos', '💳 Mi Wallet'],
                ['💸 Enviar Pago', '➕ Agregar Contacto'],
                ['🆘 Ayuda']
            ],
            resize_keyboard: true
        }
    };
}

// Menú de contactos
function getContactsMenu(contacts) {
    const buttons = contacts.map(contact => 
        [{ text: `👤 ${contact.name} - ${contact.walletAddress}` }]
    );
    buttons.push([{ text: '🔙 Volver al Menú Principal' }]);
    
    return {
        reply_markup: {
            keyboard: buttons,
            resize_keyboard: true
        }
    };
}

// COMANDOS DEL BOT

// Comando start mejorado
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const welcomeMessage = `
🤖 *Bot de Pagos Open Payments*

¡Hola ${msg.from.first_name}! Soy tu asistente para pagos con Open Payments.

*Características principales:*
• 👤 Gestión de contactos
• 💸 Envía pagos a tus contactos
• 💳 Consulta tu balance
• 🔒 Transacciones seguras

Usa los botones del menú o los comandos:
/contactos - Gestionar contactos
/pagar - Enviar pago
/balance - Ver tu wallet
/ayuda - Más información
    `;

    await bot.sendMessage(chatId, welcomeMessage, { 
        parse_mode: 'Markdown',
        ...getMainMenu()
    });
});

// Gestión de contactos
bot.onText(/\/contactos|👤 Mis Contactos/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const contacts = await contactManager.listContacts(userId);
    
    if (contacts.length === 0) {
        const message = `
📝 *Tus Contactos*

Aún no tienes contactos guardados.

Para agregar un contacto:
1. Usa el comando /agregar
2. O pulsa "➕ Agregar Contacto"
3. Proporciona nombre y wallet address
        `;
        
        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown',
            ...getMainMenu()
        });
    } else {
        let message = `👥 *Tus Contactos (${contacts.length})*\n\n`;
        contacts.forEach((contact, index) => {
            message += `${index + 1}. *${contact.name}*\n`;
            message += `   💰 ${contact.walletAddress}\n`;
            message += `   📝 ${contact.description || 'Sin descripción'}\n\n`;
        });

        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown',
            ...getContactsMenu(contacts)
        });
    }
});

// Agregar contacto
bot.onText(/\/agregar|➕ Agregar Contacto/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    userStates.set(userId, { action: 'adding_contact', step: 'name' });

    await bot.sendMessage(chatId, `
👤 *Agregar Nuevo Contacto*

Por favor, sigue estos pasos:

1. *Nombre del contacto:* 
   Envía el nombre para identificar a tu contacto
        `, { 
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
    });
});

// Enviar pago
bot.onText(/\/pagar|💸 Enviar Pago/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const contacts = await contactManager.listContacts(userId);
    
    if (contacts.length === 0) {
        await bot.sendMessage(chatId, 
            '❌ Primero necesitas agregar contactos. Usa "➕ Agregar Contacto"',
            getMainMenu()
        );
        return;
    }

    userStates.set(userId, { action: 'sending_payment', step: 'select_contact' });

    let message = `💸 *Seleccionar Contacto para Pago*\n\n`;
    contacts.forEach((contact, index) => {
        message += `${index + 1}. ${contact.name}\n   ${contact.walletAddress}\n\n`;
    });
    message += `Responde con el número del contacto (1-${contacts.length})`;

    await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
    });
});

// Consultar balance
bot.onText(/\/balance|💳 Mi Wallet/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, '⏳ Consultando información de tu wallet...');
    
    const balance = await walletService.getBalance(config.openPayments.userWallet.walletAddress);
    
    if (balance.success) {
        const message = `
💳 *Información de Tu Wallet*

🔹 *Address:* \`${balance.address}\`
🔹 *Activo:* ${balance.assetCode}
🔹 *Escala:* ${balance.assetScale}

⚠️ *Nota:* Para ver balances específicos se requiere autenticación adicional.
        `;
        
        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown',
            ...getMainMenu()
        });
    } else {
        await bot.sendMessage(chatId, 
            `❌ Error: ${balance.error}`,
            getMainMenu()
        );
    }
});

// Manejar mensajes de texto (para flujos de conversación)
bot.on('message', async (msg) => {
    if (msg.text.startsWith('/')) return; // Ignorar comandos
    
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const userState = userStates.get(userId);

    if (!userState) return;

    try {
        switch (userState.action) {
            case 'adding_contact':
                await handleAddContactFlow(msg, userState);
                break;
            case 'sending_payment':
                await handleSendPaymentFlow(msg, userState);
                break;
        }
    } catch (error) {
        console.error('Error en flujo de conversación:', error);
        await bot.sendMessage(chatId, '❌ Ocurrió un error. Por favor, intenta nuevamente.', getMainMenu());
        userStates.delete(userId);
    }
});

// Flujo para agregar contacto
async function handleAddContactFlow(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    switch (userState.step) {
        case 'name':
            userState.contactName = text;
            userState.step = 'wallet';
            await bot.sendMessage(chatId, 
                '2. *Wallet Address del contacto:*\nEnvía la payment pointer (ej: $ilp.example.com/user)',
                { parse_mode: 'Markdown' }
            );
            break;

        case 'wallet':
            userState.contactWallet = text;
            userState.step = 'description';
            await bot.sendMessage(chatId, 
                '3. *Descripción (opcional):*\nEnvía una descripción o pulsa /saltar',
                { parse_mode: 'Markdown' }
            );
            break;

        case 'description':
            // Validar wallet address primero
            const validation = await walletService.validateWalletAddress(userState.contactWallet);
            
            if (!validation.valid) {
                await bot.sendMessage(chatId, 
                    `❌ Wallet address inválida: ${validation.error}\n\nPor favor, inicia nuevamente con /agregar`,
                    getMainMenu()
                );
                userStates.delete(userId);
                return;
            }

            const result = await contactManager.addContact(
                userId,
                userState.contactName,
                userState.contactWallet,
                text === '/saltar' ? '' : text
            );

            if (result.success) {
                await bot.sendMessage(chatId, 
                    `✅ *Contacto agregado exitosamente!*\n\n👤 ${result.contact.name}\n💰 ${result.contact.walletAddress}`,
                    { parse_mode: 'Markdown', ...getMainMenu() }
                );
            } else {
                await bot.sendMessage(chatId, 
                    `❌ Error: ${result.error}`,
                    getMainMenu()
                );
            }
            userStates.delete(userId);
            break;
    }
}

// Flujo para enviar pago
async function handleSendPaymentFlow(msg, userState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    switch (userState.step) {
        case 'select_contact':
            const contacts = await contactManager.listContacts(userId);
            const contactIndex = parseInt(text) - 1;
            
            if (isNaN(contactIndex) || contactIndex < 0 || contactIndex >= contacts.length) {
                await bot.sendMessage(chatId, 
                    `❌ Por favor, selecciona un número entre 1 y ${contacts.length}`,
                    { reply_markup: { remove_keyboard: true } }
                );
                return;
            }

            userState.selectedContact = contacts[contactIndex];
            userState.step = 'amount';
            await bot.sendMessage(chatId, 
                `💸 *Pago a:* ${userState.selectedContact.name}\n\n*Monto:*\nEnvía la cantidad a enviar (ej: 10.50)`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'amount':
            const amount = parseFloat(text);
            if (isNaN(amount) || amount <= 0) {
                await bot.sendMessage(chatId, '❌ Monto inválido. Envía un número positivo.');
                return;
            }

            if (amount > 1000) {
                await bot.sendMessage(chatId, '❌ Monto máximo permitido: $1000');
                return;
            }

            userState.amount = amount;
            userState.step = 'confirm';
            
            await bot.sendMessage(chatId, 
                `✅ *Confirmar Pago*\n\n👤 *Destinatario:* ${userState.selectedContact.name}\n💰 *Monto:* $${amount}\n📧 *Wallet:* ${userState.selectedContact.walletAddress}\n\n¿Confirmar envío? (sí/no)`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'confirm':
            if (text.toLowerCase() === 'sí' || text.toLowerCase() === 'si') {
                await bot.sendMessage(chatId, '⏳ Procesando pago...');
                
                const result = await walletService.sendPayment(
                    config.openPayments.userWallet.walletAddress,
                    userState.selectedContact.walletAddress,
                    userState.amount,
                    `Pago a ${userState.selectedContact.name}`
                );

                if (result.success) {
                    const successMessage = `
✅ *¡Pago exitoso!*

💰 *Monto:* $${result.amount}
👤 *Destinatario:* ${userState.selectedContact.name}
🆔 *ID:* \`${result.paymentId}\`
📊 *Estado:* ${result.state}

✨ Transacción completada exitosamente
                    `;
                    await bot.sendMessage(chatId, successMessage, { 
                        parse_mode: 'Markdown',
                        ...getMainMenu()
                    });
                } else {
                    await bot.sendMessage(chatId, 
                        `❌ *Error en el pago:* ${result.error}`,
                        { parse_mode: 'Markdown', ...getMainMenu() }
                    );
                }
            } else {
                await bot.sendMessage(chatId, '❌ Pago cancelado', getMainMenu());
            }
            userStates.delete(userId);
            break;
    }
}

// Ayuda
bot.onText(/\/ayuda|🆘 Ayuda/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `
🆘 *Ayuda - Bot de Pagos*

*Comandos disponibles:*
/start - Menú principal
/contactos - Gestionar contactos
/pagar - Enviar pago
/balance - Ver tu wallet
/agregar - Agregar contacto
/ayuda - Esta ayuda

*Flujo de trabajo:*
1. Agrega contactos con sus wallet addresses
2. Selecciona un contacto para enviar pago
3. Confirma la transacción

*Límites:*
• Monto mínimo: $0.01
• Monto máximo: $1000.00
• Moneda: USD

*Seguridad:*
Todas las transacciones usan Open Payments estándar.
    `;
    
    await bot.sendMessage(chatId, helpMessage, { 
        parse_mode: 'Markdown',
        ...getMainMenu()
    });
});

// Inicializar bot
async function main() {
    try {
        await initializeWallets();
        console.log('🚀 Bot iniciado correctamente');
        console.log('📱 Comandos disponibles:');
        console.log('   /start - Menú principal');
        console.log('   /contactos - Gestionar contactos');
        console.log('   /pagar - Enviar pago');
    } catch (error) {
        console.error('❌ Error iniciando bot:', error);
        process.exit(1);
    }
}

// Crear directorio data si no existe
const fs = require('fs');
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

main();

module.exports = { bot, walletService, contactManager };