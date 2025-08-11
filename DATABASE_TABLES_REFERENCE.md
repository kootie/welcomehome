# Welcome Home Property - Database Tables Quick Reference

## 📋 **Complete Table List**

| Table Name | Purpose | Records |
|------------|---------|---------|
| `users` | User accounts and profiles | User registration data |
| `kyc_records` | KYC verification documents | Identity verification |
| `properties` | Real estate properties | Property listings |
| `property_tokens` | Tokenized property instances | Token contracts |
| `user_token_holdings` | User token ownership | Balance tracking |
| `marketplace_listings` | Trading listings | Buy/sell orders |
| `transactions` | Blockchain transactions | Transaction history |
| `governance_proposals` | Governance proposals | Voting proposals |
| `user_votes` | User voting records | Vote tracking |
| `property_valuations` | Property value history | Valuation tracking |
| `property_history` | Property change history | Audit trails |
| `system_settings` | System configuration | Platform settings |

---

## 🗂️ **Table Details**

### 1. **users** - User Accounts
```
id (PK) | wallet_address | email | username | first_name | last_name
phone | date_of_birth | country | kyc_status | kyc_verified_at
profile_image_url | is_active | created_at | updated_at
```

### 2. **kyc_records** - KYC Verification
```
id (PK) | user_id (FK) | document_type | document_number | document_url
verification_status | verified_by | verified_at | rejection_reason
created_at | updated_at
```

### 3. **properties** - Real Estate Properties
```
id (PK) | name | description | location | coordinates | property_type
property_status | total_area | valuation_amount | valuation_currency
valuation_date | valuation_source | max_tokens | token_price
metadata_url | blockchain_address | created_by (FK) | is_active
created_at | updated_at
```

### 4. **property_tokens** - Token Instances
```
id (PK) | property_id (FK) | token_symbol | total_supply | issued_supply
token_price | blockchain_contract_address | token_standard | is_active
created_at | updated_at
```

### 5. **user_token_holdings** - Token Ownership
```
id (PK) | user_id (FK) | property_token_id (FK) | quantity
average_purchase_price | last_transaction_date | created_at | updated_at
```

### 6. **marketplace_listings** - Trading Listings
```
id (PK) | seller_id (FK) | property_token_id (FK) | quantity
price_per_token | total_price | listing_type | status | expires_at
created_at | updated_at
```

### 7. **transactions** - Blockchain Transactions
```
id (PK) | transaction_hash | from_address | to_address | property_token_id (FK)
quantity | transaction_type | status | gas_used | gas_price | total_cost
block_number | block_timestamp | created_at | updated_at
```

### 8. **governance_proposals** - Governance
```
id (PK) | proposer_id (FK) | title | description | proposal_type | status
voting_start | voting_end | quorum_required | votes_for | votes_against
votes_abstain | executed_at | created_at | updated_at
```

### 9. **user_votes** - Voting Records
```
id (PK) | user_id (FK) | proposal_id (FK) | vote_choice | voting_power
voted_at
```

### 10. **property_valuations** - Value History
```
id (PK) | property_id (FK) | valuation_amount | valuation_currency
valuation_date | valuation_source | valuator_id (FK) | notes | created_at
```

### 11. **property_history** - Change Tracking
```
id (PK) | property_id (FK) | change_type | old_value | new_value
changed_by (FK) | change_reason | created_at
```

### 12. **system_settings** - Configuration
```
id (PK) | setting_key | setting_value | setting_type | description
is_public | updated_by (FK) | updated_at
```

---

## 🔗 **Key Relationships**

