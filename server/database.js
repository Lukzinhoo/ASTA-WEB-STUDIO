"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

// ==========================================
// ASTA WEB STUDIO
// CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================

// Permite utilizar armazenamento persistente
// no ambiente de produção.

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

// Criar diretório do banco de dados.

fs.mkdirSync(dataDir, {
  recursive: true
});

// Caminho do banco.

const databasePath = path.join(dataDir, "asta.db");

// Abrir conexão.

const db = new Database(databasePath);

// Configurações de desempenho e integridade.

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");

// Tabela de administradores.

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("[DATABASE] Banco de dados conectado.");

// Exportar conexão.

module.exports = db;