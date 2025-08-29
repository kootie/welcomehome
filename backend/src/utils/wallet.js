const { ethers } = require('ethers');

// Generate an encrypted keystore for a new wallet
async function generateEncryptedWalletKeystore(password) {
  const wallet = ethers.Wallet.createRandom();
  const keystore = await wallet.encrypt(password, {
    scrypt: { N: 1 << 18 },
  });
  return {
    address: wallet.address,
    keystoreJson: keystore,
  };
}

module.exports = {
  generateEncryptedWalletKeystore,
};


