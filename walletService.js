// walletService.js
const { createAuthenticatedClient, createUnauthenticatedClient } = require('@interledger/open-payments');
const fs = require('fs');
const path = require('path');

class WalletService {
    constructor(openPaymentsConfig) {
        this.openPaymentsConfig = openPaymentsConfig;
        this.client = null;
    }

    // Crear cliente autenticado de Open Payments
    async createClient(walletAddress, privateKeyPath, keyId) {
        try {
            console.log('🔑 Inicializando cliente Open Payments...');

            const privateKeyFile = path.resolve(privateKeyPath);
            if (!fs.existsSync(privateKeyFile)) {
                throw new Error(`Archivo de clave privada no encontrado: ${privateKeyFile}`);
            }

            this.client = await createAuthenticatedClient({
                walletAddress,
                privateKey: privateKeyFile, // la librería admite la ruta del archivo PEM
                keyId
            });

            console.log(`✅ Cliente autenticado configurado para: ${walletAddress}`);
            return true;
        } catch (error) {
            console.error('❌ Error creando cliente Open Payments:', error.message);
            return false;
        }
    }

    // Validar wallet address
    async validateWalletAddress(walletAddress) {
        try {
            if (!walletAddress.startsWith('$')) {
                return { valid: false, error: 'El payment pointer debe iniciar con $' };
            }

            const unauthClient = createUnauthenticatedClient();
            const result = await unauthClient.walletAddress.get({ url: walletAddress });

            return { valid: !!result, data: result };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Consultar balance (requiere autenticación)
    async getBalance(walletAddress) {
        try {
            if (!this.client) {
                throw new Error('Cliente no inicializado');
            }

            const balance = await this.client.balance.get({
                url: `${walletAddress}/balances`
            });

            return {
                success: true,
                address: walletAddress,
                assetCode: balance.assetCode,
                assetScale: balance.assetScale
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Enviar pago
    async sendPayment(fromWallet, toWallet, amount, description = '') {
        try {
            if (!this.client) {
                throw new Error('Cliente no inicializado');
            }

            const payment = await this.client.outgoingPayment.create({
                walletAddress: fromWallet,
                body: {
                    receiver: toWallet,
                    amount: {
                        value: (amount * 100).toString(), // ejemplo: 10.50 USD -> "1050" si escala=2
                        assetCode: 'USD',
                        assetScale: 2
                    },
                    metadata: { description }
                }
            });

            return {
                success: true,
                paymentId: payment.id,
                state: payment.state,
                amount: amount
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = WalletService;
