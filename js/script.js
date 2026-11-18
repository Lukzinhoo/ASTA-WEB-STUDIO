
"use strict";

/* ==========================================
   ASTA WEB STUDIO
   JAVASCRIPT PRINCIPAL
   PORTFÓLIO + MODAL + ANIMAÇÕES
   ENERGIA MÁGICA GAMER
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  configurarMenu();
  configurarAno();
  configurarNavegacao();
  configurarPortfolio();
  configurarAnimacoes();
  configurarEnergiaAsta();
});

/* ==========================================
   MENU MOBILE
========================================== */

function configurarMenu() {
  const botao = document.getElementById("menu-toggle");
  const menu = document.getElementById("nav-links");

  if (!botao || !menu) return;

  function fecharMenu() {
    botao.classList.remove("active");
    menu.classList.remove("active");
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu");
  }

  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("active");
    botao.classList.toggle("active", aberto);
    botao.setAttribute("aria-expanded", String(aberto));
    botao.setAttribute(
      "aria-label",
      aberto ? "Fechar menu" : "Abrir menu"
    );
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("click", (evento) => {
    if (
      !menu.contains(evento.target) &&
      !botao.contains(evento.target)
    ) {
      fecharMenu();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) fecharMenu();
  });
}

/* ==========================================
   ANO AUTOMÁTICO
========================================== */

function configurarAno() {
  const elemento = document.getElementById("current-year");

  if (elemento) {
    elemento.textContent = new Date().getFullYear();
  }
}

/* ==========================================
   NAVEGAÇÃO
========================================== */

function configurarNavegacao() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (evento) => {
      const destino = link.getAttribute("href");

      if (!destino || destino === "#") return;

      const elemento = document.getElementById(
        destino.substring(1)
      );

      if (!elemento) return;

      evento.preventDefault();

      const reduzido = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      elemento.scrollIntoView({
        behavior: reduzido ? "auto" : "smooth",
        block: "start"
      });

      history.replaceState(null, "", destino);
    });
  });
}

/* ==========================================
   CATEGORIAS
========================================== */

const CATEGORIAS = {
  web: {
    nome: "Website",
    icone: "WEB",
    cor: "#e62249"
  },
  sistemas: {
    nome: "Sistema",
    icone: "SYS",
    cor: "#1678bd"
  },
  gamer: {
    nome: "Gamer",
    icone: "GAME",
    cor: "#a32bb5"
  }
};

/* ==========================================
   VALIDAÇÃO DE LINKS
========================================== */

