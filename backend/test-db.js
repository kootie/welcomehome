const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/welcome_home_property.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Testing database...');

db.serialize(() => {
  // Check users table schema
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Error getting table info:', err);
    } else {
      console.log('Users table columns:');
      rows.forEach(row => {
        console.log(`  ${row.name} (${row.type}) - NOT NULL: ${row.notnull}, PK: ${row.pk}`);
      });
    }
  });

  // Try to insert a test user
  db.run(`
    INSERT INTO users (email, password_hash, first_name, last_name) 
    VALUES (?, ?, ?, ?)
  `, ['test2@example.com', 'hashedpassword', 'Test', 'User'], function(err) {
    if (err) {
      console.error('Error inserting user:', err.message);
    } else {
      console.log('Successfully inserted user with ID:', this.lastID);
      
      // Clean up
      db.run('DELETE FROM users WHERE email = ?', ['test2@example.com'], (err) => {
        if (err) {
          console.error('Error cleaning up:', err.message);
        } else {
          console.log('Test user cleaned up');
        }
        
        db.close();
      });
    }
  });
});
