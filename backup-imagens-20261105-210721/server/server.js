
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");

const db = require("./database");

const app = express();
const PORT = 3000;
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error("ERRO: SESSION_SECRET não configurado.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));

// PROTEÇÃO DE ORIGEM
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");

    if (origin) {
      let url;

      try {
        url = new URL(origin);
      } catch {
        return res.status(403).json({
          error: "Origem não autorizada."
        });
      }

      const autorizado =
        url.protocol === "http:" &&
        url.port === String(PORT) &&
        ["127.0.0.1", "localhost"].includes(url.hostname);

      if (!autorizado) {
        return res.status(403).json({
          error: "Origem não autorizada."
        });
      }
    }
  }

  next();
});

// SESSÕES
app.use(session({
  name: "asta.sid",
  secret: SESSION_SECRET,
  store: new SQLiteStore({
    db: "sessions.sqlite",
    dir: DATA_DIR
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: 4 * 60 * 60 * 1000
  }
}));

// CRIAR TABELA DE MISSÕES
db.exec(`
  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    technologies TEXT DEFAULT '',
    image TEXT DEFAULT '',
    website TEXT DEFAULT '',
    github TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// VERIFICAR SENHA
function verificarSenha(senha, hashSalvo) {
  try {
    const [tipo, salt, hash] = hashSalvo.split(":");

    if (tipo !== "scrypt") return false;

    const esperado = Buffer.from(hash, "hex");

    if (esperado.length !== 64) return false;

    const calculado = crypto.scryptSync(
      senha,
      Buffer.from(salt, "hex"),
      64
    );

    return crypto.timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

// EXIGIR ADMINISTRADOR
function exigirAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({
      error: "Você precisa fazer login."
    });
  }

  const admin = db.prepare(
    "SELECT id, username FROM admins WHERE id = ?"
  ).get(req.session.adminId);

  if (!admin) {
    return res.status(401).json({
      error: "Sessão inválida."
    });
  }

  req.admin = admin;
  next();
}

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas. Aguarde 15 minutos."
  }
});

// LOGIN
app.post("/api/auth/login", limitarLogin, (req, res, next) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > 100 ||
    password.length > 1024
  ) {
    return res.status(400).json({
      error: "Informe usuário e senha válidos."
    });
  }

  const admin = db.prepare(
    "SELECT * FROM admins WHERE username = ?"
  ).get(username.trim());

  if (!admin || !verificarSenha(password, admin.password_hash)) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  req.session.regenerate((erro) => {
    if (erro) return next(erro);

    req.session.adminId = admin.id;

    req.session.save((erroSalvar) => {
      if (erroSalvar) return next(erroSalvar);

      res.json({
        success: true,
        username: admin.username
      });
    });
  });
});

// VERIFICAR LOGIN
app.get("/api/auth/me", exigirAdmin, (req, res) => {
  res.json({
    authenticated: true,
    username: req.admin.username
  });
});

// LOGOUT
app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((erro) => {
    if (erro) return next(erro);

    res.clearCookie("asta.sid");

    res.json({ success: true });
  });
});

// VALIDAR DADOS DA MISSÃO
function validarMissao(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return { error: "Dados inválidos." };
  }

  const campos = [
    "title",
    "category",
    "description",
    "technologies",
    "image",
    "website",
    "github",
    "status"
  ];

  const limites = {
    title: 150,
    category: 30,
    description: 5000,
    technologies: 500,
    image: 2000,
    website: 2000,
    github: 2000,
    status: 30
  };

  const missao = {};

  for (const campo of campos) {
    const valor = dados[campo] ?? "";

    if (
      typeof valor !== "string" ||
      valor.length > limites[campo]
    ) {
      return {
        error: `Campo ${campo} inválido ou muito longo.`
      };
    }

    missao[campo] = valor.trim();
  }

  if (!missao.title || !missao.description) {
    return {
      error: "Informe o nome e a descrição do projeto."
    };
  }

  if (!["web", "sistemas", "gamer"].includes(missao.category)) {
    return {
      error: "Categoria inválida."
    };
  }

  if (!["draft", "published"].includes(missao.status)) {
    return {
      error: "Status inválido."
    };
  }

  for (const campo of ["image", "website", "github"]) {
    if (missao[campo]) {
      try {
        const url = new URL(missao[campo]);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Protocolo inválido");
        }
      } catch {
        return {
          error: `O link do campo ${campo} é inválido.`
        };
      }
    }
  }

  return { missao };
}

// CONTADORES DO DASHBOARD
app.get("/api/admin/overview", exigirAdmin, (req, res) => {
  const resultado = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
    FROM missions
  `).get();

  res.json({
    total: resultado.total || 0,
    published: resultado.published || 0,
    drafts: resultado.drafts || 0,
    messages: 0
  });
});

