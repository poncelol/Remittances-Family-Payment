// config.js - Configuraciones del proyecto (ACTUALIZADO)

module.exports = {
  // Configuración del bot de Telegram
  telegram: {
    token: "8239862376:AAFw_fejAJLWwoMzHv8qAoYG3gBVB119GIY"
  },

  // Configuración de Open Payments API
  openPayments: {
    // Wallet que envía (yayay)
    A: {
      walletAddress: "$ilp.interledger-test.dev/yayay",
      keyId: "f7e2c3cf-1ab5-45c6-9246-ee16f7a20d4e",
      privateKey: `MC4CAQAwBQYDK2VwBCIEIMmH/8BYVXjnNYWvyKwYOo0zlcEnfrMy8iBq5XxEkxNW`,
      accessToken: "gnap_test_token_yayay_123"
    },

    // Wallet que recibe (yareyare)
    B: {
      walletAddress: "$ilp.interledger-test.dev/yareyare",
      keyId: "1fbfe5f5-b61d-423b-9494-b1fe50422e08",
      privateKey: `MC4CAQAwBQYDK2VwBCIEIEx3dU+bsxL7JnrRFJ+HDJnjC3If5xWVnrlqYzDe9LTF`,
      accessToken: "gnap_test_token_yareyare_456"
    }
  },

  // Configuraciones generales
  app: {
    currency: "USD",
    scale: 2,
    defaultAmount: 1.0,
    maxAmount: 1000.0,
    minAmount: 0.01
  }
};