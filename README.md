# Remittances-Family-Payment (RFP)

RFP es una plataforma que permite a migrantes enviar dinero a sus familias de forma **instantánea, segura y sin intermediarios costosos**, utilizando **Open Payments API** e **Interledger (test wallets)**.  
El envío es tan sencillo como escribir un mensaje en un chat de **Telegram**, con validación del remitente, confirmaciones en tiempo real y trazabilidad completa de cada transacción.

---

## 🛑 ¿Cuál es el problema?
- **Costos altos:** Las remesas tradicionales cobran comisiones elevadas.  
- **Tiempos de espera:** Los pagos pueden tardar días en liquidarse.  
- **Falta de transparencia:** Difícil seguimiento del estado del envío.  
- **Acceso limitado:** Muchas familias no tienen acceso a servicios bancarios tradicionales.

---

## 🛠️ ¿Qué tecnología usarán?
- **Open Payments API** (cliente oficial `@interledger/open-payments`) para crear incoming payments, quotes y outgoing payments.  
- **Interledger** (test wallets) como red de liquidación.  
- **Telegram Bot API** para la interfaz conversacional (`node-telegram-bot-api`).  
- **Node.js** para el backend.  
- **dotenv** para gestión de credenciales y rutas de claves privadas.  
- **Archivo de clave privada (.key)** para autenticación GNAP con `createAuthenticatedClient`.  
- **(Opcional)** PostgreSQL/MongoDB para persistencia de usuarios y logs.  
- **Infra**: VPS/Render/Heroku/containers para ejecutar el bot 24/7.

---

## 💡 ¿Cuál es la solución?
Un **bot de Telegram** que conecta a remitentes con wallets Interledger a través de Open Payments.  
Flujo resumido:

1. El remitente envía `/send 50.00 Para mamá`.  
2. El bot valida la identidad del remitente.  
3. Se crea un **Incoming Payment** en la wallet receptora (B).  
4. Se crea un **Quote** en la wallet remitente (A) apuntando al incoming payment.  
5. Se ejecuta un **Outgoing Payment** usando el quote.  
6. Se notifica en tiempo real al remitente (y opcionalmente al receptor).

---

## 🎯 Beneficios
- **Menor costo** frente a intermediarios tradicionales.  
- **Liquidación rápida** (según configuración de la red).  
- **Trazabilidad y auditoría**: cada operación tiene IDs (incoming, quote, outgoing).  
- **Simplicidad**: UX a través de Telegram.  
- **Seguridad**: autenticación con claves privadas (GNAP) y almacenamiento seguro de las mismas.

---

## 🏗️ Arquitectura / Stack (simple)

[Usuario Telegram]
│
▼
[Telegram Bot (Node.js)]
│
▼
[OpenPayments Client (createAuthenticatedClient)]
├── Wallet A (Remitente)
└── Wallet B (Receptor)
│
▼
[Interledger / Open Payments API]
│
└── (Opcional) DB para logs y usuarios

markdown
Copiar código

- **Frontend**: Telegram chat (no app adicional).  
- **Backend**: Node.js + `@interledger/open-payments`.  
- **Secrets**: claves privadas → archivos `.key` fuera del repositorio.  
- **Persistencia**: opcional (registro de transacciones, historial).

---

## 🔑 Funciones indispensables
1. **Registro / Validación de usuarios** (identificar remitente y autorizar acciones).  
2. **Comando `/send [cantidad] [descripción]`** — flujo completo de pago.  
3. **Comando `/balance` / `/test`** — info de wallets (assetCode, assetScale, id).  
4. **Notificaciones en tiempo real** en Telegram (estado, errores, confirmaciones).  
5. **Manejo seguro de claves** — usar archivos `.key`, `dotenv` y buenas prácticas (no commitear).  
6. **Logs y trazabilidad** (ID de incoming, quote, outgoing).  
7. **Límites y validaciones** (monto mínimo/máximo, formato de cantidad).  
8. **Manejo de errores y reintentos** en transacciones fallidas.

---

## 👥 Roles y responsabilidades
- **Desarrollador Backend**  
  - Implementa bot, integraciones con Open Payments, manejo de errores y tests.  
- **Ingeniero DevOps**  
  - Despliegue, CI/CD, monitoreo, backups, y gestión segura de claves.  
- **Diseñador UX conversacional**  
  - Define flujos de conversación, mensajes claros y manejo de edge cases.  
- **QA / Tester**  
  - Pruebas end-to-end, casos límite, simulaciones de fallos.  
- **Líder de Proyecto**  
  - Coordinación, roadmap, documentación, relación con stakeholders.

---

## ✅ Requisitos mínimos para puesta en marcha
1. Node.js (LTS) y npm.  
2. Librerías: `node-telegram-bot-api`, `@interledger/open-payments`, `dotenv`, `axios` (si se necesita).  
3. Un `.env` con:
   - `TELEGRAM_TOKEN`
   - `WALLET_A_ADDRESS` (URL)
   - `WALLET_A_KEY_ID`
   - `WALLET_A_PRIVATE_KEY_PATH` (ruta a archivo .key)
   - `WALLET_B_ADDRESS` (URL)
   - `WALLET_B_KEY_ID`
   - `WALLET_B_PRIVATE_KEY_PATH`
4. Archivos de claves privadas `.key` (PEM/PKCS8) para A y B, fuera del repo.  
5. Un servidor para ejecutar el bot 24/7.

---

## 🧩 Ejemplo `.env` (local)
```env
TELEGRAM_TOKEN=123456:ABC-DEF...
WALLET_A_ADDRESS=https://ilp.interledger-test.dev/yayay
WALLET_A_KEY_ID=<key-id-A>
WALLET_A_PRIVATE_KEY_PATH=./keys/walletA.key

WALLET_B_ADDRESS=https://ilp.interledger-test.dev/yareyare
WALLET_B_KEY_ID=<key-id-B>
WALLET_B_PRIVATE_KEY_PATH=./keys/walletB.key
