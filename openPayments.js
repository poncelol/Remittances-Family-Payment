// openPayments.js - Cliente para Open Payments API (CORREGIDO)
const axios = require('axios');

function resolvePaymentPointer(pointer) {
    if (!pointer || !pointer.startsWith('$')) {
        throw new Error('Formato inválido de Payment Pointer: ' + pointer);
    }
    // CORRECCIÓN: La URL correcta es sin /.well-known/pay al final
    // $wallet.interledger-test.dev/yayay → https://wallet.interledger-test.dev/yayay
    return 'https://' + pointer.substring(1);
}

class OpenPaymentsClient {
    constructor(config) {
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
            
            // CORRECCIÓN CRÍTICA: Usar la URL correcta
            const authServer = walletB.authServer;
            const incomingPaymentsUrl = `${resolvePaymentPointer(this.walletAddressB)}/incoming-payments`;
            
            console.log(`📍 Auth Server: ${authServer}`);
            console.log(`📍 Incoming Payments URL: ${incomingPaymentsUrl}`);
            
            const paymentData = {
                walletAddress: this.walletAddressB,
                incomingAmount: {
                    value: (amount * 100).toString(), // Convertir a centavos
                    assetCode: walletB.assetCode || 'USD',
                    assetScale: walletB.assetScale || 2
                },
                description: description || 'Pago vía bot Telegram'
            };

            console.log('📄 Datos del incoming payment:', JSON.stringify(paymentData, null, 2));

            const response = await this.client.post(
                incomingPaymentsUrl,
                paymentData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenB}`,
                        'Content-Type': 'application/json'
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
            
            // CORRECCIÓN CRÍTICA: Usar la URL correcta
            const quotesUrl = `${resolvePaymentPointer(this.walletAddressA)}/quotes`;
            
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
                quotesUrl,
                quoteData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenA}`,
                        'Content-Type': 'application/json'
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
            
            // CORRECCIÓN CRÍTICA: Usar la URL correcta
            const outgoingPaymentsUrl = `${resolvePaymentPointer(this.walletAddressA)}/outgoing-payments`;
            
            const paymentData = {
                walletAddress: this.walletAddressA,
                quoteId: quote.id
            };

            console.log('📄 Datos del outgoing payment:', JSON.stringify(paymentData, null, 2));

            const response = await this.client.post(
                outgoingPaymentsUrl,
                paymentData,
                {
                    headers: {
                        'Authorization': `GNAP ${this.accessTokenA}`,
                        'Content-Type': 'application/json'
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

    // Probar conexión
    async testConnection() {
        try {
            console.log('🧪 Probando conexión con Open Payments...');
            
            const walletA = await this.getWalletAddress(this.walletAddressA);
            const walletB = await this.getWalletAddress(this.walletAddressB);
            
            return {
                success: true,
                walletA: {
                    id: walletA.id,
                    assetCode: walletA.assetCode,
                    assetScale: walletA.assetScale,
                    authServer: walletA.authServer
                },
                walletB: {
                    id: walletB.id,
                    assetCode: walletB.assetCode,
                    assetScale: walletB.assetScale,
                    authServer: walletB.authServer
                }
            };
        } catch (error) {
            console.error('❌ Error en test de conexión:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // FUNCIÓN PRINCIPAL: Realizar pago completo A→B
    async sendPayment(amount, description = 'Pago vía bot Telegram') {
        try {
            console.log(`\n🎯 Iniciando pago de $${amount}`);
            console.log(`   Desde: ${this.walletAddressA}`);
            console.log(`   Hacia: ${this.walletAddressB}`);

            if (!this.accessTokenA || !this.accessTokenB) {
                throw new Error('Tokens de acceso no configurados. Necesitas obtener tokens GNAP primero.');
            }

            // Paso 1: Crear incoming payment
            const incomingPayment = await this.createIncomingPayment(amount, description);
            console.log('✅ Incoming payment creado');

            // Paso 2: Crear quote
            const quote = await this.createQuote(incomingPayment, amount);
            console.log('✅ Quote creado');

            // Paso 3: Ejecutar pago
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