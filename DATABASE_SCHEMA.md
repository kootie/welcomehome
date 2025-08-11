# Welcome Home Property - Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Design Principles](#database-design-principles)
3. [Core Tables](#core-tables)
4. [Relationship Diagrams](#relationship-diagrams)
5. [Indexes & Performance](#indexes--performance)
6. [Data Types & Constraints](#data-types--constraints)
7. [Migration & Versioning](#migration--versioning)

## Overview

The Welcome Home Property platform uses SQLite as the primary database, designed to support real estate tokenization, KYC verification, marketplace operations, and governance systems. The schema is optimized for performance, data integrity, and regulatory compliance.

## Database Design Principles

### 1. Normalization
- **3NF Compliance**: Eliminates transitive dependencies
- **Referential Integrity**: Foreign key constraints enforced
- **Data Consistency**: ACID properties maintained

### 2. Security
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Access Control**: Role-based permissions
- **Audit Trails**: Complete change history tracking

### 3. Performance
- **Strategic Indexing**: Optimized query performance
- **Efficient Joins**: Minimized table relationships
- **Query Optimization**: Structured for common operations

## Core Tables

### 1. Users Table
**Purpose**: Store user account information and basic profile data

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    date_of_birth TEXT,
    country TEXT,
    kyc_status TEXT DEFAULT 'pending',
    kyc_verified_at DATETIME,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `id`: Unique user identifier
- `wallet_address`: Ethereum wallet address (unique)
- `email`: User email address (unique)
- `username`: Display username (unique)
- `first_name`, `last_name`: User's legal name
- `phone`: Contact phone number
- `date_of_birth`: Birth date for KYC compliance
- `country`: Country of residence
- `kyc_status`: KYC verification status (pending, verified, rejected)
- `kyc_verified_at`: Timestamp of KYC verification
- `profile_image_url`: IPFS hash of profile image
- `is_active`: Account status flag
- `created_at`, `updated_at`: Timestamps for audit

### 2. KYC Records Table
**Purpose**: Store KYC verification documents and status

```sql
CREATE TABLE kyc_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    verified_by TEXT,
    verified_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique KYC record identifier
- `user_id`: Reference to users table
- `document_type`: Type of identification document
- `document_number`: Official document number
- `document_url`: IPFS hash of document image
- `verification_status`: Current verification status
- `verified_by`: Admin/verifier identifier
- `verified_at`: Verification timestamp
- `rejection_reason`: Reason for rejection if applicable

### 3. Properties Table
**Purpose**: Store real estate property information

```sql
CREATE TABLE properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    coordinates TEXT,
    property_type TEXT NOT NULL,
    property_status TEXT DEFAULT 'active',
    total_area REAL,
    valuation_amount REAL,
    valuation_currency TEXT DEFAULT 'USD',
    valuation_date DATETIME,
    valuation_source TEXT,
    max_tokens INTEGER,
    token_price REAL,
    metadata_url TEXT,
    blockchain_address TEXT,
    created_by INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique property identifier
- `name`: Property name/title
- `description`: Detailed property description
- `location`: Physical address
- `coordinates`: GPS coordinates
- `property_type`: Type (residential, commercial, industrial, etc.)
- `property_status`: Current status
- `total_area`: Property area in square meters
- `valuation_amount`: Current property value
- `valuation_currency`: Currency for valuation
- `valuation_date`: Date of last valuation
- `valuation_source`: Source of valuation
- `max_tokens`: Maximum tokens that can be issued
- `token_price`: Price per token
- `metadata_url`: IPFS hash of property metadata
- `blockchain_address`: Smart contract address
- `created_by`: User who created the property

### 4. Property Tokens Table
**Purpose**: Track individual property token instances

```sql
CREATE TABLE property_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    token_symbol TEXT NOT NULL,
    total_supply INTEGER NOT NULL,
    issued_supply INTEGER DEFAULT 0,
    token_price REAL NOT NULL,
    blockchain_contract_address TEXT,
    token_standard TEXT DEFAULT 'ERC20',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);
```

**Field Descriptions:**
- `id`: Unique token identifier
- `property_id`: Reference to properties table
- `token_symbol`: Token trading symbol
- `total_supply`: Maximum token supply
- `issued_supply`: Currently issued tokens
- `token_price`: Current token price
- `blockchain_contract_address`: Smart contract address
- `token_standard`: Token standard (ERC20, ERC721, etc.)

### 5. User Token Holdings Table
**Purpose**: Track user ownership of property tokens

```sql
CREATE TABLE user_token_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_token_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    average_purchase_price REAL,
    last_transaction_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (property_token_id) REFERENCES property_tokens (id),
    UNIQUE(user_id, property_token_id)
);
```

**Field Descriptions:**
- `id`: Unique holding record identifier
- `user_id`: Reference to users table
- `property_token_id`: Reference to property_tokens table
- `quantity`: Number of tokens owned
- `average_purchase_price`: Average price paid per token
- `last_transaction_date`: Date of last transaction

### 6. Marketplace Listings Table
**Purpose**: Store marketplace listings for token trading

```sql
CREATE TABLE marketplace_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    property_token_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_token REAL NOT NULL,
    total_price REAL NOT NULL,
    listing_type TEXT DEFAULT 'sell',
    status TEXT DEFAULT 'active',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users (id),
    FOREIGN KEY (property_token_id) REFERENCES property_tokens (id)
);
```

**Field Descriptions:**
- `id`: Unique listing identifier
- `seller_id`: User selling tokens
- `property_token_id`: Token being sold
- `quantity`: Number of tokens for sale
- `price_per_token`: Price per individual token
- `total_price`: Total listing value
- `listing_type`: Type of listing (sell/buy)
- `status`: Current listing status
- `expires_at`: Listing expiration date

### 7. Transactions Table
**Purpose**: Record all blockchain and marketplace transactions

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_hash TEXT UNIQUE,
    from_address TEXT,
    to_address TEXT,
    property_token_id INTEGER,
    quantity INTEGER,
    transaction_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    gas_used INTEGER,
    gas_price REAL,
    total_cost REAL,
    block_number INTEGER,
    block_timestamp DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_token_id) REFERENCES property_tokens (id)
);
```

**Field Descriptions:**
- `id`: Unique transaction identifier
- `transaction_hash`: Blockchain transaction hash
- `from_address`, `to_address`: Transaction addresses
- `property_token_id`: Related property token
- `quantity`: Token quantity involved
- `transaction_type`: Type of transaction
- `status`: Transaction status
- `gas_used`, `gas_price`: Gas consumption details
- `block_number`, `block_timestamp`: Blockchain block info

### 8. Governance Proposals Table
**Purpose**: Store governance proposals and voting information

```sql
CREATE TABLE governance_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    proposal_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    voting_start DATETIME,
    voting_end DATETIME,
    quorum_required INTEGER,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    executed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposer_id) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique proposal identifier
- `proposer_id`: User who created the proposal
- `title`, `description`: Proposal details
- `proposal_type`: Type of governance proposal
- `status`: Current proposal status
- `voting_start`, `voting_end`: Voting period
- `quorum_required`: Minimum votes needed
- `votes_for`, `votes_against`, `votes_abstain`: Vote counts
- `executed_at`: Execution timestamp

### 9. User Votes Table
**Purpose**: Track individual user votes on governance proposals

```sql
CREATE TABLE user_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    proposal_id INTEGER NOT NULL,
    vote_choice TEXT NOT NULL,
    voting_power INTEGER NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (proposal_id) REFERENCES governance_proposals (id),
    UNIQUE(user_id, proposal_id)
);
```

**Field Descriptions:**
- `id`: Unique vote identifier
- `user_id`: User casting the vote
- `proposal_id`: Proposal being voted on
- `vote_choice`: User's vote choice
- `voting_power`: User's voting power (token amount)
- `voted_at`: Vote timestamp

### 10. Property Valuations Table
**Purpose**: Track property valuation history

```sql
CREATE TABLE property_valuations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    valuation_amount REAL NOT NULL,
    valuation_currency TEXT DEFAULT 'USD',
    valuation_date DATETIME NOT NULL,
    valuation_source TEXT NOT NULL,
    valuator_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id),
    FOREIGN KEY (valuator_id) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique valuation record identifier
- `property_id`: Property being valued
- `valuation_amount`: Property value
- `valuation_currency`: Currency of valuation
- `valuation_date`: Date of valuation
- `valuation_source`: Source of valuation
- `valuator_id`: Professional valuator
- `notes`: Additional valuation notes

### 11. Property History Table
**Purpose**: Track all property changes and updates

```sql
CREATE TABLE property_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER NOT NULL,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id),
    FOREIGN KEY (changed_by) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique history record identifier
- `property_id`: Property being tracked
- `change_type`: Type of change made
- `old_value`, `new_value`: Values before and after change
- `changed_by`: User who made the change
- `change_reason`: Reason for the change

### 12. System Settings Table
**Purpose**: Store system-wide configuration and settings

```sql
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT 0,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users (id)
);
```

**Field Descriptions:**
- `id`: Unique setting identifier
- `setting_key`: Setting name/key
- `setting_value`: Setting value
- `setting_type`: Data type of setting
- `description`: Setting description
- `is_public`: Whether setting is publicly visible
- `updated_by`: User who last updated setting

## Relationship Diagrams

### Entity Relationships
```
Users (1) ←→ (Many) KYC_Records
Users (1) ←→ (Many) Properties
Users (1) ←→ (Many) User_Token_Holdings
Users (1) ←→ (Many) Marketplace_Listings
Users (1) ←→ (Many) Transactions
Users (1) ←→ (Many) Governance_Proposals
Users (1) ←→ (Many) User_Votes

Properties (1) ←→ (Many) Property_Tokens
Properties (1) ←→ (Many) Property_Valuations
Properties (1) ←→ (Many) Property_History

Property_Tokens (1) ←→ (Many) User_Token_Holdings
Property_Tokens (1) ←→ (Many) Marketplace_Listings
Property_Tokens (1) ←→ (Many) Transactions

Governance_Proposals (1) ←→ (Many) User_Votes
```

## Indexes & Performance

### Primary Indexes
```sql
-- Users table
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

-- KYC Records table
CREATE INDEX idx_kyc_records_user_id ON kyc_records(user_id);
CREATE INDEX idx_kyc_records_status ON kyc_records(verification_status);

-- Properties table
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_status ON properties(property_status);
CREATE INDEX idx_properties_location ON properties(location);

-- Transactions table
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_timestamp ON transactions(block_timestamp);

-- Marketplace listings
CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_property_token ON marketplace_listings(property_token_id);
```

## Data Types & Constraints

### Data Type Standards
- **TEXT**: Variable-length strings (names, addresses, hashes)
- **INTEGER**: Whole numbers (IDs, quantities, timestamps)
- **REAL**: Decimal numbers (prices, amounts, coordinates)
- **BOOLEAN**: True/false values (flags, status)
- **DATETIME**: Date and time values (timestamps)

### Constraint Types
- **PRIMARY KEY**: Unique identifier constraints
- **FOREIGN KEY**: Referential integrity constraints
- **UNIQUE**: Uniqueness constraints
- **NOT NULL**: Required field constraints
- **CHECK**: Value validation constraints
- **DEFAULT**: Default value constraints

## Migration & Versioning

### Version Control
- **Schema Versioning**: Tracked in system_settings table
- **Migration Scripts**: Versioned SQL scripts for updates
- **Rollback Support**: Ability to revert schema changes
- **Data Validation**: Verify data integrity after migrations

### Migration Process
1. **Backup**: Create database backup before changes
2. **Validation**: Test migration on staging environment
3. **Execution**: Run migration scripts in production
4. **Verification**: Confirm data integrity and performance
5. **Documentation**: Update schema documentation

## Conclusion

This database schema provides a robust foundation for the Welcome Home Property platform, supporting all core functionalities while maintaining data integrity, performance, and security. The design follows industry best practices and is optimized for real estate tokenization operations on the Alkebuleum blockchain.
