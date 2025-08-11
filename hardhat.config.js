require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Optimizations for Alkebuleum blockchain
      viaIR: true,
      evmVersion: "paris",
    },
  },
  networks: {
    // Sepolia testnet for development and testing
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-project-id",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
    },
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Alkebuleum mainnet (production)
    alkebuleum: {
      url: process.env.ALKEBULEUM_RPC_URL || "https://rpc.alkebuleum.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: process.env.ALKEBULEUM_CHAIN_ID || 1337, // Update with actual chain ID
      gasPrice: process.env.ALKEBULEUM_GAS_PRICE || 1000000000, // 1 gwei (adjust based on network)
      timeout: 120000, // Longer timeout for mainnet
      verify: {
        etherscan: {
          apiUrl: process.env.ALKEBULEUM_EXPLORER_API_URL || "https://explorer.alkebuleum.org/api",
        },
      },
    },
    // Alkebuleum testnet (if available)
    alkebuleumTestnet: {
      url: process.env.ALKEBULEUM_TESTNET_RPC_URL || "https://testnet-rpc.alkebuleum.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: process.env.ALKEBULEUM_TESTNET_CHAIN_ID || 1338, // Update with actual testnet chain ID
      gasPrice: process.env.ALKEBULEUM_TESTNET_GAS_PRICE || 1000000000, // 1 gwei
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      // Sepolia
      sepolia: process.env.ETHERSCAN_API_KEY,
      // Alkebuleum (if supported)
      alkebuleum: process.env.ALKEBULEUM_EXPLORER_API_KEY || process.env.ETHERSCAN_API_KEY,
      alkebuleumTestnet: process.env.ALKEBULEUM_EXPLORER_API_KEY || process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "alkebuleum",
        chainId: parseInt(process.env.ALKEBULEUM_CHAIN_ID || "1337"),
        urls: {
          apiURL: process.env.ALKEBULEUM_EXPLORER_API_URL || "https://explorer.alkebuleum.org/api",
          browserURL: process.env.ALKEBULEUM_EXPLORER_URL || "https://explorer.alkebuleum.org",
        },
      },
      {
        network: "alkebuleumTestnet",
        chainId: parseInt(process.env.ALKEBULEUM_TESTNET_CHAIN_ID || "1338"),
        urls: {
          apiURL: process.env.ALKEBULEUM_TESTNET_EXPLORER_API_URL || "https://testnet-explorer.alkebuleum.org/api",
          browserURL: process.env.ALKEBULEUM_TESTNET_EXPLORER_URL || "https://testnet-explorer.alkebuleum.org",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 1,
    showMethodSig: true,
    showTimeSpent: true,
    // Alkebuleum-specific gas reporting
    excludeContracts: ["AlkebuleumPropertyToken"],
    src: "./contracts",
  },
  // Path mapping for better imports
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  // Compiler settings optimized for Alkebuleum
  compilers: [
    {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        viaIR: true,
        evmVersion: "paris",
      },
    },
  ],
  // Contract verification settings
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};
