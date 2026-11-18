
/* ==========================================
   ASTA WEB STUDIO — JAVASCRIPT PRINCIPAL
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupFooterYear();
  setupSmoothNavigation();
  setupProjects();
  setupRevealAnimations();
});

/* ==========================================
   MENU MOBILE
========================================== */

function setupMobileMenu() {
  const menuButton = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  if (!menuButton || !navLinks) return;

  function closeMenu() {
    menuButton.classList.remove("active");
    navLinks.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu");
  }

  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");

    menuButton.classList.toggle("active", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu" : "Abrir menu"
    );
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (
      !navLinks.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

/* ==========================================
   ANO DO RODAPÉ
========================================== */

function setupFooterYear() {
  const year = document.getElementById("current-year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

/* ==========================================
   NAVEGAÇÃO SUAVE
========================================== */

function setupSmoothNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") return;

      const target = document.getElementById(href.slice(1));

      if (!target) return;

      event.preventDefault();

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });

      history.replaceState(null, "", href);
    });
  });
}

/* ==========================================
   PROJETOS DEMONSTRATIVOS
========================================== */

const demoProjects = [
  {
    id: "demo-1",
    title: "Hotel Reservas",
    category: "web",
    categoryLabel: "Website",
    description:
      "Conceito de plataforma para apresentar quartos, consultar informações e iniciar reservas de hospedagem.",
    technologies: ["HTML", "CSS", "JavaScript"],
    icon: "🏨",
    glow: "#ba0029",
    image: "",
    website: "",
    github: ""
  },
  {
    id: "demo-2",
    title: "Recife, Novo",
    category: "sistemas",
    categoryLabel: "Sistema",
    description:
      "Conceito de aplicativo para informar ruas alagadas, riscos relacionados à maré e possíveis rotas alternativas.",
    technologies: ["HTML", "CSS", "JavaScript"],
    icon: "🌊",
    glow: "#064d88",
    image: "",
    website: "",
    github: ""
  },
  {
    id: "demo-3",
    title: "Universo Gamer",
    category: "gamer",
    categoryLabel: "Gamer",
    description:
      "Exemplo de interface voltada ao universo dos jogos, com visual marcante e elementos interativos.",
    technologies: ["HTML", "CSS", "JavaScript"],
    icon: "🎮",
    glow: "#6d084c",
    image: "",
    website: "",
    github: ""
  },
  {
    id: "demo-4",
    title: "Portfólio Criativo",
    category: "web",
    categoryLabel: "Website",
    description:
      "Modelo de portfólio para apresentar trabalhos, habilidades, experiências e informações de contato.",
    technologies: ["HTML", "CSS", "Design"],
    icon: "💻",
    glow: "#a00024",
    image: "",
    website: "",
    github: ""
  },
  {
    id: "demo-5",
    title: "Painel de Gestão",
    category: "sistemas",
    categoryLabel: "Sistema",
    description:
      "Exemplo de painel administrativo com indicadores, organização de informações e gerenciamento de conteúdo.",
    technologies: ["JavaScript", "UI/UX", "CSS"],
    icon: "📊",
    glow: "#8b3400",
    image: "",
    website: "",
    github: ""
  },
  {
    id: "demo-6",
    title: "Landing Page Gamer",
    category: "gamer",
    categoryLabel: "Gamer",
    description:
      "Modelo de página promocional com identidade visual gamer, animações e apresentação de conteúdo.",
    technologies: ["HTML", "CSS", "JavaScript"],
    icon: "⚔️",
    glow: "#9c001e",
    image: "",
    website: "",
    github: ""
  }
];

/* ==========================================
   CONVERTER PROJETOS DO BANCO
========================================== */

