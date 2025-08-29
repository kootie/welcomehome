const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/welcome_home_property.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Running database migration...');

db.serialize(() => {
  // Add password_hash column if it doesn't exist
  db.run(`
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  `, (err) => {
    if (err && err.message.includes('duplicate column name')) {
      console.log('password_hash column already exists');
    } else if (err) {
      console.error('Error adding password_hash column:', err.message);
    } else {
      console.log('Added password_hash column to users table');
    }
  });

  // Create user_wallets table if it doesn't exist
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
  `, (err) => {
    if (err) {
      console.error('Error creating user_wallets table:', err.message);
    } else {
      console.log('user_wallets table ready');
    }
  });

  // Create user_deposits table if it doesn't exist
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
  `, (err) => {
    if (err) {
      console.error('Error creating user_deposits table:', err.message);
    } else {
      console.log('user_deposits table ready');
    }
    
    // Close database after all operations
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Migration completed successfully');
      }
    });
  });
});
