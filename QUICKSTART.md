## Welcome Home MVP Quickstart

### Prereqs
- Node 18+
- MetaMask

### 1) Install deps
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2) Env files
- Root: optional `.env` from `env.example` (needed for testnet deploys)
- Backend: `backend/.env` is created with local defaults (PORT=3001, FRONTEND_URL=http://localhost:3000)

### 3) Start local chain and deploy
Open three terminals in repo root:

Terminal A:
```bash
npm run node
```

Terminal B:
```bash
npx hardhat run scripts/deploy-mvp.js --network localhost
```

Terminal C:
```bash
cd backend && npm run dev
```

Terminal D:
```bash
cd frontend && npm start
```

### 4) Configure wallet
- Connect MetaMask to Localhost 8545 (chainId 31337)
- Use the first Hardhat account (pre-funded)

### 5) Frontend contract addresses
- Already wired for localhost in `frontend/src/services/web3.ts`:
  - GasFeeManager, RateLimiter, TransactionOrchestrator

### URLs
- Backend health: http://localhost:3001/health
- Frontend: http://localhost:3000


