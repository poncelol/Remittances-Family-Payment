// fixTokens.js - VERSIÓN CORREGIDA
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const config = require('./config');

// Función mejorada para crear firmas
function createImprovedSignature(keyId, privateKey, method, url, body = null) {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Crear componentes de la firma
        const components = [
            `"@method": ${method}`,
            `"@target-uri": ${url}`
        ];
        
        if (body) {
            const digest = crypto.createHash('sha256').update(body).digest('base64');
            components.push(`"content-digest": sha-256=:${digest}:`);
        }
        
        components.push(`"@authority": ${new URL(url).host}`);
        
        const signatureInput = `sig1=(${components.map(c => c.split(':')[0].replace('"', '')).join(' ')});created=${timestamp};keyid="${keyId}";alg="ed25519"`;
        
        const stringToSign = components.join('\n');
        
        // Firmar
        const privateKeyBuffer = Buffer.from(privateKey, 'base64');
        const signature = crypto.sign(null, Buffer.from(stringToSign), {
            key: privateKeyBuffer,
            format: 'der',
            type: 'pkcs8'
        });
        
        return {
            signature: signature.toString('base64'),
            signatureInput: signatureInput,
            stringToSign: stringToSign
        };
    } catch (error) {
        console.error('❌ Error en firma:', error);
        throw error;
    }
}

// Obtener información de la wallet CON MÁS TIEMPO
async function getWalletInfo(walletAddress) {
    try {
        const url = 'https://' + walletAddress.substring(1);
        console.log(`🔍 Obteniendo info de wallet: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 30000  // Aumentado a 30 segundos
        });
        
        console.log(`✅ Wallet info obtenida para: ${walletAddress}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error obteniendo wallet ${walletAddress}:`, error.message);
        if (error.code === 'ECONNABORTED') {
            console.log('💡 La conexión está tardando mucho. El servidor puede estar lento.');
        }
        throw error;
    }
}

// Flujo GNAP corregido
async function getGNAPTokenSimple(walletConfig, walletName) {
    try {
        console.log(`\n🎯 Obteniendo token para ${walletName}...`);
        console.log(`📍 Wallet: ${walletConfig.walletAddress}`);
        
        // 1. Obtener información de la wallet
        const walletInfo = await getWalletInfo(walletConfig.walletAddress);
        console.log(`✅ Wallet info obtenida`);
        console.log(`   Auth Server: ${walletInfo.authServer}`);
        console.log(`   Asset: ${walletInfo.assetCode} (scale: ${walletInfo.assetScale})`);
        
        // 2. Preparar request GNAP más simple
        const gnapRequest = {
            access_token: {
                access: [
                    {
                        type: "incoming-payment",
                        actions: ["create", "read"]
                    },
                    {
                        type: "outgoing-payment", 
                        actions: ["create", "read"]
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
                        kid: walletConfig.keyId,
                        kty: "OKP",
                        crv: "Ed25519"
                    }
                }
            },
            interact: {
                start: ["redirect"],
                finish: {
                    method: "redirect",
                    uri: "https://telegram-bot.local/callback",
                    nonce: crypto.randomBytes(16).toString('hex')
                }
            }
        };
        
        const requestBody = JSON.stringify(gnapRequest);
        
        // 3. Crear firma
        const { signature, signatureInput } = createImprovedSignature(
            walletConfig.keyId,
            walletConfig.privateKey,
            'POST',
            walletInfo.authServer,
            requestBody
        );
        
        // 4. Hacer request GNAP
        console.log(`🌐 Enviando request GNAP a: ${walletInfo.authServer}`);
        
        const response = await axios.post(walletInfo.authServer, gnapRequest, {
            headers: {
                'Content-Type': 'application/json',
                'Signature-Input': signatureInput,
                'Signature': `sig1=:${signature}:`,
                'Accept': 'application/json'
            },
            timeout: 30000  // 30 segundos para GNAP
        });
        
        console.log(`✅ Respuesta GNAP recibida (status: ${response.status})`);
        
        // Analizar respuesta
        if (response.data.access_token) {
            const token = response.data.access_token.value;
            console.log(`🎉 TOKEN OBTENIDO: ${token.substring(0, 50)}...`);
            return token;
        }
        
        if (response.data.continue) {
            console.log('⚠️ Se requiere interacción del usuario');
            console.log(`🔗 URI: ${response.data.continue.uri}`);
            console.log(`🎫 Token continuar: ${response.data.continue.access_token.value}`);
            
            // En un caso real, aquí redirigirías al usuario para autorizar
            console.log('💡 Para completar la autorización, visita la URL anterior en tu navegador');
            return null;
        }
        
        console.log('📄 Respuesta completa:', JSON.stringify(response.data, null, 2));
        return null;
        
    } catch (error) {
        console.error(`❌ Error obteniendo token para ${walletName}:`, error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Actualizar configuración con tokens
function updateConfigWithTokens(tokenA, tokenB) {
    try {
        const configPath = './config.js';
        
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Reemplazar tokens en la configuración A
        if (tokenA) {
            if (configContent.includes('accessToken: "tu_token_gnap_aqui"')) {
                configContent = configContent.replace(
                    'accessToken: "tu_token_gnap_aqui"',
                    `accessToken: "${tokenA}"`
                );
            } else {
                // Si no encuentra el placeholder, agregar el token
                configContent = configContent.replace(
                    /A: {[^}]+}/,
                    `A: {
      walletAddress: "${config.openPayments.A.walletAddress}",
      keyId: "${config.openPayments.A.keyId}",
      privateKey: \`${config.openPayments.A.privateKey}\`,
      accessToken: "${tokenA}"
    }`
                );
            }
        }
        
        // Reemplazar tokens en la configuración B
        if (tokenB) {
            if (configContent.includes('accessToken: "tu_token_gnap_aqui"')) {
                configContent = configContent.replace(
                    'accessToken: "tu_token_gnap_aqui"',
                    `accessToken: "${tokenB}"`
                );
            } else {
                configContent = configContent.replace(
                    /B: {[^}]+}/,
                    `B: {
      walletAddress: "${config.openPayments.B.walletAddress}",
      keyId: "${config.openPayments.B.keyId}",
      privateKey: \`${config.openPayments.B.privateKey}\`,
      accessToken: "${tokenB}"
    }`
                );
            }
        }
        
        fs.writeFileSync(configPath, configContent);
        console.log('✅ Configuración actualizada con los nuevos tokens');
        
    } catch (error) {
        console.error('❌ Error actualizando configuración:', error.message);
    }
}