function validarLink(valor) {
  if (typeof valor !== "string") return "";

  try {
    const url = new URL(valor.trim());

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}

/* ==========================================
   VALIDAÇÃO DE IMAGENS
========================================== */

function validarImagem(valor) {
  if (typeof valor !== "string") return "";

  const imagem = valor.trim();

  if (!imagem) return "";

  if (
    /^\/assets\/uploads\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(
      imagem
    )
  ) {
    return imagem;
  }

  return validarLink(imagem);
}

/* ==========================================
   CONVERTER PROJETOS DO BANCO
========================================== */

function converterProjeto(missao) {
  const categoria = Object.prototype.hasOwnProperty.call(
    CATEGORIAS,
    missao.category
  )
    ? missao.category
    : "web";

  const config = CATEGORIAS[categoria];

  return {
    id: missao.id,
    titulo: missao.title || "Projeto sem nome",
    categoria,
    nomeCategoria: config.nome,
    descricao: missao.description || "",
    tecnologias: String(missao.technologies || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    icone: config.icone,
    cor: config.cor,
    imagem: validarImagem(missao.image),
    site: validarLink(missao.website),
    github: validarLink(missao.github)
  };
}

/* ==========================================
   BUSCAR PROJETOS DO SQLITE
========================================== */

async function buscarProjetos() {
  const resposta = await fetch("/api/missions", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store"
  });

  if (!resposta.ok) {
    throw new Error(
      "Erro ao consultar projetos: " + resposta.status
    );
  }

  const dados = await resposta.json();

  if (!Array.isArray(dados.missions)) {
    throw new Error("Lista de projetos inválida.");
  }

  return dados.missions
    .filter((missao) => {
      return (
        !missao.status ||
        missao.status === "published"
      );
    })
    .map(converterProjeto);
}

/* ==========================================
   VISUALIZAÇÃO AMPLIADA DOS PROJETOS
========================================== */

function configurarVisualizador() {
  const estilo = document.createElement("style");

  estilo.textContent = `
    .asta-preview-clickable {
      cursor: zoom-in;
    }

    .asta-preview-clickable:focus-visible {
      outline: 3px solid #ff3659;
      outline-offset: -3px;
    }

    .asta-modal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(3, 3, 7, 0.94);
      backdrop-filter: blur(12px);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
    }

    .asta-modal.active {
      opacity: 1;
      visibility: visible;
    }

    .asta-modal-container {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(1100px, 100%);
      max-height: 92vh;
      overflow: hidden;
      border: 1px solid rgba(230, 34, 73, 0.4);
      border-radius: 16px;
      background: #111016;
      box-shadow:
        0 30px 90px rgba(0, 0, 0, 0.8),
        0 0 40px rgba(230, 34, 73, 0.12);
      transform: translateY(20px) scale(0.97);
      transition: transform 0.3s ease;
    }

    .asta-modal.active .asta-modal-container {
      transform: translateY(0) scale(1);
    }

    .asta-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 18px 22px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .asta-modal-title {
      margin: 0;
      color: #fff;
      font-family: "Rajdhani", sans-serif;
      font-size: 24px;
      font-weight: 700;
    }

    .asta-modal-close {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 9px;
      background: #27222c;
      color: #fff;
      font-size: 23px;
      cursor: pointer;
    }

    .asta-modal-close:hover {
      background: #e62249;
    }

    .asta-modal-image-area {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100px;
      overflow: auto;
      background: #09090d;
    }

    .asta-modal-image {
      display: block;
      width: 100%;
      height: auto;
      max-width: 1366px;
      object-fit: contain;
    }

    .asta-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px 22px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .asta-modal-description {
      margin: 0;
      color: #aaa5b2;
      font-family: "Inter", sans-serif;
      font-size: 12px;
      line-height: 1.6;
    }

    .asta-modal-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 10px 18px;
      border-radius: 8px;
      background: linear-gradient(135deg,#f02c52,#ad092b);
      color: #fff;
      font-family: "Inter", sans-serif;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
    }

    .asta-modal-link:hover {
      background: #f02c52;
    }

    body.asta-modal-open {
      overflow: hidden;
    }

    @media (max-width: 680px) {
      .asta-modal {
        padding: 12px;
      }

      .asta-modal-container {
        max-height: 94dvh;
        border-radius: 12px;
      }

      .asta-modal-header {
        padding: 13px 15px;
      }

      .asta-modal-title {
        font-size: 20px;
      }

      .asta-modal-footer {
        padding: 13px 15px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .asta-modal,
      .asta-modal-container {
        transition: none;
      }
    }
  `;

  document.head.appendChild(estilo);

  const modal = document.createElement("div");
  modal.className = "asta-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Visualização do projeto");
  modal.setAttribute("aria-hidden", "true");

  const container = document.createElement("div");
  container.className = "asta-modal-container";

  const cabecalho = document.createElement("div");
  cabecalho.className = "asta-modal-header";

  const titulo = document.createElement("h2");
  titulo.className = "asta-modal-title";
  titulo.id = "asta-modal-title";

  modal.setAttribute("aria-labelledby", titulo.id);

  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "asta-modal-close";
  fechar.textContent = "×";
  fechar.setAttribute(
    "aria-label",
    "Fechar visualização"
  );

  cabecalho.append(titulo, fechar);

  const areaImagem = document.createElement("div");
  areaImagem.className = "asta-modal-image-area";

  const imagem = document.createElement("img");
  imagem.className = "asta-modal-image";
  imagem.alt = "";

  areaImagem.appendChild(imagem);

  const rodape = document.createElement("div");
  rodape.className = "asta-modal-footer";

  const descricao = document.createElement("p");
  descricao.className = "asta-modal-description";

  const link = document.createElement("a");
  link.className = "asta-modal-link";
  link.textContent = "Visitar projeto ↗";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  rodape.append(descricao, link);
  container.append(cabecalho, areaImagem, rodape);
  modal.appendChild(container);
  document.body.appendChild(modal);

  let ultimoFoco = null;

  function abrir(projeto) {
    if (!projeto.imagem) return;

    ultimoFoco = document.activeElement;

    titulo.textContent = projeto.titulo;
    descricao.textContent =
      projeto.descricao ||
      "Projeto desenvolvido pela ASTA WEB STUDIO.";

    imagem.src = projeto.imagem;
    imagem.alt =
      "Captura ampliada de " + projeto.titulo;

    areaImagem.scrollTop = 0;

    if (projeto.site) {
      link.href = projeto.site;
      link.hidden = false;
    } else {
      link.removeAttribute("href");
      link.hidden = true;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("asta-modal-open");

    fechar.focus();
  }

  function fecharModal() {
    if (!modal.classList.contains("active")) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("asta-modal-open");

    imagem.removeAttribute("src");

    if (ultimoFoco && ultimoFoco.isConnected) {
      ultimoFoco.focus();
    }
  }

  fechar.addEventListener("click", fecharModal);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharModal();
  });

  document.addEventListener("keydown", (evento) => {
    if (!modal.classList.contains("active")) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      fecharModal();
      return;
    }

    if (evento.key === "Tab") {
      const controles = [fechar];

      if (!link.hidden) controles.push(link);

      const primeiro = controles[0];
      const ultimo = controles[controles.length - 1];

      if (
        evento.shiftKey &&
        document.activeElement === primeiro
      ) {
        evento.preventDefault();
        ultimo.focus();
      } else if (
        !evento.shiftKey &&
        document.activeElement === ultimo
      ) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  return { abrir };
}

/* ==========================================
   PORTFÓLIO DINÂMICO
========================================== */

function configurarPortfolio() {
  const grade = document.getElementById("projects-grid");
  const contador = document.getElementById("project-count");
  const filtros = document.querySelectorAll(".filter-btn");

  if (!grade) return;

  const visualizador = configurarVisualizador();

  let projetos = [];
  let filtroAtual = "todos";
  let carregamento = 0;
  let ultimaConsulta = 0;
  let consultaEmAndamento = false;
  let ultimaAssinatura = null;

  const INTERVALO_ATUALIZACAO = 60000;

  function elemento(tag, classe = "", texto) {
    const novo = document.createElement(tag);

    if (classe) novo.className = classe;

    if (texto !== undefined) {
      novo.textContent = texto;
    }

    return novo;
  }

  function criarLink(texto, url, classe) {
    const link = elemento("a", classe, texto);

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    return link;
  }

  function criarPreview(projeto) {
    const preview = elemento(
      "div",
      "project-cover asta-project-preview"
    );

    preview.style.setProperty(
      "--project-glow",
      projeto.cor
    );

    const navegador = elemento(
      "div",
      "asta-browser"
    );

    const barra = elemento(
      "div",
      "asta-browser-bar"
    );

    const pontos = elemento(
      "div",
      "asta-browser-dots"
    );

    for (let i = 0; i < 3; i++) {
      pontos.appendChild(
        elemento("span", "asta-browser-dot")
      );
    }

    const endereco = elemento(
      "span",
      "asta-browser-address",
      projeto.site
        ? new URL(projeto.site).hostname
        : "asta-web-studio / projeto"
    );

    barra.append(pontos, endereco);

    const tela = elemento(
      "div",
      "asta-browser-screen"
    );

    const fallback = elemento(
      "div",
      "asta-preview-fallback"
    );

    const simbolo = elemento(
      "strong",
      "asta-preview-symbol",
      projeto.icone
    );

    const nome = elemento(
      "span",
      "asta-preview-name",
      projeto.titulo
    );

    fallback.append(simbolo, nome);
    tela.appendChild(fallback);

    if (projeto.imagem) {
      const imagem = document.createElement("img");

      imagem.className = "asta-preview-image";
      imagem.src = projeto.imagem;
      imagem.alt = "Prévia de " + projeto.titulo;
      imagem.loading = "lazy";
      imagem.decoding = "async";

      imagem.addEventListener("error", () => {
        imagem.remove();
        tela.classList.remove("asta-preview-clickable");
        tela.removeAttribute("role");
        tela.removeAttribute("tabindex");
        tela.removeAttribute("aria-label");
      });

      tela.appendChild(imagem);

      tela.classList.add("asta-preview-clickable");
      tela.setAttribute("role", "button");
      tela.setAttribute("tabindex", "0");

      tela.setAttribute(
        "aria-label",
        "Ampliar imagem do projeto " + projeto.titulo
      );

      tela.addEventListener("click", () => {
        if (imagem.isConnected) {
          visualizador.abrir(projeto);
        }
      });

      tela.addEventListener("keydown", (evento) => {
        if (
          evento.key === "Enter" ||
          evento.key === " "
        ) {
          evento.preventDefault();

          if (imagem.isConnected) {
            visualizador.abrir(projeto);
          }
        }
      });
    }

    const categoria = elemento(
      "span",
      "project-category asta-category",
      projeto.nomeCategoria
    );

    navegador.append(barra, tela);
    preview.append(navegador, categoria);

    return preview;
  }

  function criarCartao(projeto, indice) {
    const cartao = elemento(
      "article",
      "project-card asta-project-card"
    );

    cartao.style.setProperty(
      "--project-glow",
      projeto.cor
    );

    cartao.style.setProperty(
      "--card-index",
      indice
    );

    const preview = criarPreview(projeto);

    const conteudo = elemento(
      "div",
      "project-content asta-project-content"
    );

    const cabecalho = elemento(
      "div",
      "asta-project-heading"
    );

    const titulo = elemento(
      "h3",
      "asta-project-title",
      projeto.titulo
    );

    const numero = elemento(
      "span",
      "asta-project-number",
      String(indice + 1).padStart(2, "0")
    );

    cabecalho.append(titulo, numero);

    const descricao = elemento(
      "p",
      "asta-project-description",
      projeto.descricao ||
        "Conheça este projeto desenvolvido pela ASTA WEB STUDIO."
    );

    const tecnologias = elemento(
      "div",
      "project-tags asta-project-tags"
    );

    projeto.tecnologias.forEach((nome) => {
      tecnologias.appendChild(
        elemento("span", "", nome)
      );
    });

    const links = elemento(
      "div",
      "project-links asta-project-links"
    );

    if (projeto.site) {
      links.appendChild(
        criarLink(
          "Ver projeto ↗",
          projeto.site,
          "project-link primary"
        )
      );
    } else {
      links.appendChild(
        elemento(
          "span",
          "project-link disabled",
          "Em breve"
        )
      );
    }

    if (projeto.github) {
      links.appendChild(
        criarLink(
          "Código no GitHub ↗",
          projeto.github,
          "project-link"
        )
      );
    }

    conteudo.append(
      cabecalho,
      descricao,
      tecnologias,
      links
    );

    cartao.append(preview, conteudo);

    return cartao;
  }

  function mostrarProjetos() {
    const filtrados = projetos.filter((projeto) => {
      return (
        filtroAtual === "todos" ||
        projeto.categoria === filtroAtual
      );
    });

    grade.replaceChildren();

    if (filtrados.length === 0) {
      const vazio = elemento(
        "div",
        "projects-empty asta-projects-empty"
      );

      const titulo = elemento(
        "strong",
        "",
        "Nenhum projeto nesta categoria"
      );

      const mensagem = elemento(
        "p",
        "",
        "Novos projetos serão apresentados aqui em breve."
      );

      vazio.append(titulo, mensagem);
      grade.appendChild(vazio);
    } else {
      const fragmento = document.createDocumentFragment();

      filtrados.forEach((projeto, indice) => {
        fragmento.appendChild(
          criarCartao(projeto, indice)
        );
      });

      grade.appendChild(fragmento);
    }

    if (contador) {
      contador.textContent =
        filtrados.length === 1
          ? "1 projeto"
          : `${filtrados.length} projetos`;
    }
  }

  filtros.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filter || "todos";

      filtros.forEach((item) => {
        const ativo = item === botao;

        item.classList.toggle("active", ativo);
        item.setAttribute(
          "aria-pressed",
          String(ativo)
        );
      });

      mostrarProjetos();
    });
  });

  /* ==========================================
     ATUALIZAÇÃO CONTROLADA DOS PROJETOS
  ========================================== */

  async function atualizarProjetos() {
    if (consultaEmAndamento) return;

    consultaEmAndamento = true;
    ultimaConsulta = Date.now();

    const requisicaoAtual = ++carregamento;

    try {
      const resultado = await buscarProjetos();

      if (requisicaoAtual !== carregamento) return;

      const assinatura = JSON.stringify(resultado);

      if (assinatura !== ultimaAssinatura) {
        projetos = resultado;
        ultimaAssinatura = assinatura;

        mostrarProjetos();

        console.log(
          "ASTA WEB STUDIO:",
          projetos.length,
          "projetos carregados."
        );
      }
    } catch (erro) {
      if (requisicaoAtual !== carregamento) return;

      console.error(
        "Erro ao carregar portfólio:",
        erro
      );

      if (projetos.length > 0) {
        mostrarProjetos();
        return;
      }

      grade.replaceChildren();

      grade.appendChild(
        elemento(
          "p",
          "projects-empty",
          "Não foi possível carregar os projetos. Atualize a página."
        )
      );

      if (contador) {
        contador.textContent = "Indisponível";
      }
    } finally {
      consultaEmAndamento = false;
    }
  }

  grade.replaceChildren();

  grade.appendChild(
    elemento(
      "p",
      "projects-empty",
      "Carregando projetos..."
    )
  );

  atualizarProjetos();

  document.addEventListener("visibilitychange", () => {
    if (
      !document.hidden &&
      Date.now() - ultimaConsulta >= INTERVALO_ATUALIZACAO
    ) {
      atualizarProjetos();
    }
  });
}

