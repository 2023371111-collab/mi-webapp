const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

let db;

// Envoltorios con Promesas sobre la API de callbacks de sqlite3
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
    });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

async function init(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    db = await new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(file, (err) => (err ? reject(err) : resolve(conn)));
    });
    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
}

function close() {
    return new Promise((resolve) => (db ? db.close(() => resolve()) : resolve()));
}

module.exports = { init, close, run, get, all };
