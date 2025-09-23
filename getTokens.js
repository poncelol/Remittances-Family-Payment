// getTokens.js - Script para obtener tokens GNAP
const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');

// Función para crear firma HTTP Message Signatures
function createSignature(keyId, privateKey, method, path, host, body = null) {
    const algorithm = 'ed25519';
    
    // Crear el string para firmar
    let stringToSign = `"@method": ${method.toUpperCase()}\n`;
    stringToSign += `"@target-uri": https://${host}${path}\n`;
    
    if (body) {
        const digest = crypto.createHash('sha256').update(body).digest('base64');
        stringToSign += `"content-digest": sha-256=:${digest}:\n`;
    }
    
    // Quitar el último \n
    stringToSign = stringToSign.slice(0, -1);
    
    // Crear la firma
    const privateKeyBuffer = Buffer.from(privateKey, 'base64');
    const signature = crypto.sign(null, Buffer.from(stringToSign), {
        key: privateKeyBuffer,
        format: 'der',
        type: 'pkcs8'
    });
    
    const signatureB64 = signature.toString('base64');
    
    return {
        signature: signatureB64,
        stringToSign: stringToSign
    };
}

// Obtener token para una wallet
async function getGNAPToken(walletAddress, keyId, privateKey) {
    try {
        console.log(`\n🔑 Obteniendo token GNAP para: ${walletAddress}`);
        
        // 1. Obtener información de la wallet
        const walletUrl = 'https://' + walletAddress.substring(1);
        const walletResponse = await axios.get(walletUrl);
        const wallet = walletResponse.data;
        
        console.log(`📍 Auth Server: ${wallet.authServer}`);
        
        // 2. Preparar la request GNAP
        const authServerUrl = new URL(wallet.authServer);
        const gnapPath = '/';
        
        const gnapRequest = {
            access_token: {
                access: [
                    {
                        type: "incoming-payment",
                        actions: ["create", "read", "list"]
                    },
                    {
                        type: "outgoing-payment",
                        actions: ["create", "read", "list"]
                    },
                    {
                        type: "quote",
                        actions: ["create", "read"]
                    }
                ]
            },
            client: {
                key: {
                    proof: "httpsig",
                    jwk: {
                        kid: keyId,
                        x: "placeholder", // En producción esto debe ser la clave pública JWK
                        kty: "OKP",
                        crv: "Ed25519"
                    }
                }
            },
            interact: {
                start: ["redirect"]
            }
        };
        
        const requestBody = JSON.stringify(gnapRequest);
        console.log('📄 GNAP Request:', requestBody);
        
        // 3. Crear la firma
        const { signature } = createSignature(
            keyId,
            privateKey,
            'POST',
            gnapPath,
            authServerUrl.host,
            requestBody
        );
        
        // 4. Hacer la request GNAP
        const gnapResponse = await axios.post(
            wallet.authServer,
            gnapRequest,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Signature-Input': `sig1=("@method" "@target-uri" "content-digest");created=${Math.floor(Date.now()/1000)};keyid="${keyId}";alg="ed25519"`,
                    'Signature': `sig1=:${signature}:`,
                    'Content-Digest': `sha-256=:${crypto.createHash('sha256').update(requestBody).digest('base64')}:`
                }
            }
        );
        
        console.log('✅ Respuesta GNAP recibida');
        console.log('📄 Response:', JSON.stringify(gnapResponse.data, null, 2));
        
        // Si hay continue, necesitaremos hacer más requests
        if (gnapResponse.data.continue) {
            console.log('⏳ Se requiere continuación del flujo GNAP');
            console.log(`🔗 Continue URI: ${gnapResponse.data.continue.uri}`);
            console.log(`🎫 Continue Token: ${gnapResponse.data.continue.access_token.value}`);
        }
        
        if (gnapResponse.data.access_token) {
            console.log(`🎉 ¡Token obtenido!: ${gnapResponse.data.access_token.value}`);
            return gnapResponse.data.access_token.value;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Error obteniendo token GNAP:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Función principal
async function main() {
    try {
        console.log('🚀 Obteniendo tokens GNAP...\n');
        
        // Obtener token para wallet A (yayay)
        const tokenA = await getGNAPToken(
            config.openPayments.A.walletAddress,
            config.openPayments.A.keyId,
            config.openPayments.A.privateKey
        );
        
        // Obtener token para wallet B (yareyare)
        const tokenB = await getGNAPToken(
            config.openPayments.B.walletAddress,
            config.openPayments.B.keyId,
            config.openPayments.B.privateKey
        );
        
        console.log('\n📋 RESUMEN:');
        console.log('='.repeat(50));
        
        if (tokenA) {
            console.log(`✅ Token A (${config.openPayments.A.walletAddress}): ${tokenA}`);
        } else {
            console.log(`❌ Token A: No obtenido`);
        }
        
        if (tokenB) {
            console.log(`✅ Token B (${config.openPayments.B.walletAddress}): ${tokenB}`);
        } else {
            console.log(`❌ Token B: No obtenido`);
        }
        
        if (tokenA && tokenB) {
            console.log('\n🔧 Agrega estos tokens a tu config.js:');
            console.log(`A: { accessToken: "${tokenA}" }`);
            console.log(`B: { accessToken: "${tokenB}" }`);
        } else {
            console.log('\n⚠️ Algunos tokens no se pudieron obtener.');
            console.log('💡 Puede que necesites completar el flujo de autorización manualmente.');
        }
        
    } catch (error) {
        console.error('❌ Error en main:', error.message);
    }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
    main();
}

module.exports = { getGNAPToken };