
"use strict";

// ==========================================
// ASTA WEB STUDIO — TOUROS NEGROS
// ADMIN DASHBOARD 2.0
// ==========================================

const $ = id => document.getElementById(id);

const titles = {
  dashboard: "Touros Negros",
  missions: "Projetos",
  "new-mission": "Novo projeto",
  messages: "Mensagens",
  settings: "Configurações"
};

let missions = [];
let messages = [];
let editingId = null;

// ==========================================
// API
// ==========================================

async function api(url, method = "GET", data) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: data === undefined
      ? {}
      : { "Content-Type": "application/json" },
    body: data === undefined
      ? undefined
      : JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
      result.message ||
      `Erro ${response.status}`
    );
  }

  return result;
}

// ==========================================
// UTILITÁRIOS
// ==========================================

function el(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = String(text ?? "");

  if (className) {
    node.className = className;
  }

  return node;
}

function notify(text, error = false) {
  let toast = $("admin-toast");

  if (!toast) {
    toast = el("div");
    toast.id = "admin-toast";
    toast.setAttribute("role", "status");

    Object.assign(toast.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "9999",
      padding: "14px 18px",
      borderRadius: "10px",
      color: "#fff",
      boxShadow: "0 15px 35px #0007",
      maxWidth: "350px"
    });

    document.body.append(toast);
  }

  toast.textContent = text;
  toast.style.background = error
    ? "#a5203e"
    : "#187a55";

  toast.hidden = false;

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

function safeDate(raw) {
  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(raw) {
  const date = safeDate(raw);

  return date
    ? date.toLocaleDateString("pt-BR")
    : "—";
}

function messageIsRead(message) {
  return (
    message.is_read === true ||
    message.is_read === 1 ||
    message.is_read === "1"
  );
}

function messageDate(message) {
  return safeDate(
    message.created_at ||
    message.createdAt ||
    message.date
  );
}

// ==========================================
// LOGIN E SESSÃO
// ==========================================

function showLogin() {
  $("login-screen").hidden = false;
  $("admin-panel").hidden = true;
}

function showPanel(username) {
  $("login-screen").hidden = true;
  $("admin-panel").hidden = false;

  $("profile-name").textContent =
    username || "Administrador";

  navigate("dashboard", false);
}

async function checkSession() {
  try {
    const user = await api("/api/auth/me");

    showPanel(user.username);

    await refreshAll();
  } catch (error) {
    console.error("Sessão:", error);
    showLogin();
  }
}

function initAuth() {
  $("login-form").addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const button = event.currentTarget.querySelector(
        '[type="submit"]'
      );

      button.disabled = true;
      $("login-message").textContent = "";

      try {
        const user = await api(
          "/api/auth/login",
          "POST",
          {
            username: $("username").value.trim(),
            password: $("password").value
          }
        );

        $("login-form").reset();

        showPanel(user.username);

        await refreshAll();
      } catch (error) {
        $("login-message").textContent =
          error.message;
      } finally {
        button.disabled = false;
      }
    }
  );

  $("toggle-password").addEventListener(
    "click",
    () => {
      const input = $("password");

      input.type = input.type === "password"
        ? "text"
        : "password";

      $("toggle-password").setAttribute(
        "aria-label",
        input.type === "password"
          ? "Mostrar senha"
          : "Ocultar senha"
      );
    }
  );

  $("logout-button").addEventListener(
    "click",
    async () => {
      try {
        await api("/api/auth/logout", "POST");

        missions = [];
        messages = [];

        showLogin();
      } catch (error) {
        notify(error.message, true);
      }
    }
  );
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function navigate(view, load = true) {
  if (!titles[view]) return;

  document.querySelectorAll(".admin-view")
    .forEach(node => {
      node.hidden = node.id !== `view-${view}`;
    });

  document.querySelectorAll(".sidebar-link")
    .forEach(node => {
      node.classList.toggle(
        "active",
        node.dataset.view === view
      );
    });

  $("topbar-title").textContent = titles[view];
  $("breadcrumb").textContent = titles[view];

  $("sidebar").classList.remove("open");

  $("sidebar-toggle").setAttribute(
    "aria-expanded",
    "false"
  );

  if (load && view === "dashboard") {
    refreshAll();
  }

  if (load && view === "missions") {
    loadMissions();
  }

  if (load && view === "messages") {
    loadMessages();
  }
}

