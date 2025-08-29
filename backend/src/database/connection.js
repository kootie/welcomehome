const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, '../../data/welcome_home_property.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database tables
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wallet_address TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          username TEXT UNIQUE,
          password_hash TEXT,
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
        )
      `);

      // User wallets table (assigned custodial wallets for verified users)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          network TEXT NOT NULL,
          wallet_address TEXT UNIQUE NOT NULL,
          keystore_json TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Fiat/crypto deposit records
      db.run(`
        CREATE TABLE IF NOT EXISTS user_deposits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_symbol TEXT NOT NULL,
          amount TEXT NOT NULL,
          tx_hash TEXT,
          network TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // KYC Records table
      db.run(`
        CREATE TABLE IF NOT EXISTS kyc_records (
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
        )
      `);

      // Properties table
      db.run(`
        CREATE TABLE IF NOT EXISTS properties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blockchain_id TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          location TEXT NOT NULL,
          coordinates TEXT,
          property_type TEXT NOT NULL,
          property_status TEXT DEFAULT 'active',
          total_area REAL NOT NULL,
          property_value REAL NOT NULL,
          max_tokens INTEGER NOT NULL,
          token_price REAL NOT NULL,
          metadata_uri TEXT,
          images TEXT, -- JSON array of image URLs
          documents TEXT, -- JSON array of document URLs
          owner_id INTEGER NOT NULL,
          created_by INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Property Tokens table
      db.run(`
        CREATE TABLE IF NOT EXISTS property_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          blockchain_address TEXT UNIQUE NOT NULL,
          token_symbol TEXT NOT NULL,
          total_supply INTEGER NOT NULL,
          circulating_supply INTEGER DEFAULT 0,
          token_price REAL NOT NULL,
          market_cap REAL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id)
        )
      `);

      // User Token Holdings table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_token_holdings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          property_token_id INTEGER NOT NULL,
          token_amount INTEGER NOT NULL,
          purchase_price REAL,
          purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (property_token_id) REFERENCES property_tokens (id),
          UNIQUE(user_id, property_token_id)
        )
      `);

      // Marketplace Listings table
      db.run(`
        CREATE TABLE IF NOT EXISTS marketplace_listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_token_id INTEGER NOT NULL,
          seller_id INTEGER NOT NULL,
          token_amount INTEGER NOT NULL,
          price_per_token REAL NOT NULL,
          total_price REAL NOT NULL,
          listing_status TEXT DEFAULT 'active',
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_token_id) REFERENCES property_tokens (id),
          FOREIGN KEY (seller_id) REFERENCES users (id)
        )
      `);

      // Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_hash TEXT UNIQUE NOT NULL,
          from_address TEXT NOT NULL,
          to_address TEXT NOT NULL,
          property_token_id INTEGER,
          token_amount INTEGER,
          transaction_type TEXT NOT NULL,
          transaction_status TEXT DEFAULT 'pending',
          gas_used INTEGER,
          gas_price REAL,
          block_number INTEGER,
          confirmed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_token_id) REFERENCES property_tokens (id)
        )
      `);

      // Governance Proposals table
      db.run(`
        CREATE TABLE IF NOT EXISTS governance_proposals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blockchain_proposal_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          proposer_id INTEGER NOT NULL,
          proposal_type TEXT NOT NULL,
          proposal_status TEXT DEFAULT 'active',
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
        )
      `);

      // User Votes table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          proposal_id INTEGER NOT NULL,
          vote_choice TEXT NOT NULL,
          voting_power INTEGER NOT NULL,
          voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (proposal_id) REFERENCES governance_proposals (id),
          UNIQUE(user_id, proposal_id)
        )
      `);

      // Property Valuations table
      db.run(`
        CREATE TABLE IF NOT EXISTS property_valuations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          valuation_amount REAL NOT NULL,
          valuation_date DATE NOT NULL,
          valuation_source TEXT NOT NULL,
          valuer_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id),
          FOREIGN KEY (valuer_id) REFERENCES users (id)
        )
      `);

      // Property History table
      db.run(`
        CREATE TABLE IF NOT EXISTS property_history (
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
        )
      `);

      // System Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (updated_by) REFERENCES users (id)
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      db.run('CREATE INDEX IF NOT EXISTS idx_properties_blockchain_id ON properties(blockchain_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_property_tokens_blockchain_address ON property_tokens(blockchain_address)');
      db.run('CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash)');
      db.run('CREATE INDEX IF NOT EXISTS idx_governance_proposals_blockchain_id ON governance_proposals(blockchain_proposal_id)');

      // Insert default system settings
      db.run(`
        INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
        ('platform_fee', '250', 'Platform fee in basis points (2.5%)'),
        ('min_property_value', '100000', 'Minimum property value in USD'),
        ('max_property_value', '10000000', 'Maximum property value in USD'),
        ('kyc_required', 'true', 'Whether KYC is required for property investment'),
        ('governance_quorum', '4', 'Default governance quorum percentage'),
        ('voting_period_days', '7', 'Default voting period in days')
      `);

      console.log('Database tables created successfully');
      resolve();
    });
  });
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

// Get database instance
function getDatabase() {
  return db;
}

// Run a query with parameters
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Get a single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Get multiple rows
function getAllRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  getDatabase,
  runQuery,
  getRow,
  getAllRows
};
