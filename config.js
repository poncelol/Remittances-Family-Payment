// config.js
module.exports = {
  telegram: {
    token: "8239862376:AAFw_fejAJLWwoMzHv8qAoYG3gBVB119GIY"
  },

  openPayments: {
    userWallet: {
      walletAddress: "$ilp.interledger-test.dev/yayay",
      keyId: "f7e2c3cf-1ab5-45c6-9246-ee16f7a20d4e",
      privateKeyPath: "./keys/wallet_private.pem"  // 👈 apunta al archivo
    }
  },

  app: {
    currency: "USD",
    scale: 2,
    defaultAmount: 1.0,
    maxAmount: 1000.0,
    minAmount: 0.01
  }
};