function initNavigation() {
  document.querySelectorAll("[data-view],[data-go]")
    .forEach(node => {
      node.addEventListener("click", () => {
        const view =
          node.dataset.view || node.dataset.go;

        if (view === "new-mission") {
          clearMissionForm();
        }

        navigate(view);
      });
    });

  $("sidebar-toggle").addEventListener(
    "click",
    () => {
      const open = $("sidebar").classList.toggle(
        "open"
      );

      $("sidebar-toggle").setAttribute(
        "aria-expanded",
        String(open)
      );
    }
  );
}

// ==========================================
// NOVOS COMPONENTES DO DASHBOARD
// ==========================================

function setupMessageDashboard() {
  const dashboard = $("view-dashboard");

  if (!dashboard) return;

  const statsGrid = dashboard.querySelector(
    ".stats-grid"
  );

  const bottomGrid = dashboard.querySelector(
    ".bottom-grid"
  );

  // CARTÃO: MENSAGENS NÃO LIDAS

  if (statsGrid && !$("stat-unread")) {
    const card = el(
      "article",
      "",
      "stat-card"
    );

    const icon = el(
      "div",
      "✉",
      "stat-icon yellow"
    );

    const content = el("div");

    const value = el("strong", "—");
    value.id = "stat-unread";

    content.append(
      el("span", "Mensagens não lidas"),
      value,
      el(
        "small",
        "Contatos aguardando sua atenção"
      )
    );

    card.append(icon, content);
    statsGrid.append(card);
  }

  // PAINEL: CONTATOS RECENTES

  if (
    bottomGrid &&
    !$("recent-messages-dashboard")
  ) {
    const card = el(
      "article",
      "",
      "panel-card"
    );

    const heading = el(
      "div",
      "",
      "panel-heading"
    );

    const info = el("div");

    info.append(
      el("h2", "Mensagens recentes"),
      el(
        "p",
        "Últimos contatos recebidos pelo site"
      )
    );

    const button = el(
      "button",
      "Ver mensagens",
      "subtle-btn"
    );

    button.type = "button";

    button.addEventListener("click", () => {
      navigate("messages");
    });

    heading.append(info, button);

    const list = el(
      "div",
      "Carregando mensagens...",
      "activity-list"
    );

    list.id = "recent-messages-dashboard";

    list.setAttribute(
      "aria-live",
      "polite"
    );

    card.append(heading, list);
    bottomGrid.append(card);
  }
}

// ==========================================
// ESTATÍSTICAS
// ==========================================

async function loadOverview() {
  try {
    const result = await api(
      "/api/admin/overview"
    );

    $("stat-total").textContent =
      result.total ?? "—";

    $("stat-published").textContent =
      result.published ?? "—";

    $("stat-drafts").textContent =
      result.drafts ?? "—";

    $("stat-messages").textContent =
      result.messages ?? "—";
  } catch (error) {
    console.error(
      "Erro ao carregar estatísticas:",
      error
    );

    [
      "stat-total",
      "stat-published",
      "stat-drafts",
      "stat-messages"
    ].forEach(id => {
      $(id).textContent = "—";
    });
  }
}

async function loadMissions() {
  try {
    const result = await api(
      "/api/admin/missions"
    );

    if (!Array.isArray(result.missions)) {
      throw new Error(
        "Resposta de projetos inválida."
      );
    }

    missions = result.missions;

    renderMissions();
    renderDashboard();
  } catch (error) {
    console.error(error);

    notify(
      "Não foi possível carregar os projetos.",
      true
    );
  }
}

async function loadMessageSummary() {
  try {
    const result = await api(
      "/api/admin/messages"
    );

    if (!Array.isArray(result.messages)) {
      throw new Error(
        "Resposta de mensagens inválida."
      );
    }

    messages = result.messages;

    renderMessageSummary();
  } catch (error) {
    console.error(error);

    if ($("stat-unread")) {
      $("stat-unread").textContent = "—";
    }

    if ($("recent-messages-dashboard")) {
      $("recent-messages-dashboard").textContent =
        "Não foi possível carregar as mensagens.";
    }
  }
}

async function refreshAll() {
  await Promise.all([
    loadOverview(),
    loadMissions(),
    loadMessageSummary()
  ]);
}

// ==========================================
// DATAS E STATUS DOS PROJETOS
// ==========================================