function converterMissao(missao) {
  const categorias = {
    web: "Website",
    sistemas: "Sistema",
    gamer: "Gamer"
  };

  const icones = {
    web: "💻",
    sistemas: "⚙️",
    gamer: "🎮"
  };

  const cores = {
    web: "#ba0029",
    sistemas: "#064d88",
    gamer: "#6d084c"
  };

  const categoria = ["web", "sistemas", "gamer"].includes(
    missao.category
  ) ? missao.category : "web";

  return {
    id: `real-${missao.id}`,
    title: missao.title || "Projeto sem nome",
    category: categoria,
    categoryLabel: categorias[categoria],
    description: missao.description || "",
    technologies: String(missao.technologies || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    icon: icones[categoria],
    glow: cores[categoria],
    image: missao.image || "",
    website: missao.website || "",
    github: missao.github || ""
  };
}

/* ==========================================
   VALIDAR LINKS EXTERNOS
========================================== */

function urlSegura(valor) {
  if (!valor || typeof valor !== "string") return "";

  try {
    const url = new URL(valor);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}

/* ==========================================
   CARREGAR PROJETOS PUBLICADOS
========================================== */

async function buscarProjetosPublicados() {
  const resposta = await fetch("/api/missions", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store"
  });

  if (!resposta.ok) {
    throw new Error(
      `Não foi possível carregar as missões (${resposta.status}).`
    );
  }

  const dados = await resposta.json();

  if (!Array.isArray(dados.missions)) {
    throw new Error("Formato de resposta inválido.");
  }

  return dados.missions.map(converterMissao);
}

/* ==========================================
   MONTAR PORTFÓLIO
========================================== */

function setupProjects() {
  const grid = document.getElementById("projects-grid");
  const count = document.getElementById("project-count");
  const buttons = document.querySelectorAll(".filter-btn");

  if (!grid) return;

  let projects = [];
  let filtroAtual = "todos";

  function createProjectCard(project) {
    const article = document.createElement("article");
    article.className = "project-card";

    const cover = document.createElement("div");
    cover.className = "project-cover";
    cover.style.setProperty("--project-glow", project.glow);

    const category = document.createElement("span");
    category.className = "project-category";
    category.textContent = project.categoryLabel;

    cover.appendChild(category);

    const imageUrl = urlSegura(project.image);

    if (imageUrl) {
      const image = document.createElement("img");

      image.src = imageUrl;
      image.alt = `Imagem do projeto ${project.title}`;
      image.loading = "lazy";

      image.style.cssText = `
        width: 100%;
        height: 100%;
        position: absolute;
        inset: 0;
        object-fit: cover;
        z-index: 0;
      `;

      cover.style.position = "relative";
      category.style.position = "relative";
      category.style.zIndex = "2";

      const fallback = document.createElement("span");
      fallback.className = "project-cover-icon";
      fallback.textContent = project.icon;
      fallback.setAttribute("aria-hidden", "true");
      fallback.style.display = "none";

      image.addEventListener("error", () => {
        image.remove();
        fallback.style.display = "";
      });

      cover.append(image, fallback);
    } else {
      const icon = document.createElement("span");
      icon.className = "project-cover-icon";
      icon.textContent = project.icon;
      icon.setAttribute("aria-hidden", "true");

      cover.appendChild(icon);
    }

    const content = document.createElement("div");
    content.className = "project-content";

    const title = document.createElement("h3");
    title.textContent = project.title;

    const description = document.createElement("p");
    description.textContent = project.description;

    const tags = document.createElement("div");
    tags.className = "project-tags";

    project.technologies.forEach((technology) => {
      const tag = document.createElement("span");
      tag.textContent = technology;
      tags.appendChild(tag);
    });

    const links = document.createElement("div");
    links.className = "project-links";

    const websiteUrl = urlSegura(project.website);
    const githubUrl = urlSegura(project.github);

    if (websiteUrl) {
      const siteLink = document.createElement("a");
      siteLink.href = websiteUrl;
      siteLink.target = "_blank";
      siteLink.rel = "noopener noreferrer";
      siteLink.className = "project-link primary";
      siteLink.textContent = "↗ Visitar site";
      links.appendChild(siteLink);
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "project-link disabled";
      unavailable.textContent = "Site em breve";
      links.appendChild(unavailable);
    }

    if (githubUrl) {
      const githubLink = document.createElement("a");
      githubLink.href = githubUrl;
      githubLink.target = "_blank";
      githubLink.rel = "noopener noreferrer";
      githubLink.className = "project-link";
      githubLink.textContent = "⌘ GitHub";
      links.appendChild(githubLink);
    }

    content.append(title, description, tags, links);
    article.append(cover, content);

    return article;
  }

  function renderProjects() {
    const filtered = projects.filter((project) => {
      return filtroAtual === "todos" ||
        project.category === filtroAtual;
    });

    grid.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "projects-empty";
      empty.textContent = "Nenhum projeto nesta categoria.";
      grid.appendChild(empty);
    } else {
      filtered.forEach((project) => {
        grid.appendChild(createProjectCard(project));
      });
    }

    if (count) {
      count.textContent =
        filtered.length === 1
          ? "1 projeto"
          : `${filtered.length} projetos`;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      filtroAtual = button.dataset.filter || "todos";

      renderProjects();
    });
  });

  // Mostrar projetos demonstrativos enquanto carrega
  renderProjects();

  // Buscar projetos reais no SQLite através da API
  async function atualizarProjetos() {
    try {
      const projetosReais = await buscarProjetosPublicados();

      // Projetos reais aparecem primeiro
      projects = [...projetosReais];

      renderProjects();

      console.log(
        `ASTA WEB STUDIO: ${projetosReais.length} projeto(s) publicado(s) carregado(s).`
      );
    } catch (erro) {
     console.error(
     "Erro ao carregar projetos publicados:",
     erro
  );

  // Não mostrar projetos demonstrativos
  projects = [];
  renderProjects();
}
  }

  atualizarProjetos();

  // Atualizar ao voltar para a aba do site
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      atualizarProjetos();
    }
  });
}

/* ==========================================
   ANIMAÇÕES AO ROLAR A PÁGINA
========================================== */

function setupRevealAnimations() {
  const elements = document.querySelectorAll(
    ".section-label, " +
    ".section-title, " +
    ".about-description, " +
    ".section-heading > p, " +
    ".service-card, " +
    ".contact-content > p, " +
    ".contact-content > .btn"
  );

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => {
      element.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          currentObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px 30px 0px"
    }
  );

  elements.forEach((element) => {
    element.classList.add("reveal");
    observer.observe(element);
  });
}
