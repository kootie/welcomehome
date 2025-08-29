const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/welcome_home_property.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Fixing database constraints...');

// SQLite doesn't support ALTER COLUMN to change NOT NULL constraint
// We need to recreate the table
db.serialize(() => {
  // Create new users table with correct schema
  db.run(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT,
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
  `, (err) => {
    if (err) {
      console.error('Error creating new users table:', err.message);
    } else {
      console.log('Created new users table');
      
      // Copy data from old table to new table
      db.run(`
        INSERT INTO users_new (id, wallet_address, email, username, password_hash, first_name, last_name, phone, date_of_birth, country, kyc_status, kyc_verified_at, profile_image_url, is_active, created_at, updated_at)
        SELECT id, wallet_address, email, username, password_hash, first_name, last_name, phone, date_of_birth, country, kyc_status, kyc_verified_at, profile_image_url, is_active, created_at, updated_at
        FROM users
      `, (err) => {
        if (err) {
          console.error('Error copying data:', err.message);
        } else {
          console.log('Copied data to new table');
          
          // Drop old table and rename new table
          db.run('DROP TABLE users', (err) => {
            if (err) {
              console.error('Error dropping old table:', err.message);
            } else {
              console.log('Dropped old users table');
              
              db.run('ALTER TABLE users_new RENAME TO users', (err) => {
                if (err) {
                  console.error('Error renaming table:', err.message);
                } else {
                  console.log('Renamed new table to users');
                  
                  // Test insertion
                  db.run(`
                    INSERT INTO users (email, password_hash, first_name, last_name) 
                    VALUES (?, ?, ?, ?)
                  `, ['test3@example.com', 'hashedpassword', 'Test', 'User'], function(err) {
                    if (err) {
                      console.error('Error testing insertion:', err.message);
                    } else {
                      console.log('Successfully inserted test user with ID:', this.lastID);
                      
                      // Clean up
                      db.run('DELETE FROM users WHERE email = ?', ['test3@example.com'], (err) => {
                        if (err) {
                          console.error('Error cleaning up:', err.message);
                        } else {
                          console.log('Test user cleaned up');
                        }
                        
                        db.close((err) => {
                          if (err) {
                            console.error('Error closing database:', err.message);
                          } else {
                            console.log('Database fixed successfully');
                          }
                        });
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});