function projectDate(m) {
  return safeDate(
    m.created_at ||
    m.createdAt ||
    m.date
  );
}

function dateText(m) {
  return formatDate(
    m.created_at ||
    m.createdAt ||
    m.date
  );
}

function isPublished(m) {
  return m.status === "published";
}

function statusNode(m) {
  return el(
    "span",
    isPublished(m)
      ? "Publicado"
      : "Rascunho",
    "status-pill " + (
      isPublished(m)
        ? "published"
        : "draft"
    )
  );
}

// ==========================================
// DASHBOARD — PROJETOS
// ==========================================

function renderDashboard() {
  const total = missions.length;

  const published = missions.filter(
    isPublished
  ).length;

  const drafts = total - published;

  $("donut-total").textContent = total;

  $("donut-published").textContent =
    published;

  $("donut-drafts").textContent =
    drafts;

  const percent = total
    ? published / total * 100
    : 0;

  $("projects-donut").style.background =
    `conic-gradient(
      #ff174c 0% ${percent}%,
      #626977 ${percent}% 100%
    )`;

  renderTable();
  renderActivity();
  renderLineChart();
}

// ==========================================
// TABELA DE PROJETOS RECENTES
// ==========================================

function renderTable() {
  const tbody = $("recent-projects-table");

  tbody.replaceChildren();

  if (!missions.length) {
    const row = el("tr");
    const cell = el(
      "td",
      "Nenhum projeto cadastrado."
    );

    cell.colSpan = 4;

    row.append(cell);
    tbody.append(row);

    return;
  }

  const ordered = [...missions].sort(
    (a, b) => {
      const da =
        projectDate(a)?.getTime() ?? 0;

      const db =
        projectDate(b)?.getTime() ?? 0;

      return db - da;
    }
  );

  ordered.slice(0, 5).forEach(m => {
    const row = el("tr");
    const name = el("td");

    const wrap = el(
      "div",
      "",
      "table-project"
    );

    const icon = el(
      "span",
      (m.title || "P").charAt(0).toUpperCase(),
      "table-project-icon"
    );

    const info = el("div");

    info.append(
      el(
        "strong",
        m.title || "Sem título"
      )
    );

    info.append(
      el(
        "small",
        m.website || "Projeto cadastrado"
      )
    );

    wrap.append(icon, info);
    name.append(wrap);

    const category = el(
      "td",
      m.category || "—"
    );

    const status = el("td");
    status.append(statusNode(m));

    row.append(
      name,
      category,
      status,
      el("td", dateText(m))
    );

    tbody.append(row);
  });
}

// ==========================================
// ATIVIDADES RECENTES
// ==========================================

function renderActivity() {
  const target = $("activity-list");

  target.replaceChildren();

  if (!missions.length) {
    target.append(
      el(
        "p",
        "Nenhuma atividade de projeto disponível."
      )
    );

    return;
  }

  const ordered = [...missions].sort(
    (a, b) =>
      (projectDate(b)?.getTime() ?? 0) -
      (projectDate(a)?.getTime() ?? 0)
  );

  ordered.slice(0, 5).forEach(m => {
    const item = el(
      "div",
      "",
      "activity-item"
    );

    const icon = el(
      "span",
      isPublished(m) ? "✓" : "▣",
      "activity-icon"
    );

    const info = el("div");

    info.append(
      el(
        "strong",
        `${m.title || "Projeto"} — ${
          isPublished(m)
            ? "Publicado"
            : "Rascunho"
        }`
      )
    );

    info.append(
      el(
        "small",
        projectDate(m)
          ? `Cadastrado em ${dateText(m)}`
          : "Data de cadastro indisponível"
      )
    );

    item.append(icon, info);
    target.append(item);
  });
}

// ==========================================
// DASHBOARD — MENSAGENS
// ==========================================

