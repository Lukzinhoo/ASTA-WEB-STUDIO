
const titulos = {
  dashboard: "Central de Comando",
  missions: "Missões",
  "new-mission": "Nova Missão",
  messages: "Mensagens",
  settings: "Configurações"
};

let missoes = [];
let missaoEmEdicao = null;

document.addEventListener("DOMContentLoaded", () => {
  configurarLogin();
  configurarSenha();
  configurarNavegacao();
  configurarMenu();
  configurarLogout();
  configurarMissoes();
  verificarSessao();
});

// ==========================================
// COMUNICAÇÃO COM O SERVIDOR
// ==========================================

async function requisicao(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const dados = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      dados.error || "Não foi possível conectar ao servidor."
    );
  }

  return dados;
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

function mostrarLogin() {
  document.getElementById("login-screen").hidden = false;
  document.getElementById("admin-panel").hidden = true;
}

function mostrarPainel(usuario) {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("admin-panel").hidden = false;

  document.getElementById("profile-name").textContent =
    usuario || "Administrador";

  mostrarTela("dashboard");
}

async function verificarSessao() {
  try {
    const dados = await requisicao("/api/auth/me");

    mostrarPainel(dados.username);

    await atualizarPainel();
  } catch (erro) {
    mostrarLogin();
  }
}

function configurarLogin() {
  const form = document.getElementById("login-form");
  const mensagem = document.getElementById("login-message");
  const botao = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    mensagem.textContent = "";
    botao.disabled = true;
    botao.textContent = "VERIFICANDO...";

    try {
      const dados = await requisicao("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      form.reset();

      mostrarPainel(dados.username);

      await atualizarPainel();
    } catch (erro) {
      mensagem.textContent = erro.message;
    } finally {
      botao.disabled = false;
      botao.textContent = "ENTRAR NO QG →";
    }
  });
}

function configurarSenha() {
  const botao = document.getElementById("toggle-password");
  const senha = document.getElementById("password");

  botao.addEventListener("click", () => {
    const mostrar = senha.type === "password";

    senha.type = mostrar ? "text" : "password";

    botao.setAttribute(
      "aria-label",
      mostrar ? "Ocultar senha" : "Mostrar senha"
    );
  });
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function fecharMenu() {
  document.getElementById("sidebar").classList.remove("open");

  document.getElementById("sidebar-toggle")
    .setAttribute("aria-expanded", "false");
}

function mostrarTela(nome) {
  if (!Object.prototype.hasOwnProperty.call(titulos, nome)) {
    return;
  }

  document.querySelectorAll(".admin-view").forEach((tela) => {
    tela.hidden = tela.id !== `view-${nome}`;
  });

  document.querySelectorAll(".sidebar-link").forEach((botao) => {
    botao.classList.toggle(
      "active",
      botao.dataset.view === nome
    );
  });

  document.getElementById("topbar-title").textContent =
    titulos[nome];

  fecharMenu();

  window.scrollTo(0, 0);

  if (nome === "missions") {
    carregarMissoes();
  }

  if (nome === "dashboard") {
    carregarResumo();
    carregarMissoes();
  }
}

function configurarNavegacao() {
  document.querySelectorAll("[data-view]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const destino = botao.dataset.view;

      if (destino === "new-mission") {
        limparFormulario();
      }

      mostrarTela(destino);
    });
  });

  document.querySelectorAll("[data-go]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const destino = botao.dataset.go;

      if (destino === "new-mission") {
        limparFormulario();
      }

      mostrarTela(destino);
    });
  });
}

function configurarMenu() {
  const menu = document.getElementById("sidebar");
  const botao = document.getElementById("sidebar-toggle");

  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("open");

    botao.setAttribute("aria-expanded", String(aberto));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenu();
    }
  });
}

// ==========================================
// RESUMO DO DASHBOARD
// ==========================================

async function carregarResumo() {
  try {
    const dados = await requisicao("/api/admin/overview");

    const indicadores = {
      "stat-total": dados.total,
      "stat-published": dados.published,
      "stat-drafts": dados.drafts,
      "stat-messages": dados.messages
    };

    Object.entries(indicadores).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);

      if (elemento) {
        elemento.textContent = String(valor ?? 0);
      }
    });
  } catch (erro) {
    console.error("Erro ao carregar resumo:", erro);
  }
}

async function atualizarPainel() {
  await carregarResumo();
  await carregarMissoes();
}

// ==========================================
// CADASTRO DE MISSÕES
// ==========================================

