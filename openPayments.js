// openPayments.js - Cliente para Open Payments API (CORREGIDO)
const axios = require('axios');

function resolvePaymentPointer(pointer) {
    if (!pointer || !pointer.startsWith('$')) {
        throw new Error('Formato inválido de Payment Pointer: ' + pointer);
    }
    // $wallet.interledger-test.dev/yayay → https://wallet.interledger-test.dev/yayay/.well-known/pay
    return 'https://' + pointer.substring(1) + '/.well-known/pay';
}

class OpenPaymentsClient {
    constructor(config) {
        // ... (constructor remains the same)
        if (!config || !config.A || !config.B) {
            throw new Error('Configuración incompleta: se requieren wallets A y B');
        }

        this.walletAddressA = config.A.walletAddress;
        this.walletAddressB = config.B.walletAddress;
        
        this.keyIdA = config.A.keyId;
        this.privateKeyA = config.A.privateKey;
        
        this.keyIdB = config.B.keyId;
        this.privateKeyB = config.B.privateKey;
        
        this.accessTokenA = config.A.accessToken;
        this.accessTokenB = config.B.accessToken;
        
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log(`🔧 Cliente configurado:`);
        console.log(`   Wallet A (remitente): ${this.walletAddressA}`);
        console.log(`   Wallet B (receptor): ${this.walletAddressB}`);
    }

    // Obtener información de wallet address
    async getWalletAddress(walletAddress) {
        try {
            console.log(`🔍 Obteniendo wallet: ${walletAddress}`);
            
            if (!walletAddress) {
                throw new Error('Wallet address no definida');
            }

            const url = resolvePaymentPointer(walletAddress);
            console.log(`🌐 URL resuelta: ${url}`);

            const response = await this.client.get(url);
            console.log(`✅ Wallet obtenida exitosamente`);
            return response.data;
        } catch (error) {
            console.error('❌ Error obteniendo wallet:', error.message);
            if (error.response) {
                console.error('   Respuesta del servidor:', error.response.status, error.response.data);
            }
            throw new Error(`No se pudo obtener la wallet: ${error.message}`);
        }
    }

    // Crear incoming payment (en wallet B - receptor)
    async createIncomingPayment(amount, description) {
        try {
            console.log(`💰 Creando incoming payment por $${amount}`);
            
            const walletB = await this.getWalletAddress(this.walletAddressB);
            
            // 💡 CAMBIO CRÍTICO: Usar la URL de capabilities
            const incomingPaymentsUrl = walletB.capabilities.incomingPayments.id;
            if (!incomingPaymentsUrl) {
                throw new Error('No se encontró la URL para crear incoming payments en la wallet B');
            }
            
            const paymentData = {
                walletAddress: this.walletAddressB,
                incomingAmount: {
                    value: (amount * 100).toString(),
                    assetCode: walletB.assetCode || 'USD',
                    assetScale: walletB.assetScale || 2
                },
                description: description || 'Pago vía bot Telegram'
            };

            console.log('📄 Datos del incoming payment:', JSON.stringify(paymentData, null, 2));

            const response = await this.client.post(
                incomingPaymentsUrl, // Usar la URL completa de capabilities
                paymentData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenB}`
                    }
                }
            );

            console.log('✅ Incoming payment creado:', response.data.id);
            return response.data;
        } catch (error) {
            console.error('❌ Error creando incoming payment:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
            throw new Error(`No se pudo crear incoming payment: ${error.message}`);
        }
    }

    // Crear quote (cotización del pago)
    async createQuote(incomingPayment, amount) {
        try {
            console.log(`📊 Creando quote para $${amount}`);
            
            const walletA = await this.getWalletAddress(this.walletAddressA);
            
            // 💡 CAMBIO CRÍTICO: Usar la URL de capabilities
            const quotesUrl = walletA.capabilities.quotes.id;
            if (!quotesUrl) {
                throw new Error('No se encontró la URL para crear quotes en la wallet A');
            }
            
            const quoteData = {
                walletAddress: this.walletAddressA,
                receiver: incomingPayment.id,
                method: 'ilp',
                debitAmount: {
                    value: (amount * 100).toString(),
                    assetCode: walletA.assetCode || 'USD',
                    assetScale: walletA.assetScale || 2
                }
            };

            console.log('📄 Datos del quote:', JSON.stringify(quoteData, null, 2));

            const response = await this.client.post(
                quotesUrl, // Usar la URL completa de capabilities
                quoteData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenA}`
                    }
                }
            );

            console.log('✅ Quote creado:', response.data.id);
            return response.data;
        } catch (error) {
            console.error('❌ Error creando quote:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
            throw new Error(`No se pudo crear quote: ${error.message}`);
        }
    }

    // Ejecutar pago (outgoing payment)
    async executePayment(quote) {
        try {
            console.log(`🚀 Ejecutando pago...`);
            
            const walletA = await this.getWalletAddress(this.walletAddressA);
            
            // 💡 CAMBIO CRÍTICO: Usar la URL de capabilities
            const outgoingPaymentsUrl = walletA.capabilities.outgoingPayments.id;
            if (!outgoingPaymentsUrl) {
                throw new Error('No se encontró la URL para ejecutar pagos en la wallet A');
            }
            
            const paymentData = {
                walletAddress: this.walletAddressA,
                quoteId: quote.id
            };

            console.log('📄 Datos del outgoing payment:', JSON.stringify(paymentData, null, 2));

            const response = await this.client.post(
                outgoingPaymentsUrl, // Usar la URL completa de capabilities
                paymentData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenA}`
                    }
                }
            );

            console.log('✅ Pago ejecutado:', response.data.id);
            return response.data;
        } catch (error) {
            console.error('❌ Error ejecutando pago:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
            throw new Error(`No se pudo ejecutar el pago: ${error.message}`);
        }
    }

    // ... (El resto del código de la clase se mantiene igual)

    // FUNCIÓN PRINCIPAL: Realizar pago completo A→B
    async sendPayment(amount, description = 'Pago vía bot Telegram') {
        // ... (this function remains the same)
        try {
            console.log(`\n🎯 Iniciando pago de $${amount}`);
            console.log(`   Desde: ${this.walletAddressA}`);
            console.log(`   Hacia: ${this.walletAddressB}`);

            if (!this.accessTokenA || !this.accessTokenB) {
                throw new Error('Tokens de acceso no configurados. Necesitas obtener tokens GNAP.');
            }

            const incomingPayment = await this.createIncomingPayment(amount, description);
            console.log('✅ Incoming payment creado');

            const quote = await this.createQuote(incomingPayment, amount);
            console.log('✅ Quote creado');

            const outgoingPayment = await this.executePayment(quote);
            console.log('✅ Pago ejecutado');

            return {
                success: true,
                amount: amount,
                paymentId: outgoingPayment.id,
                state: outgoingPayment.state,
                incomingPaymentId: incomingPayment.id,
                quoteId: quote.id,
                message: `Pago de $${amount} enviado exitosamente`
            };

        } catch (error) {
            console.error('❌ Error en sendPayment:', error.message);
            return {
                success: false,
                error: error.message,
                message: `Error al enviar pago: ${error.message}`
            };
        }
    }
}

module.exports = OpenPaymentsClient;