function renderMessageSummary() {
  const unread = $("stat-unread");

  const target = $(
    "recent-messages-dashboard"
  );

  const unreadCount = messages.filter(
    m => !messageIsRead(m)
  ).length;

  if (unread) {
    unread.textContent = unreadCount;
  }

  if (!target) return;

  target.replaceChildren();

  if (!messages.length) {
    target.append(
      el(
        "p",
        "Nenhuma mensagem recebida até agora."
      )
    );

    return;
  }

  const ordered = [...messages].sort(
    (a, b) =>
      (messageDate(b)?.getTime() ?? 0) -
      (messageDate(a)?.getTime() ?? 0)
  );

  ordered.slice(0, 5).forEach(m => {
    const item = el(
      "div",
      "",
      "activity-item"
    );

    const icon = el(
      "span",
      messageIsRead(m) ? "✓" : "✉",
      "activity-icon"
    );

    const info = el("div");

    const status = messageIsRead(m)
      ? "Lida"
      : "Não lida";

    info.append(
      el(
        "strong",
        m.name || "Visitante"
      ),
      el(
        "small",
        `${m.subject || "Sem assunto"} · ${status}`
      )
    );

    item.append(icon, info);
    target.append(item);
  });
}

// ==========================================
// GRÁFICO SVG
// ==========================================

function svgElement(tag, attrs = {}) {
  const node = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  Object.entries(attrs).forEach(
    ([key, value]) => {
      node.setAttribute(
        key,
        String(value)
      );
    }
  );

  return node;
}

function svgText(svg, x, y, text, attrs = {}) {
  const node = svgElement("text", {
    x,
    y,
    fill: "#9297a6",
    "font-size": 11,
    ...attrs
  });

  node.textContent = text;
  svg.append(node);
}

function renderLineChart() {
  const svg = $("projects-line-chart");

  svg.replaceChildren();

  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString(
        "pt-BR",
        { month: "short" }
      )
    });
  }

  const dated = missions.filter(
    m => projectDate(m)
  );

  const hasAllDates =
    dated.length === missions.length;

  const counts = months.map(item => {
    const matching = dated.filter(m => {
      const d = projectDate(m);

      return (
        d.getFullYear() === item.year &&
        d.getMonth() === item.month
      );
    });

    return {
      published: matching.filter(
        isPublished
      ).length,

      drafts: matching.filter(
        m => !isPublished(m)
      ).length
    };
  });

  const max = Math.max(
    1,
    ...counts.flatMap(c => [
      c.published,
      c.drafts
    ])
  );

  const left = 42;
  const right = 680;
  const top = 25;
  const bottom = 235;

  const x = i =>
    left + (right - left) * i / 11;

  const y = v =>
    bottom - (bottom - top) * v / max;

  for (let i = 0; i <= 4; i++) {
    const value = max * i / 4;
    const yy = y(value);

    svg.append(
      svgElement("line", {
        x1: left,
        y1: yy,
        x2: right,
        y2: yy,
        stroke: "#353844",
        "stroke-width": 1
      })
    );

    svgText(
      svg,
      5,
      yy + 4,
      String(Number(value.toFixed(1)))
    );
  }

  months.forEach((m, i) => {
    svgText(
      svg,
      x(i),
      260,
      m.label,
      {
        "text-anchor": "middle"
      }
    );
  });

  function draw(key, color, dashed = false) {
    const points = counts.map(
      (c, i) => [
        x(i),
        y(c[key])
      ]
    );

    const d = points.map(
      (p, i) =>
        `${i ? "L" : "M"} ${p[0]} ${p[1]}`
    ).join(" ");

    if (!dashed) {
      svg.append(
        svgElement("path", {
          d: `${d} L ${right} ${bottom} L ${left} ${bottom} Z`,
          fill: "#ff174c",
          "fill-opacity": ".12"
        })
      );
    }

    svg.append(
      svgElement("path", {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": 2.6,
        "stroke-linecap": "round",
        ...(dashed
          ? { "stroke-dasharray": "5 5" }
          : {})
      })
    );

    points.forEach(p => {
      svg.append(
        svgElement("circle", {
          cx: p[0],
          cy: p[1],
          r: 3.3,
          fill: color,
          stroke: "#1d2029",
          "stroke-width": 1.5
        })
      );
    });
  }

  draw("published", "#ff174c");

  draw(
    "drafts",
    "#9a9da9",
    true
  );

  $("chart-note").textContent =
    hasAllDates
      ? "Quantidade de projetos cadastrados em cada mês."
      : "O gráfico utiliza apenas projetos com data de cadastro disponível.";
}

// ==========================================
// BOTÕES
// ==========================================

function actionButton(text, fn) {
  const button = el(
    "button",
    text,
    "small-red-button"
  );

  button.type = "button";
  button.addEventListener("click", fn);

  return button;
}