// LISTAR TODAS AS MISSÕES - ADMIN
app.get("/api/admin/missions", exigirAdmin, (req, res) => {
  const missions = db.prepare(`
    SELECT *
    FROM missions
    ORDER BY created_at DESC, id DESC
  `).all();

  res.json({ missions });
});

// CONSULTAR UMA MISSÃO - ADMIN
app.get("/api/admin/missions/:id", exigirAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "ID inválido."
    });
  }

  const mission = db.prepare(
    "SELECT * FROM missions WHERE id = ?"
  ).get(id);

  if (!mission) {
    return res.status(404).json({
      error: "Missão não encontrada."
    });
  }

  res.json({ mission });
});

// CADASTRAR MISSÃO
app.post("/api/admin/missions", exigirAdmin, (req, res) => {
  const resultado = validarMissao(req.body);

  if (resultado.error) {
    return res.status(400).json({
      error: resultado.error
    });
  }

  const m = resultado.missao;

  const insert = db.prepare(`
    INSERT INTO missions (
      title,
      category,
      description,
      technologies,
      image,
      website,
      github,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    m.title,
    m.category,
    m.description,
    m.technologies,
    m.image,
    m.website,
    m.github,
    m.status
  );

  const mission = db.prepare(
    "SELECT * FROM missions WHERE id = ?"
  ).get(insert.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: "Missão cadastrada com sucesso!",
    mission
  });
});

// EDITAR MISSÃO
app.put("/api/admin/missions/:id", exigirAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "ID inválido."
    });
  }

  const existente = db.prepare(
    "SELECT id FROM missions WHERE id = ?"
  ).get(id);

  if (!existente) {
    return res.status(404).json({
      error: "Missão não encontrada."
    });
  }

  const resultado = validarMissao(req.body);

  if (resultado.error) {
    return res.status(400).json({
      error: resultado.error
    });
  }

  const m = resultado.missao;

  db.prepare(`
    UPDATE missions
    SET
      title = ?,
      category = ?,
      description = ?,
      technologies = ?,
      image = ?,
      website = ?,
      github = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    m.title,
    m.category,
    m.description,
    m.technologies,
    m.image,
    m.website,
    m.github,
    m.status,
    id
  );

  const mission = db.prepare(
    "SELECT * FROM missions WHERE id = ?"
  ).get(id);

  res.json({
    success: true,
    message: "Missão atualizada com sucesso!",
    mission
  });
});

// EXCLUIR MISSÃO
app.delete("/api/admin/missions/:id", exigirAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "ID inválido."
    });
  }

  const resultado = db.prepare(
    "DELETE FROM missions WHERE id = ?"
  ).run(id);

  if (resultado.changes === 0) {
    return res.status(404).json({
      error: "Missão não encontrada."
    });
  }

  res.json({
    success: true,
    message: "Missão excluída com sucesso!"
  });
});

// MISSÕES PUBLICADAS - SITE PÚBLICO
app.get("/api/missions", (req, res) => {
  const missions = db.prepare(`
    SELECT
      id,
      title,
      category,
      description,
      technologies,
      image,
      website,
      github,
      created_at
    FROM missions
    WHERE status = 'published'
    ORDER BY created_at DESC, id DESC
  `).all();

  res.json({ missions });
});

// ARQUIVOS DO SITE
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/assets", express.static(path.join(ROOT, "assets")));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(ROOT, "admin.html"));
});

// ERROS
app.use((erro, req, res, next) => {
  console.error(erro);

  res.status(500).json({
    error: "Erro interno do servidor."
  });
});

// INICIAR SERVIDOR
app.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("====================================");
  console.log("  QG DOS TOUROS NEGROS ONLINE!");
  console.log("====================================");
  console.log("");
  console.log("http://127.0.0.1:3000/admin.html");
  console.log("");
  console.log("Login conectado ao banco SQLite.");
  console.log("Sistema de missoes conectado.");
  console.log("====================================");
});
