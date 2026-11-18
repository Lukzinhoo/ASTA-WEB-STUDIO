
const crypto = require("node:crypto");
const readline = require("node:readline");
const db = require("./database");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, resolve);
  });
}

async function criarAdministrador() {
  const existente = db.prepare(
    "SELECT COUNT(*) AS total FROM admins"
  ).get();

  if (existente.total > 0) {
    console.log("Já existe um administrador cadastrado.");
    return;
  }

  const usuario = (
    await perguntar("Digite o nome de usuário: ")
  ).trim();

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(usuario)) {
    console.log("O usuário deve ter de 3 a 30 caracteres.");
    return;
  }

  const senha = await perguntar(
    "Crie uma senha (mínimo 12 caracteres): "
  );

  if (senha.length < 12) {
    console.log("A senha precisa ter pelo menos 12 caracteres.");
    return;
  }

  const confirmar = await perguntar("Confirme a senha: ");

  if (senha !== confirmar) {
    console.log("As senhas não coincidem.");
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto.scryptSync(
    senha,
    Buffer.from(salt, "hex"),
    64
  ).toString("hex");

  db.prepare(`
    INSERT INTO admins (username, password_hash)
    VALUES (?, ?)
  `).run(usuario, `scrypt:${salt}:${hash}`);

  console.log("");
  console.log("==================================");
  console.log(" ADMINISTRADOR CRIADO COM SUCESSO!");
  console.log(" QG DOS TOUROS NEGROS");
  console.log("==================================");
}

criarAdministrador()
  .catch((erro) => {
    console.error("Erro:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    db.close();
  });