// ==========================================
// LISTA DE PROJETOS
// ==========================================

function renderMissions() {
  const target = $("missions-list");

  target.replaceChildren();

  if (!missions.length) {
    target.append(
      el(
        "p",
        "Nenhum projeto cadastrado."
      )
    );

    return;
  }

  missions.forEach(m => {
    const card = el(
      "article",
      "",
      "asta-mission-card"
    );

    if (m.image) {
      const preview = document.createElement(
        "img"
      );

      preview.src = m.image;

      preview.alt =
        `Prévia de ${m.title || "projeto"}`;

      preview.loading = "lazy";

      Object.assign(preview.style, {
        display: "block",
        width: "100%",
        maxHeight: "220px",
        objectFit: "cover",
        objectPosition: "top",
        borderRadius: "10px",
        marginBottom: "14px",
        background: "#171922"
      });

      preview.addEventListener(
        "error",
        () => {
          preview.hidden = true;
        }
      );

      card.append(preview);
    }

    card.append(
      el(
        "h3",
        m.title || "Sem título"
      )
    );

    card.append(statusNode(m));

    card.append(
      el(
        "p",
        m.description || "Sem descrição."
      )
    );

    if (m.website) {
      try {
        const url = new URL(m.website);

        if (
          ["http:", "https:"].includes(
            url.protocol
          )
        ) {
          const link = el(
            "a",
            "↗ Visualizar site"
          );

          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          card.append(link);
        }
      } catch (error) {
        console.warn(
          "URL inválida:",
          error
        );
      }
    }

    const actions = el(
      "div",
      "",
      "asta-mission-actions"
    );

    actions.append(
      actionButton(
        "Editar",
        () => editMission(m)
      ),

      actionButton(
        isPublished(m)
          ? "Ocultar"
          : "Publicar",
        () => toggleMission(m)
      ),

      actionButton(
        "Atualizar captura",
        () => refreshPreview(m)
      ),

      actionButton(
        "Excluir",
        () => deleteMission(m)
      )
    );

    card.append(actions);
    target.append(card);
  });
}

// ==========================================
// CADASTRO RÁPIDO POR LINK
// ==========================================

function quickProjectData(link) {
  let url;

  try {
    url = new URL(link);
  } catch {
    throw new Error(
      "Informe um endereço válido."
    );
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(
      "Use um endereço HTTPS público, sem usuário ou porta personalizada."
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.includes(":") ||
    /^[0-9.]+$/.test(hostname)
  ) {
    throw new Error(
      "Esse endereço não é permitido para capturas."
    );
  }

  const domain = hostname.replace(
    /^www\./,
    ""
  );

  const title = domain
    .split(".")[0]
    .replace(/[-_]+/g, " ")
    .replace(
      /\b\w/g,
      letter => letter.toUpperCase()
    )
    .slice(0, 150);

  return {
    title: title || "Novo projeto",
    category: "web",
    description: `Website ${domain}`,
    technologies: "",
    image: "",
    website: url.href,
    github: "",
    status: "published"
  };
}

function initQuickProjectForm() {
  const form = $("quick-project-form");

  if (!form) return;

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const input = $("quick-project-url");

      const feedback = $(
        "quick-project-feedback"
      );

      const button = form.querySelector(
        '[type="submit"]'
      );

      button.disabled = true;

      feedback.textContent =
        "Cadastrando projeto...";

      try {
        const data = quickProjectData(
          input.value.trim()
        );

        const current = await api(
          "/api/admin/missions"
        );

        const existing = (
          Array.isArray(current.missions)
            ? current.missions
            : []
        ).some(m => {
          try {
            return (
              new URL(m.website).href ===
              data.website
            );
          } catch {
            return false;
          }
        });

        if (existing) {
          throw new Error(
            "Esse link já está cadastrado no portfólio."
          );
        }

        const result = await api(
          "/api/admin/missions",
          "POST",
          data
        );

        const projectId =
          result.mission?.id ||
          result.id;

        if (!projectId) {
          feedback.textContent =
            "Projeto cadastrado. A captura automática será processada pelo servidor.";

          notify("Projeto cadastrado!");

          form.reset();

          await refreshAll();

          navigate(
            "missions",
            false
          );

          return;
        }

        feedback.textContent =
          "Projeto cadastrado. Gerando captura do site...";

        try {
          await api(
            `/api/admin/missions/${projectId}/refresh-preview`,
            "POST"
          );

          feedback.textContent =
            "Projeto cadastrado e captura gerada com sucesso!";

          notify(
            "Projeto cadastrado e captura gerada!"
          );
        } catch (captureError) {
          feedback.textContent =
            "Projeto cadastrado, mas a captura não foi concluída: " +
            captureError.message;

          notify(
            "Projeto salvo. Verifique a captura.",
            true
          );
        }

        form.reset();

        await refreshAll();

        navigate(
          "missions",
          false
        );
      } catch (error) {
        feedback.textContent =
          error.message;

        notify(
          error.message,
          true
        );
      } finally {
        button.disabled = false;
      }
    }
  );
}

