# 🚀 Welcome Home Property - Backend API

A robust Node.js/Express backend with SQLite database for the Welcome Home Property platform, providing comprehensive APIs for real estate tokenization, KYC verification, marketplace operations, and governance.

## 🏗️ **Architecture Overview**

```
📁 Backend/
├── 📁 src/
│   ├── 📁 routes/          # API route handlers
│   ├── 📁 middleware/      # Express middleware
│   ├── 📁 database/        # Database connection & schema
│   ├── 📁 utils/           # Utility functions
│   └── server.js           # Main server file
├── 📁 data/                # SQLite database files
├── 📁 logs/                # Application logs
├── 📁 uploads/             # File uploads (if implemented)
└── package.json            # Dependencies & scripts
```

## 🚀 **Quick Start**

### Prerequisites
- Node.js 16+ and npm
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd welcomehome/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start development server
npm run dev
```

### Environment Configuration
Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Database Configuration
DB_PATH=./data/welcome_home_property.db

# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ALKEBULEUM_RPC_URL=https://rpc.alkebuleum.org

# Logging
LOG_LEVEL=info
```

## 📊 **Database Schema**

### Core Tables
- **users**: User profiles and wallet addresses
- **kyc_records**: KYC verification documents
- **properties**: Real estate property information
- **property_tokens**: Tokenized property tokens
- **user_token_holdings**: User token balances
- **marketplace_listings**: Property token listings
- **transactions**: Blockchain transaction records
- **governance_proposals**: Governance proposals
- **user_votes**: User voting records
- **property_valuations**: Property valuation history
- **property_history**: Property change tracking

### Database Operations
```bash
# Initialize database
npm run db:migrate

# Seed with sample data
npm run db:seed

# Reset database
npm run db:reset
```

## 🔌 **API Endpoints**

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - Wallet-based authentication
- `POST /wallet-connect` - Connect wallet to account
- `GET /me` - Get user profile
- `POST /refresh` - Refresh JWT token

### Properties (`/api/properties`)
- `POST /` - Create new property
- `GET /` - List properties with filtering
- `GET /:id` - Get property details
- `PUT /:id` - Update property
- `DELETE /:id` - Delete property
- `GET /:id/history` - Property change history
- `GET /:id/valuations` - Property valuations

### KYC (`/api/kyc`)
- `POST /submit` - Submit KYC documents
- `GET /status/:wallet_address` - Get KYC status
- `PUT /verify/:record_id` - Verify KYC documents
- `GET /pending` - List pending verifications
- `GET /verified` - List verified users
- `DELETE /:record_id` - Delete KYC record

### Users (`/api/users`)
- `GET /` - List users with filtering
- `GET /:wallet_address` - Get user profile
- `PUT /:wallet_address` - Update user profile
- `GET /:wallet_address/token-holdings` - User token holdings
- `GET /:wallet_address/transactions` - User transaction history
- `GET /:wallet_address/votes` - User governance votes
- `DELETE /:wallet_address` - Deactivate account

### Marketplace (`/api/marketplace`)
- `POST /list` - Create token listing
- `GET /listings` - List marketplace listings
- `GET /listings/:id` - Get listing details
- `PUT /listings/:id` - Update listing
- `DELETE /listings/:id` - Cancel listing
- `POST /purchase` - Purchase tokens

### Governance (`/api/governance`)
- `POST /proposals` - Create governance proposal
- `GET /proposals` - List proposals
- `GET /proposals/:id` - Get proposal details
- `POST /vote` - Cast vote on proposal
- `GET /proposals/:id/votes` - Get proposal votes
- `PUT /proposals/:id/status` - Update proposal status
- `GET /stats` - Governance statistics

### Blockchain (`/api/blockchain`)
- `POST /transactions` - Record blockchain transaction
- `GET /transactions` - List transactions
- `GET /transactions/:hash` - Get transaction details
- `PUT /transactions/:hash/status` - Update transaction status
- `POST /verify-signature` - Verify Ethereum signature
- `GET /stats` - Blockchain statistics
- `GET /address/:address` - Get address activity

## 🔐 **Security Features**

### Authentication & Authorization
- **JWT-based authentication** with configurable expiration
- **Wallet signature verification** for secure login
- **Role-based access control** for different user types
- **KYC verification** for sensitive operations

### API Security
- **Rate limiting** to prevent abuse
- **Speed limiting** for gradual slowdown
- **CORS protection** with configurable origins
- **Helmet security headers** for HTTP security
- **Input validation** with express-validator
- **SQL injection protection** with parameterized queries

### Data Protection
- **Password hashing** with bcryptjs
- **Secure session management**
- **Audit logging** for all operations
- **Data encryption** for sensitive fields

## 📝 **API Usage Examples**

### User Registration
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: '0x1234...',
    email: 'user@example.com',
    username: 'propertyinvestor',
    first_name: 'John',
    last_name: 'Doe',
    country: 'USA'
  })
});
```

### Create Property
```javascript
const response = await fetch('/api/properties', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    name: 'Downtown Luxury Condo',
    description: 'Premium residential property',
    location: '123 Main St, Downtown',
    property_type: 'RESIDENTIAL',
    total_area: 150.5,
    property_value: 500000,
    max_tokens: 1000000,
    token_price: 0.5,
    owner_wallet_address: '0x1234...'
  })
});
```

### Submit KYC
```javascript
const response = await fetch('/api/kyc/submit', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    wallet_address: '0x1234...',
    document_type: 'PASSPORT',
    document_number: 'AB123456',
    document_url: 'https://ipfs.io/ipfs/QmHash...'
  })
});
```

## 🧪 **Testing**

### Run Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- test/auth.test.js
```

### Test Coverage
```bash
# Generate coverage report
npm run coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 📊 **Monitoring & Logging**

### Logging
- **Winston logger** with multiple transports
- **Structured logging** in JSON format
- **Log rotation** with size limits
- **Different log levels** (error, warn, info, debug)

### Health Checks
```bash
# Health check endpoint
GET /health

# Response
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

### Performance Monitoring
- **Request/response logging**
- **Database query monitoring**
- **Error tracking and reporting**
- **Performance metrics collection**

## 🚀 **Deployment**

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start

# Use PM2 for process management
pm2 start ecosystem.config.js
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-secret
FRONTEND_URL=https://yourdomain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔧 **Development**

### Available Scripts
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run db:migrate   # Initialize database
npm run db:seed      # Seed database
npm run db:reset     # Reset database
npm run lint         # Run linter
npm run lint:fix     # Fix linting issues
```

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks
- **Commitlint** for commit message validation

## 📚 **Documentation**

### API Documentation
- **Swagger/OpenAPI** integration
- **Interactive API explorer**
- **Request/response examples**
- **Error code documentation**

### Database Documentation
- **Schema diagrams**
- **Relationship mappings**
- **Index optimization**
- **Query performance tips**

## 🤝 **Contributing**

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit pull request

### Code Standards
- **ES6+ syntax** with async/await
- **Consistent error handling**
- **Comprehensive testing**
- **Clear documentation**

## 📞 **Support**

### Getting Help
- **GitHub Issues** for bug reports
- **Documentation** for API reference
- **Community Forum** for discussions
- **Email Support** for urgent issues

### Resources
- [Express.js Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io/)
- [Ethereum Development](https://ethereum.org/developers/)

---

**Built with ❤️ by the Welcome Home Property Team**

*For more information, visit [welcomehome.com](https://welcomehome.com)*