function configurarMissoes() {
  const form = document.getElementById("mission-form");

  if (!form) return;

  // Ativar botão que estava desabilitado
  const botao = form.querySelector('button[type="submit"]');

  if (botao) {
    botao.disabled = false;
    botao.textContent = "Salvar Missão";
  }

  // Remover aviso demonstrativo
  const aviso = document.querySelector(
    "#view-new-mission .form-notice"
  );

  if (aviso) {
    aviso.textContent =
      "Cadastre seu projeto. As informações serão salvas no QG.";
  }

  // Remover texto antigo de indisponibilidade
  const textoAntigo = document.querySelector(
    "#view-new-mission .form-actions small"
  );

  if (textoAntigo) {
    textoAntigo.textContent =
      "Os dados serão armazenados no banco SQLite.";
  }

  // Mensagem do formulário
  const mensagem = document.createElement("p");

  mensagem.id = "mission-message";
  mensagem.style.marginTop = "12px";
  mensagem.style.fontWeight = "600";

  const acoes = form.querySelector(".form-actions");

  if (acoes) {
    acoes.appendChild(mensagem);
  } else {
    form.appendChild(mensagem);
  }

  form.addEventListener("submit", salvarMissao);
}

function obterDadosFormulario() {
  return {
    title: document.getElementById("mission-title").value.trim(),

    category: document.getElementById("mission-category").value,

    description: document.getElementById("mission-description").value.trim(),

    technologies: document.getElementById("mission-technologies").value.trim(),

    image: document.getElementById("mission-image").value.trim(),

    website: document.getElementById("mission-website").value.trim(),

    github: document.getElementById("mission-github").value.trim(),

    status: document.getElementById("mission-status").value
  };
}

function mostrarMensagemMissao(texto, sucesso = true) {
  const mensagem = document.getElementById("mission-message");

  if (!mensagem) return;

  mensagem.textContent = texto;
  mensagem.style.color = sucesso ? "#3ddc84" : "#ff5364";
}

async function salvarMissao(event) {
  event.preventDefault();

  const form = document.getElementById("mission-form");
  const botao = form.querySelector('button[type="submit"]');

  const dados = obterDadosFormulario();

  if (!dados.title || !dados.category || !dados.description) {
    mostrarMensagemMissao(
      "Preencha nome, categoria e descrição.",
      false
    );
    return;
  }

  botao.disabled = true;
  botao.textContent = "SALVANDO...";

  try {
    const editando = missaoEmEdicao !== null;

    const url = editando
      ? `/api/admin/missions/${missaoEmEdicao}`
      : "/api/admin/missions";

    const metodo = editando ? "PUT" : "POST";

    const resultado = await requisicao(url, {
      method: metodo,
      body: JSON.stringify(dados)
    });

    mostrarMensagemMissao(
      resultado.message || "Missão salva com sucesso!"
    );

    missaoEmEdicao = null;
    form.reset();

    await atualizarPainel();

    mostrarTela("missions");
  } catch (erro) {
    mostrarMensagemMissao(erro.message, false);
  } finally {
    botao.disabled = false;
    botao.textContent = missaoEmEdicao
      ? "Atualizar Missão"
      : "Salvar Missão";
  }
}

function limparFormulario() {
  const form = document.getElementById("mission-form");

  if (!form) return;

  form.reset();
  missaoEmEdicao = null;

  const botao = form.querySelector('button[type="submit"]');

  if (botao) {
    botao.disabled = false;
    botao.textContent = "Salvar Missão";
  }

  mostrarMensagemMissao("");
}

// ==========================================
// LISTAR MISSÕES
// ==========================================

async function carregarMissoes() {
  try {
    const dados = await requisicao("/api/admin/missions");

    missoes = dados.missions || [];

    renderizarMissoes();
    renderizarUltimasMissoes();
  } catch (erro) {
    console.error("Erro ao carregar missões:", erro);

    const lista = document.getElementById("missions-list");

    if (lista) {
      lista.textContent = erro.message;
    }
  }
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);

  if (classe) {
    elemento.className = classe;
  }

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  return elemento;
}

function renderizarMissoes() {
  const container = document.getElementById("missions-list");

  if (!container) return;

  container.replaceChildren();

  if (missoes.length === 0) {
    const titulo = criarElemento(
      "strong",
      "",
      "Nenhuma missão cadastrada"
    );

    const descricao = criarElemento(
      "p",
      "",
      "Clique em Nova Missão para cadastrar seu primeiro projeto."
    );

    container.append(titulo, descricao);
    return;
  }

  missoes.forEach((missao) => {
    const card = criarElemento("article", "mission-admin-card");

    card.style.cssText = `
      padding: 20px;
      margin-bottom: 14px;
      background: #17141b;
      border: 1px solid #332934;
      border-radius: 12px;
    `;

    const topo = criarElemento("div", "mission-admin-top");

    topo.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    `;

    const titulo = criarElemento("h3", "", missao.title);

    titulo.style.cssText = `
      color: #ffffff;
      font-size: 20px;
      margin: 0;
    `;

    const status = criarElemento(
      "span",
      "",
      missao.status === "published" ? "PUBLICADO" : "RASCUNHO"
    );

    status.style.cssText = `
      color: ${missao.status === "published" ? "#3ddc84" : "#ffbb55"};
      font-size: 12px;
      font-weight: 800;
    `;

    topo.append(titulo, status);

    const descricao = criarElemento(
      "p",
      "",
      missao.description
    );

    descricao.style.cssText = `
      margin: 14px 0;
      color: #b8b0bd;
      line-height: 1.6;
      overflow-wrap: anywhere;
    `;

    const categoria = criarElemento(
      "small",
      "",
      `Categoria: ${missao.category}`
    );

    categoria.style.color = "#ff4055";

    const acoes = criarElemento("div", "");

    acoes.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    `;

    const editar = criarElemento("button", "", "✎ Editar");

    editar.type = "button";
    editar.className = "small-red-button";

    editar.addEventListener("click", () => {
      editarMissao(missao.id);
    });

    const excluir = criarElemento("button", "", "✕ Excluir");

    excluir.type = "button";

    excluir.style.cssText = `
      background: transparent;
      color: #ff5364;
      border: 1px solid #a52a40;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
    `;

    excluir.addEventListener("click", () => {
      excluirMissao(missao.id);
    });

    const publicar = criarElemento(
      "button",
      "",
      missao.status === "published"
        ? "Ocultar"
        : "Publicar"
    );

    publicar.type = "button";

    publicar.style.cssText = `
      background: #29212c;
      color: white;
      border: 1px solid #554454;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
    `;

    publicar.addEventListener("click", () => {
      alternarPublicacao(missao.id);
    });

    acoes.append(editar, publicar, excluir);

    card.append(topo, descricao, categoria, acoes);

    container.appendChild(card);
  });
}