// ==========================================
// FORMULÁRIO COMPLETO
// ==========================================

function missionData() {
  const value = id =>
    $(id).value.trim();

  return {
    title: value("mission-title"),
    category: value("mission-category"),
    description: value("mission-description"),
    technologies: value("mission-technologies"),
    image: value("mission-image"),
    website: value("mission-website"),
    github: value("mission-github"),
    status: value("mission-status")
  };
}

function clearMissionForm() {
  $("mission-form").reset();

  editingId = null;

  $("mission-form")
    .querySelector('[type="submit"]')
    .textContent = "Salvar Missão";
}

function editMission(m) {
  editingId = m.id;

  const fields = {
    "mission-title": m.title,
    "mission-category": m.category,
    "mission-description": m.description,
    "mission-technologies": m.technologies,
    "mission-image": m.image,
    "mission-website": m.website,
    "mission-github": m.github,
    "mission-status": m.status
  };

  Object.entries(fields).forEach(
    ([id, value]) => {
      $(id).value = value || "";
    }
  );

  $("mission-form")
    .querySelector('[type="submit"]')
    .textContent = "Atualizar Missão";

  navigate(
    "new-mission",
    false
  );
}

function initMissionForm() {
  $("mission-form").addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const button =
        event.currentTarget.querySelector(
          '[type="submit"]'
        );

      button.disabled = true;

      try {
        const data = missionData();

        const editing =
          editingId !== null;

        await api(
          editing
            ? `/api/admin/missions/${editingId}`
            : "/api/admin/missions",

          editing
            ? "PUT"
            : "POST",

          data
        );

        clearMissionForm();

        await refreshAll();

        navigate(
          "missions",
          false
        );

        notify(
          editing
            ? "Projeto atualizado!"
            : "Projeto cadastrado!"
        );
      } catch (error) {
        notify(
          error.message,
          true
        );
      } finally {
        button.disabled = false;
      }
    }
  );
}

// ==========================================
// PUBLICAR / OCULTAR
// ==========================================

async function toggleMission(m) {
  try {
    await api(
      `/api/admin/missions/${m.id}`,
      "PUT",
      {
        title: m.title,
        category: m.category,
        description: m.description,
        technologies: m.technologies || "",
        image: m.image || "",
        website: m.website || "",
        github: m.github || "",
        status: isPublished(m)
          ? "draft"
          : "published"
      }
    );

    await refreshAll();

    notify(
      "Status atualizado!"
    );
  } catch (error) {
    notify(
      error.message,
      true
    );
  }
}

// ==========================================
// ATUALIZAR CAPTURA
// ==========================================

async function refreshPreview(m) {
  if (!m.website) {
    notify(
      "Cadastre o link do site primeiro.",
      true
    );

    return;
  }

  try {
    notify(
      "Gerando captura do site..."
    );

    await api(
      `/api/admin/missions/${m.id}/refresh-preview`,
      "POST"
    );

    await refreshAll();

    notify(
      "Captura atualizada!"
    );
  } catch (error) {
    notify(
      error.message,
      true
    );
  }
}

// ==========================================
// EXCLUIR PROJETO
// ==========================================

async function deleteMission(m) {
  if (
    !confirm(
      `Excluir "${m.title}"?`
    )
  ) {
    return;
  }

  try {
    await api(
      `/api/admin/missions/${m.id}`,
      "DELETE"
    );

    await refreshAll();

    notify(
      "Projeto excluído!"
    );
  } catch (error) {
    notify(
      error.message,
      true
    );
  }
}

// ==========================================
// CARREGAR MENSAGENS
// ==========================================