/* ==========================================
   ANIMAÇÕES AO ROLAR A PÁGINA
   FUNCIONAM DESCENDO E SUBINDO
========================================== */

function configurarAnimacoes() {
  const seletor = [
    ".section-label",
    ".section-title",
    ".about-description",
    ".section-heading > p",
    ".service-card",
    ".contact-content > p",
    ".contact-content > .btn"
  ].join(", ");

  const reduzido = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (
    reduzido ||
    !("IntersectionObserver" in window)
  ) {
    document.querySelectorAll(seletor).forEach((item) => {
      item.classList.add("visible");
    });

    return;
  }

  const observados = new WeakSet();

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        entrada.target.classList.toggle(
          "visible",
          entrada.isIntersecting
        );
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -25px 0px"
    }
  );

  function observarElementos() {
    document.querySelectorAll(seletor).forEach((item) => {
      if (observados.has(item)) return;

      observados.add(item);
      item.classList.add("reveal");
      observador.observe(item);
    });
  }

  observarElementos();

  const grade = document.getElementById("projects-grid");

  if (grade) {
    const mutacoes = new MutationObserver(
      observarElementos
    );

    mutacoes.observe(grade, {
      childList: true,
      subtree: true
    });
  }
}

/* ==========================================
   ENERGIA MÁGICA DO ASTA
   PARTÍCULAS NEON VERMELHAS
========================================== */