// Función principal CORREGIDA
async function main() {
    try {
        console.log('🔧 INICIANDO SOLUCIÓN DE TOKENS GNAP...\n');
        console.log('⏳ Esto puede tomar hasta 30 segundos por wallet...\n');
        
        // Obtener token para wallet A
        const tokenA = await getGNAPTokenSimple(config.openPayments.A, 'Wallet A (yayay)');
        
        // Obtener token para wallet B  
        const tokenB = await getGNAPTokenSimple(config.openPayments.B, 'Wallet B (yareyare)');
        
        console.log('\n📋 RESULTADOS:');
        console.log('='.repeat(50));
        
        if (tokenA) {
            console.log(`✅ Token A: OBTENIDO (${tokenA.substring(0, 30)}...)`);
        } else {
            console.log('❌ Token A: No se pudo obtener automáticamente');
        }
        
        if (tokenB) {
            console.log(`✅ Token B: OBTENIDO (${tokenB.substring(0, 30)}...)`);
        } else {
            console.log('❌ Token B: No se pudo obtener automáticamente');
        }
        
        // Actualizar configuración
        if (tokenA || tokenB) {
            updateConfigWithTokens(tokenA, tokenB);
            console.log('\n🎯 PRÓXIMOS PASOS:');
            
            if (tokenA && tokenB) {
                console.log('1. ✅ Ambos tokens obtenidos!');
                console.log('2. 🚀 Ejecuta: node bot.js');
                console.log('3. 💸 Prueba con: /send 1.00 Test');
            } else {
                console.log('1. ⚠️ Algunos tokens faltan');
                console.log('2. 🔗 Completa la autorización manualmente');
                console.log('3. 📝 Actualiza config.js con los tokens faltantes');
            }
        } else {
            console.log('\n💡 SOLUCIÓN ALTERNATIVA RÁPIDA:');
            console.log('1. 🌐 Visita: https://wallet.interledger-test.dev');
            console.log('2. 🔑 Inicia sesión con:');
            console.log('   - Usuario: yayay, Contraseña: yayay');
            console.log('   - Usuario: yareyare, Contraseña: yareyare');
            console.log('3. 🎫 Crea grants manualmente y copia los tokens');
            console.log('4. ⚙️ Actualiza manualmente config.js');
        }
        
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
    }
}

// Ejecutar
if (require.main === module) {
    main();
}

module.exports = { getGNAPTokenSimple };