async function loadMessages() {
  const target = $("messages-list");

  if (!target) return;

  target.textContent =
    "Carregando...";

  try {
    const result = await api(
      "/api/admin/messages"
    );

    if (!Array.isArray(result.messages)) {
      throw new Error(
        "Resposta de mensagens inválida."
      );
    }

    messages = result.messages;

    renderMessages();
    renderMessageSummary();
  } catch (error) {
    target.textContent =
      error.message;
  }
}

// ==========================================
// RENDERIZAR MENSAGENS
// ==========================================

function renderMessages() {
  const target = $("messages-list");

  if (!target) return;

  target.replaceChildren();

  const refresh = actionButton(
    "Atualizar mensagens",
    loadMessages
  );

  target.append(refresh);

  if (!messages.length) {
    target.append(
      el(
        "p",
        "Nenhuma mensagem recebida."
      )
    );

    return;
  }

  const ordered = [...messages].sort(
    (a, b) =>
      (messageDate(b)?.getTime() ?? 0) -
      (messageDate(a)?.getTime() ?? 0)
  );

  ordered.forEach(m => {
    const card = el(
      "article",
      "",
      "message-card"
    );

    if (!messageIsRead(m)) {
      card.style.borderLeft =
        "3px solid #ff174c";
    }

    card.append(
      el(
        "h3",
        m.name || "Visitante"
      )
    );

    card.append(
      el(
        "small",
        `${m.subject || "Sem assunto"} · ${
          messageIsRead(m)
            ? "Lida"
            : "Não lida"
        }`
      )
    );

    if (messageDate(m)) {
      card.append(
        el(
          "small",
          `Recebida em ${formatDate(
            messageDate(m)
          )}`
        )
      );
    }

    if (m.email) {
      const email = el(
        "a",
        m.email
      );

      email.href =
        `mailto:${m.email}`;

      const container = el("p");

      container.append(email);

      card.append(container);
    }

    card.append(
      el(
        "p",
        m.message || ""
      )
    );

    const actions = el(
      "div",
      "",
      "asta-mission-actions"
    );

    actions.append(
      actionButton(
        messageIsRead(m)
          ? "Marcar não lida"
          : "Marcar como lida",
        () => markMessage(m)
      ),

      actionButton(
        "Excluir",
        () => deleteMessage(m)
      )
    );

    const phone = String(
      m.whatsapp ||
      m.phone ||
      m.telefone ||
      ""
    ).replace(/\D/g, "");

    const number =
      phone.length === 10 ||
      phone.length === 11
        ? `55${phone}`
        : phone;

    if (
      number.length >= 12 &&
      number.length <= 15
    ) {
      const link = el(
        "a",
        "Responder no WhatsApp",
        "small-red-button"
      );

      const text =
        `Olá! Aqui é da ASTA WEB STUDIO. ` +
        `Recebemos sua mensagem sobre ${
          m.subject || "seu projeto"
        }. Podemos conversar?`;

      link.href =
        `https://wa.me/${number}?text=${
          encodeURIComponent(text)
        }`;

      link.target = "_blank";

      link.rel =
        "noopener noreferrer";

      actions.append(link);
    }

    card.append(actions);
    target.append(card);
  });
}

// ==========================================
// MARCAR MENSAGEM COMO LIDA
// ==========================================

async function markMessage(m) {
  try {
    await api(
      `/api/admin/messages/${m.id}/read`,
      "PATCH",
      {
        is_read: !messageIsRead(m)
      }
    );

    await Promise.all([
      loadMessages(),
      loadOverview()
    ]);

    notify(
      "Mensagem atualizada!"
    );
  } catch (error) {
    notify(
      error.message,
      true
    );
  }
}

// ==========================================
// EXCLUIR MENSAGEM
// ==========================================

async function deleteMessage(m) {
  if (
    !confirm(
      "Excluir esta mensagem?"
    )
  ) {
    return;
  }

  try {
    await api(
      `/api/admin/messages/${m.id}`,
      "DELETE"
    );

    await Promise.all([
      loadMessages(),
      loadOverview()
    ]);

    notify(
      "Mensagem excluída!"
    );
  } catch (error) {
    notify(
      error.message,
      true
    );
  }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMessageDashboard();

    initAuth();
    initNavigation();

    initMissionForm();
    initQuickProjectForm();

    checkSession();
  }
);
