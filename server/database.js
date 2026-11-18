
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

// Pasta onde o banco de dados será armazenado
const dataDir = path.join(__dirname, "data");

// Cria a pasta caso não exista
fs.mkdirSync(dataDir, { recursive: true });

// Abre ou cria o banco de dados
const db = new Database(
  path.join(dataDir, "asta.db")
);

// Melhora a operação do SQLite
db.pragma("journal_mode = WAL");

// Cria a tabela de administradores
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Exporta a conexão diretamente
module.exports = db;
