# Welcome Home Property - Security Token List & Access Control

## Table of Contents
1. [Overview](#overview)
2. [Smart Contract Roles](#smart-contract-roles)
3. [Backend API Tokens](#backend-api-tokens)
4. [Authentication Mechanisms](#authentication-mechanisms)
5. [Security Layers](#security-layers)
6. [Token Management](#token-management)
7. [Security Best Practices](#security-best-practices)

## Overview

The Welcome Home Property platform implements a multi-layered security system using various tokens and access control mechanisms to ensure secure, compliant, and auditable operations.

## Smart Contract Roles

### 1. AlkebuleumPropertyToken.sol

```solidity
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
bytes32 public constant ALKEBULEUM_ADMIN_ROLE = keccak256("ALKEBULEUM_ADMIN_ROLE");
bytes32 public constant VALUATOR_ROLE = keccak256("VALUATOR_ROLE");
```

**Role Descriptions:**
- **PAUSER_ROLE**: Can pause/unpause token transfers during emergencies
- **MINTER_ROLE**: Can mint new tokens to verified users
- **PROPERTY_MANAGER_ROLE**: Can update property details and metadata
- **ALKEBULEUM_ADMIN_ROLE**: Alkebuleum-specific administrative functions
- **VALUATOR_ROLE**: Can update property valuations and assessments

### 2. KYCRegistry.sol

```solidity
bytes32 public constant KYC_VERIFIER_ROLE = keccak256("KYC_VERIFIER_ROLE");
bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");
bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
```

**Role Descriptions:**
- **KYC_VERIFIER_ROLE**: Can verify and approve KYC submissions
- **MARKETPLACE_ROLE**: Can access KYC verification for trading
- **FACTORY_ROLE**: Can create new property tokens
- **REGISTRY_ROLE**: Can update ownership records
- **GOVERNANCE_ROLE**: Can participate in governance decisions

### 3. PropertyGovernance.sol

```solidity
bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
```

**Role Descriptions:**
- **PROPOSER_ROLE**: Can create governance proposals
- **EXECUTOR_ROLE**: Can execute approved proposals
- **ADMIN_ROLE**: Can manage governance parameters

## Backend API Tokens

### 1. JWT (JSON Web Tokens)

**Token Structure:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "walletAddress": "0x...",
    "userId": 123,
    "kycStatus": "verified",
    "roles": ["user", "kyc_verified"],
    "iat": 1640995200,
    "exp": 1641081600
  },
  "signature": "HMACSHA256(...)"
}
```

**Token Types:**
- **Access Token**: Short-lived (24 hours) for API access
- **Refresh Token**: Long-lived (7 days) for token renewal
- **Admin Token**: Special privileges for administrative functions

### 2. API Rate Limiting Tokens

**Rate Limit Categories:**
- **Public Endpoints**: 100 requests/hour
- **Authenticated Endpoints**: 1000 requests/hour
- **KYC Endpoints**: 50 requests/hour
- **Transaction Endpoints**: 100 requests/hour
- **Admin Endpoints**: 5000 requests/hour

### 3. IPFS Access Tokens

**Document Access:**
- **KYC Documents**: Encrypted with user-specific keys
- **Property Metadata**: Public read, admin write
- **User Profiles**: User-specific access control

## Authentication Mechanisms

### 1. Wallet-Based Authentication

**Process:**
1. User connects wallet (MetaMask, WalletConnect, etc.)
2. Platform generates unique message for signing
3. User signs message with private key
4. Backend verifies signature using ethers.js
5. JWT token generated upon successful verification

**Security Features:**
- Nonce-based message signing
- Timestamp validation
- Signature verification
- Wallet address validation

### 2. Multi-Factor Authentication (MFA)

**Factors:**
- **Something you have**: Wallet private key
- **Something you know**: Optional password/PIN
- **Something you are**: Biometric verification (future)

### 3. Session Management

**Session Controls:**
- Automatic token expiration
- Concurrent session limits
- Device fingerprinting
- Suspicious activity detection

## Security Layers

### 1. Network Layer Security

**Protection Mechanisms:**
- **HTTPS/TLS**: All API communications encrypted
- **CORS**: Cross-origin request restrictions
- **Rate Limiting**: DDoS protection
- **IP Whitelisting**: Admin access restrictions

### 2. Application Layer Security

**Security Measures:**
- **Input Validation**: All user inputs sanitized
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: Token-based request validation

### 3. Data Layer Security

**Data Protection:**
- **Encryption at Rest**: Sensitive data encrypted
- **Encryption in Transit**: All data encrypted during transmission
- **Access Logging**: Comprehensive audit trails
- **Data Backup**: Encrypted backups with access controls

### 4. Blockchain Layer Security

**Smart Contract Security:**
- **Access Control**: Role-based permissions
- **Reentrancy Protection**: Guards against attack vectors
- **Pausable Functions**: Emergency stop capabilities
- **Upgradeable Contracts**: Controlled contract updates

## Token Management

### 1. Token Lifecycle

**Creation:**
- Generated upon successful authentication
- Stored securely in HTTP-only cookies
- Encrypted with strong cryptographic algorithms

**Validation:**
- Verified on every API request
- Checked for expiration and validity
- Validated against user permissions

**Revocation:**
- Immediate invalidation upon logout
- Blacklist for compromised tokens
- Automatic cleanup of expired tokens

### 2. Token Storage

**Client-Side:**
- HTTP-only cookies for security
- Secure flag for HTTPS-only transmission
- SameSite attribute for CSRF protection

**Server-Side:**
- Encrypted token storage
- Redis cache for performance
- Database logging for audit trails

### 3. Token Refresh

**Automatic Renewal:**
- Silent token refresh before expiration
- User notification for manual refresh
- Grace period for expired tokens

## Security Best Practices

### 1. Password & Key Management

**Guidelines:**
- Never store private keys on servers
- Use hardware wallets for large holdings
- Implement key rotation policies
- Secure key backup procedures

### 2. Access Control

**Principles:**
- Principle of least privilege
- Role-based access control (RBAC)
- Regular access reviews
- Immediate revocation for suspicious activity

### 3. Monitoring & Alerting

**Security Monitoring:**
- Real-time threat detection
- Anomaly detection algorithms
- Automated alert systems
- Incident response procedures

### 4. Compliance & Auditing

**Regulatory Compliance:**
- KYC/AML requirements
- Data protection regulations
- Financial transaction reporting
- Regular security audits

## Security Incident Response

### 1. Incident Classification

**Severity Levels:**
- **Critical**: System compromise, data breach
- **High**: Unauthorized access, suspicious activity
- **Medium**: Policy violations, failed login attempts
- **Low**: Minor security events, configuration issues

### 2. Response Procedures

**Immediate Actions:**
1. Isolate affected systems
2. Preserve evidence
3. Notify security team
4. Assess impact scope

**Recovery Steps:**
1. Identify root cause
2. Implement fixes
3. Restore services
4. Monitor for recurrence

### 3. Post-Incident Analysis

**Review Process:**
- Incident timeline reconstruction
- Root cause analysis
- Lessons learned documentation
- Security improvements implementation

## Conclusion

The Welcome Home Property platform implements a comprehensive security framework that protects users, assets, and the platform itself. Through multiple layers of security, robust authentication mechanisms, and continuous monitoring, the system maintains the highest standards of security and compliance for real estate tokenization on the Alkebuleum blockchain.