### **One-to-Many Relationships**
- `users` → `kyc_records` (1 user can have multiple KYC records)
- `users` → `properties` (1 user can create multiple properties)
- `users` → `user_token_holdings` (1 user can own multiple token types)
- `users` → `marketplace_listings` (1 user can have multiple listings)
- `users` → `transactions` (1 user can have multiple transactions)
- `users` → `governance_proposals` (1 user can create multiple proposals)
- `users` → `user_votes` (1 user can vote on multiple proposals)
- `properties` → `property_tokens` (1 property can have 1 token contract)
- `properties` → `property_valuations` (1 property can have multiple valuations)
- `properties` → `property_history` (1 property can have multiple changes)
- `property_tokens` → `user_token_holdings` (1 token can be owned by many users)
- `property_tokens` → `marketplace_listings` (1 token can have multiple listings)
- `property_tokens` → `transactions` (1 token can have multiple transactions)
- `governance_proposals` → `user_votes` (1 proposal can have multiple votes)

### **Many-to-One Relationships**
- `kyc_records` → `users` (KYC records belong to 1 user)
- `properties` → `users` (Properties created by 1 user)
- `user_token_holdings` → `users` (Holdings belong to 1 user)
- `user_token_holdings` → `property_tokens` (Holdings are for 1 token type)
- `marketplace_listings` → `users` (Listings belong to 1 seller)
- `marketplace_listings` → `property_tokens` (Listings are for 1 token type)
- `transactions` → `property_tokens` (Transactions involve 1 token type)
- `governance_proposals` → `users` (Proposals created by 1 user)
- `user_votes` → `users` (Votes cast by 1 user)
- `user_votes` → `governance_proposals` (Votes are for 1 proposal)
- `property_valuations` → `properties` (Valuations are for 1 property)
- `property_valuations` → `users` (Valuations performed by 1 user)
- `property_history` → `properties` (History belongs to 1 property)
- `property_history` → `users` (Changes made by 1 user)
- `system_settings` → `users` (Settings updated by 1 user)

---

## 📊 **Data Types Summary**

### **Primary Data Types**
- **INTEGER**: IDs, quantities, timestamps, counts
- **TEXT**: Names, addresses, hashes, descriptions, statuses
- **REAL**: Prices, amounts, areas, coordinates
- **BOOLEAN**: Flags, active status
- **DATETIME**: Timestamps, dates

### **Common Field Patterns**
- **IDs**: Always `INTEGER PRIMARY KEY AUTOINCREMENT`
- **Timestamps**: `created_at`, `updated_at` for audit trails
- **Status Fields**: Text enums (pending, active, completed, etc.)
- **Addresses**: Ethereum addresses stored as TEXT
- **IPFS Hashes**: Document/metadata URLs stored as TEXT
- **Foreign Keys**: Always reference primary keys of parent tables

---

## 🚀 **Quick Queries**

### **Common Operations**

#### Get User with KYC Status
```sql
SELECT u.*, k.verification_status 
FROM users u 
LEFT JOIN kyc_records k ON u.id = k.user_id 
WHERE u.wallet_address = ?;
```

#### Get User Token Holdings
```sql
SELECT p.name, pt.token_symbol, uth.quantity, uth.average_purchase_price
FROM user_token_holdings uth
JOIN property_tokens pt ON uth.property_token_id = pt.id
JOIN properties p ON pt.property_id = p.id
WHERE uth.user_id = ?;
```

#### Get Active Marketplace Listings
```sql
SELECT ml.*, p.name, pt.token_symbol, u.username
FROM marketplace_listings ml
JOIN property_tokens pt ON ml.property_token_id = pt.id
JOIN properties p ON pt.property_id = p.id
JOIN users u ON ml.seller_id = u.id
WHERE ml.status = 'active';
```

#### Get Property Transaction History
```sql
SELECT t.*, pt.token_symbol, p.name
FROM transactions t
JOIN property_tokens pt ON t.property_token_id = pt.id
JOIN properties p ON pt.property_id = p.id
WHERE t.property_token_id = ?
ORDER BY t.created_at DESC;
```

---

## 📝 **Notes**

- **Foreign Key Constraints**: All relationships are enforced at the database level
- **Audit Trails**: All tables include creation and update timestamps
- **Soft Deletes**: Most tables use `is_active` flag instead of hard deletion
- **Indexing**: Critical fields are indexed for performance
- **Data Integrity**: ACID properties maintained for all operations

For complete schema details, see **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**.