// ==========================================
// ÚLTIMAS MISSÕES
// ==========================================

function renderizarUltimasMissoes() {
  const container = document.getElementById("recent-missions");

  if (!container) return;

  container.replaceChildren();

  if (missoes.length === 0) {
    container.appendChild(
      criarElemento(
        "p",
        "",
        "Nenhuma missão cadastrada."
      )
    );

    return;
  }

  missoes.slice(0, 4).forEach((missao) => {
    const item = criarElemento("div", "");

    item.style.cssText = `
      padding: 14px 0;
      border-bottom: 1px solid #332934;
    `;

    const titulo = criarElemento("strong", "", missao.title);

    titulo.style.display = "block";
    titulo.style.color = "#ffffff";

    const status = criarElemento(
      "small",
      "",
      missao.status === "published"
        ? "Publicado"
        : "Rascunho"
    );

    status.style.color =
      missao.status === "published" ? "#3ddc84" : "#ffbb55";

    item.append(titulo, status);

    container.appendChild(item);
  });
}

// ==========================================
// EDITAR MISSÃO
// ==========================================

function editarMissao(id) {
  const missao = missoes.find((item) => item.id === id);

  if (!missao) return;

  missaoEmEdicao = id;

  document.getElementById("mission-title").value =
    missao.title || "";

  document.getElementById("mission-category").value =
    missao.category || "";

  document.getElementById("mission-description").value =
    missao.description || "";

  document.getElementById("mission-technologies").value =
    missao.technologies || "";

  document.getElementById("mission-image").value =
    missao.image || "";

  document.getElementById("mission-website").value =
    missao.website || "";

  document.getElementById("mission-github").value =
    missao.github || "";

  document.getElementById("mission-status").value =
    missao.status || "draft";

  const botao = document.querySelector(
    '#mission-form button[type="submit"]'
  );

  botao.textContent = "Atualizar Missão";

  mostrarMensagemMissao("");

  mostrarTela("new-mission");
}

// ==========================================
// EXCLUIR MISSÃO
// ==========================================

async function excluirMissao(id) {
  const missao = missoes.find((item) => item.id === id);

  if (!missao) return;

  const confirmado = confirm(
    `Deseja realmente excluir a missão "${missao.title}"?`
  );

  if (!confirmado) return;

  try {
    await requisicao(`/api/admin/missions/${id}`, {
      method: "DELETE"
    });

    await atualizarPainel();
  } catch (erro) {
    alert(erro.message);
  }
}

// ==========================================
// PUBLICAR OU OCULTAR MISSÃO
// ==========================================

async function alternarPublicacao(id) {
  const missao = missoes.find((item) => item.id === id);

  if (!missao) return;

  const novoStatus =
    missao.status === "published" ? "draft" : "published";

  try {
    await requisicao(`/api/admin/missions/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: missao.title,
        category: missao.category,
        description: missao.description,
        technologies: missao.technologies || "",
        image: missao.image || "",
        website: missao.website || "",
        github: missao.github || "",
        status: novoStatus
      })
    });

    await atualizarPainel();
  } catch (erro) {
    alert(erro.message);
  }
}

// ==========================================
// LOGOUT
// ==========================================

function configurarLogout() {
  const botao = document.getElementById("logout-button");

  botao.addEventListener("click", async () => {
    botao.disabled = true;

    try {
      await requisicao("/api/auth/logout", {
        method: "POST"
      });

      document.getElementById("login-form").reset();

      missoes = [];
      missaoEmEdicao = null;

      mostrarLogin();
    } catch (erro) {
      alert(erro.message);
    } finally {
      botao.disabled = false;
    }
  });
}