function configurarEnergiaAsta() {
  const visual = document.querySelector(".hero-visual");

  if (!visual) return;

  const movimentoReduzido = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  if (movimentoReduzido.matches) return;

  const estilo = document.createElement("style");
  estilo.id = "asta-energia-estilo";

  estilo.textContent = `
    .hero-visual {
      isolation: isolate;
    }

    .asta-energy-field {
      position: absolute;
      inset: 0;
      z-index: 2;
      overflow: hidden;
      pointer-events: none;
    }

    .asta-energy-particle {
      position: absolute;
      left: var(--particle-x);
      bottom: var(--particle-y);
      width: var(--particle-size);
      height: var(--particle-size);
      border-radius: 50%;
      background: #ff183b;
      opacity: 0;
      box-shadow:
        0 0 5px #ff183b,
        0 0 12px rgba(255, 0, 45, 0.8),
        0 0 24px rgba(255, 0, 45, 0.35);
      animation:
        astaParticleRise
        var(--particle-duration)
        linear
        var(--particle-delay)
        infinite;
    }

    .asta-energy-spark {
      position: absolute;
      left: var(--particle-x);
      bottom: var(--particle-y);
      width: 2px;
      height: var(--spark-height);
      border-radius: 3px;
      background: linear-gradient(
        180deg,
        transparent,
        #ff2346,
        #ff91a2,
        transparent
      );
      opacity: 0;
      transform: rotate(var(--spark-angle));
      filter: drop-shadow(0 0 6px #ff002b);
      animation:
        astaSparkRise
        var(--particle-duration)
        ease-out
        var(--particle-delay)
        infinite;
    }

    .asta-energy-ring {
      position: absolute;
      z-index: -1;
      left: 50%;
      top: 51%;
      width: 72%;
      aspect-ratio: 1;
      border: 1px solid rgba(255, 25, 56, 0.22);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow:
        0 0 24px rgba(255, 0, 38, 0.12),
        inset 0 0 24px rgba(255, 0, 38, 0.08);
      animation: astaRingPulse 5s ease-in-out infinite;
    }

    .asta-energy-ring::before {
      content: "";
      position: absolute;
      inset: 9%;
      border: 1px dashed rgba(255, 42, 70, 0.2);
      border-radius: 50%;
      animation: astaRingRotate 30s linear infinite;
    }

    @keyframes astaParticleRise {
      0% {
        opacity: 0;
        transform: translate3d(0, 0, 0) scale(0.4);
      }

      15% {
        opacity: 0.9;
      }

      65% {
        opacity: 0.75;
      }

      100% {
        opacity: 0;
        transform:
          translate3d(
            var(--particle-drift),
            var(--particle-rise),
            0
          )
          scale(0.1);
      }
    }

    @keyframes astaSparkRise {
      0% {
        opacity: 0;
        transform:
          translateY(0)
          rotate(var(--spark-angle))
          scaleY(0.5);
      }

      25% {
        opacity: 0.9;
      }

      100% {
        opacity: 0;
        transform:
          translate(
            var(--particle-drift),
            var(--particle-rise)
          )
          rotate(var(--spark-angle))
          scaleY(0.2);
      }
    }

    @keyframes astaRingPulse {
      0%, 100% {
        opacity: 0.4;
        transform:
          translate(-50%, -50%)
          scale(0.93);
      }

      50% {
        opacity: 0.85;
        transform:
          translate(-50%, -50%)
          scale(1.04);
      }
    }

    @keyframes astaRingRotate {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 600px) {
      .asta-energy-ring {
        width: 75%;
      }

      .asta-energy-particle:nth-of-type(n+17),
      .asta-energy-spark:nth-of-type(n+17) {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .asta-energy-field {
        display: none;
      }

      .asta-energy-ring,
      .asta-energy-ring::before {
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(estilo);

  const campo = document.createElement("div");
  campo.className = "asta-energy-field";
  campo.setAttribute("aria-hidden", "true");

  const anel = document.createElement("div");
  anel.className = "asta-energy-ring";

  campo.appendChild(anel);

  const celular = window.innerWidth <= 600;

  const quantidadeParticulas = celular ? 16 : 38;
  const quantidadeFaíscas = celular ? 8 : 18;

  function aleatorio(minimo, maximo) {
    return minimo + Math.random() * (maximo - minimo);
  }

  function criarParticula(tipo) {
    const particula = document.createElement("span");

    particula.className =
      tipo === "spark"
        ? "asta-energy-spark"
        : "asta-energy-particle";

    const posicaoX = aleatorio(12, 88);
    const posicaoY = aleatorio(8, 62);
    const tamanho = aleatorio(2, 5);
    const duracao = aleatorio(2.5, 6.5);
    const atraso = aleatorio(-6, 0);
    const deslocamento = aleatorio(-85, 85);
    const subida = aleatorio(-130, -300);
    const angulo = aleatorio(-35, 35);

    particula.style.setProperty(
      "--particle-x",
      `${posicaoX}%`
    );

    particula.style.setProperty(
      "--particle-y",
      `${posicaoY}%`
    );

    particula.style.setProperty(
      "--particle-size",
      `${tamanho}px`
    );

    particula.style.setProperty(
      "--particle-duration",
      `${duracao}s`
    );

    particula.style.setProperty(
      "--particle-delay",
      `${atraso}s`
    );

    particula.style.setProperty(
      "--particle-drift",
      `${deslocamento}px`
    );

    particula.style.setProperty(
      "--particle-rise",
      `${subida}px`
    );

    particula.style.setProperty(
      "--spark-angle",
      `${angulo}deg`
    );

    particula.style.setProperty(
      "--spark-height",
      `${aleatorio(10, 28)}px`
    );

    return particula;
  }

  const fragmento = document.createDocumentFragment();

  for (let i = 0; i < quantidadeParticulas; i++) {
    fragmento.appendChild(criarParticula("particle"));
  }

  for (let i = 0; i < quantidadeFaíscas; i++) {
    fragmento.appendChild(criarParticula("spark"));
  }

  campo.appendChild(fragmento);
  visual.appendChild(campo);

  function atualizarEstado() {
    const pausado = document.hidden;

    campo.querySelectorAll(
      ".asta-energy-particle, .asta-energy-spark, .asta-energy-ring"
    ).forEach((elemento) => {
      elemento.style.animationPlayState =
        pausado ? "paused" : "running";
    });
  }

  document.addEventListener(
    "visibilitychange",
    atualizarEstado
  );

  atualizarEstado();

  console.log(
    "ASTA WEB STUDIO: energia mágica ativada."
  );
}

/* ==========================================
   FIM DO JAVASCRIPT
========================================== */
