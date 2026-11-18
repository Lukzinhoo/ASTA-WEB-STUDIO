
"use strict";

// ==========================================
// ASTA WEB STUDIO
// CENTRAL DE ATENDIMENTO PREMIUM
// ==========================================

(() => {
  const state = {
    selectedId: null,
    filter: "all",
    query: "",
    detail: null,
    replies: [],
    busy: false,
    selectionToken: 0,
    cooldownUntil: 0
  };

  const MAX_REPLY = 5000;

  const byId = id => document.getElementById(id);

  function node(tag, className = "", value = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(value ?? "");
    return element;
  }

  function button(label, className, handler) {
    const element = node("button", className, label);
    element.type = "button";
    element.addEventListener("click", handler);
    return element;
  }

  function isRead(message) {
    return (
      message.is_read === true ||
      message.is_read === 1 ||
      message.is_read === "1"
    );
  }

  function replyCount(message) {
    return Number(message.reply_count || 0);
  }

  function formatMessageDate(value) {
    if (!value) return "—";

    let parsed;

    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ) {
      parsed = new Date(value.replace(" ", "T") + "Z");
    } else {
      parsed = new Date(value);
    }

    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  function getMessages() {
    return typeof messages !== "undefined" &&
      Array.isArray(messages)
      ? messages
      : [];
  }

  function request(url, method = "GET", data) {
    return api(url, method, data);
  }

  function showNotification(message, error = false) {
    if (typeof notify === "function") {
      notify(message, error);
    }
  }

  function getWhatsApp(message) {
    const digits = String(
      message.whatsapp ||
      message.phone ||
      message.telefone ||
      ""
    ).replace(/\D/g, "");

    const fullNumber =
      digits.length === 10 || digits.length === 11
        ? `55${digits}`
        : digits;

    return fullNumber.length >= 12 &&
      fullNumber.length <= 15
      ? fullNumber
      : "";
  }

  function filteredMessages() {
    const query = state.query.toLocaleLowerCase("pt-BR");

    return getMessages()
      .filter(message => {
        if (
          state.filter === "unread" &&
          isRead(message)
        ) return false;

        if (
          state.filter === "replied" &&
          !replyCount(message)
        ) return false;

        return [
          message.name,
          message.email,
          message.subject,
          message.message
        ].some(value =>
          String(value || "")
            .toLocaleLowerCase("pt-BR")
            .includes(query)
        );
      })
      .sort((a, b) => {
        const first = new Date(a.created_at || 0).getTime() || 0;
        const second = new Date(b.created_at || 0).getTime() || 0;
        return second - first;
      });
  }

  // ==========================================
  // RENDERIZAR CENTRAL
  // ==========================================

  function renderMessagesPremium() {
    const root = byId("messages-list");
    if (!root) return;

    root.replaceChildren();
    root.className = "support-center";

    const header = node("div", "support-header");
    const heading = node("div");

    heading.append(
      node("span", "support-eyebrow", "CENTRAL DE ATENDIMENTO"),
      node("h2", "", "Caixa de entrada"),
      node(
        "p",
        "",
        "Gerencie seus contatos e responda pelo painel."
      )
    );

    const refresh = button(
      "↻ Atualizar",
      "support-refresh",
      () => loadMessages()
    );

    header.append(heading, refresh);
    root.append(header);

    const summary = node("div", "support-summary");

    [
      ["Recebidas", getMessages().length],
      [
        "Não lidas",
        getMessages().filter(message => !isRead(message)).length
      ],
      [
        "Respondidas",
        getMessages().filter(message => replyCount(message) > 0).length
      ]
    ].forEach(([label, value]) => {
      const card = node("div", "support-summary-card");
      card.append(
        node("span", "", label),
        node("strong", "", value)
      );
      summary.append(card);
    });

    root.append(summary);

    const workspace = node("div", "support-workspace");
    const sidebar = node("aside", "support-inbox");
    const controls = node("div", "support-controls");

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Pesquisar cliente, assunto ou e-mail...";
    search.setAttribute("aria-label", "Pesquisar mensagens");
    search.value = state.query;

    search.addEventListener("input", () => {
      state.query = search.value;
      paintInbox(items);
    });

    controls.append(search);

    const filters = node("div", "support-filters");

    [
      ["all", "Todas"],
      ["unread", "Não lidas"],
      ["replied", "Respondidas"]
    ].forEach(([key, label]) => {
      const filterButton = button(
        label,
        `support-filter${state.filter === key ? " active" : ""}`,
        () => {
          state.filter = key;

          filters.querySelectorAll("button").forEach(item => {
            item.classList.remove("active");
          });

          filterButton.classList.add("active");
          paintInbox(items);
        }
      );

      filters.append(filterButton);
    });

    controls.append(filters);
    sidebar.append(controls);

    const items = node("div", "support-items");
    sidebar.append(items);

    const conversation = node("section", "support-conversation");
    conversation.id = "support-conversation";
    conversation.setAttribute("aria-live", "polite");

    workspace.append(sidebar, conversation);
    root.append(workspace);

    paintInbox(items);

    const selected = getMessages().some(
      message => String(message.id) === String(state.selectedId)
    );

    if (state.selectedId !== null && selected) {
      if (
        state.detail &&
        String(state.detail.id) === String(state.selectedId)
      ) {
        paintConversation(state.detail);
      } else {
        selectMessage(state.selectedId);
      }
    } else {
      state.selectedId = null;
      state.detail = null;
      state.replies = [];
      paintEmpty();
    }
  }

  // ==========================================
  // CAIXA DE ENTRADA
  // ==========================================

  function paintInbox(target) {
    if (!target) return;

    target.replaceChildren();

    const filtered = filteredMessages();

    if (!filtered.length) {
      target.append(
        node(
          "p",
          "support-no-results",
          "Nenhuma mensagem encontrada."
        )
      );
      return;
    }

    filtered.forEach(message => {
      const active =
        String(state.selectedId) === String(message.id);

      const item = button(
        "",
        `support-message${active ? " active" : ""}${
          isRead(message) ? "" : " unread"
        }`,
        () => selectMessage(message.id)
      );

      const upper = node("div", "support-message-upper");

      upper.append(
        node("strong", "", message.name || "Visitante"),
        node("small", "", formatMessageDate(message.created_at))
      );

      const subject = node(
        "div",
        "support-message-subject",
        message.subject || "Sem assunto"
      );

      const excerpt = node("p", "", message.message || "");

      const statusClass = replyCount(message)
        ? "replied"
        : isRead(message)
          ? "read"
          : "unread";

      const statusText = replyCount(message)
        ? "Respondida"
        : isRead(message)
          ? "Lida"
          : "Nova";

      const status = node(
        "span",
        `support-status ${statusClass}`,
        statusText
      );

      item.append(upper, subject, excerpt, status);
      target.append(item);
    });
  }

  // ==========================================
  // ESTADO VAZIO
  // ==========================================

  function paintEmpty(
    message = "Selecione uma mensagem para visualizar a conversa."
  ) {
    const target = byId("support-conversation");
    if (!target) return;

    target.replaceChildren();

    const empty = node("div", "support-empty");

    empty.append(
      node("div", "support-empty-icon", "✉"),
      node("h3", "", "Suas conversas"),
      node("p", "", message)
    );

    target.append(empty);
  }

  // ==========================================
  // ABRIR CONVERSA
  // ==========================================

  async function selectMessage(id) {
    if (state.busy) return;

    state.selectedId = id;
    state.detail = null;
    state.replies = [];

    const token = ++state.selectionToken;

    paintEmpty("Carregando conversa...");

    const itemList = byId("messages-list")
      ?.querySelector(".support-items");

    if (itemList) paintInbox(itemList);

    try {
      const result = await request(
        `/api/admin/messages/${encodeURIComponent(id)}`
      );

      if (
        token !== state.selectionToken ||
        String(state.selectedId) !== String(id)
      ) return;

      const detail = result.message || result;

      if (!detail || !detail.id) {
        throw new Error("Não foi possível abrir a mensagem.");
      }

      state.detail = detail;
      state.replies = Array.isArray(result.replies)
        ? result.replies
        : [];

      paintConversation(detail);

      if (!isRead(detail)) {
        await request(
          `/api/admin/messages/${encodeURIComponent(id)}/read`,
          "PATCH",
          { is_read: true }
        );

        const local = getMessages().find(
          message => String(message.id) === String(id)
        );

        if (local) local.is_read = 1;
        detail.is_read = 1;

        if (itemList) paintInbox(itemList);

        if (typeof renderMessageSummary === "function") {
          renderMessageSummary();
        }

        if (typeof loadOverview === "function") {
          loadOverview();
        }
      }
    } catch (error) {
      if (
        token === state.selectionToken &&
        String(state.selectedId) === String(id)
      ) {
        if (!state.detail) paintEmpty(error.message);
        showNotification(error.message, true);
      }
    }
  }

  // ==========================================
  // CONVERSA
  // ==========================================

  function paintConversation(message) {
    const target = byId("support-conversation");
    if (!target) return;

    target.replaceChildren();

    const header = node("div", "support-conversation-header");
    const person = node("div", "support-person");

    const avatar = node(
      "div",
      "support-avatar",
      (message.name || "V").charAt(0).toUpperCase()
    );

    const info = node("div");

    info.append(
      node("h3", "", message.name || "Visitante"),
      node(
        "span",
        "",
        message.email || "E-mail não informado"
      )
    );

    person.append(avatar, info);
    header.append(person);

    const actions = node("div", "support-actions");
    const phone = getWhatsApp(message);

    if (phone) {
      const link = node("a", "support-whatsapp", "WhatsApp ↗");

      const greeting =
        `Olá, ${message.name || "tudo bem"}! ` +
        "Aqui é da ASTA WEB STUDIO.";

      link.href =
        `https://wa.me/${phone}?text=` +
        encodeURIComponent(greeting);

      link.target = "_blank";
      link.rel = "noopener noreferrer";

      actions.append(link);
    }

    actions.append(
      button(
        "Excluir",
        "support-delete",
        () => removeMessage(message)
      )
    );

    header.append(actions);
    target.append(header);

    const thread = node("div", "support-thread");

    thread.append(
      node(
        "div",
        "support-thread-label",
        message.subject || "Contato pelo site"
      )
    );

    const original = node(
      "article",
      "support-bubble incoming"
    );

    original.append(
      node("strong", "", message.name || "Visitante"),
      node("p", "", message.message || ""),
      node(
        "small",
        "",
        formatMessageDate(message.created_at)
      )
    );

    thread.append(original);

    state.replies.forEach(reply => {
      const bubble = node(
        "article",
        "support-bubble outgoing"
      );

      bubble.append(
        node("strong", "", "ASTA WEB STUDIO"),
        node(
          "p",
          "",
          reply.reply ||
          reply.message ||
          reply.body ||
          ""
        ),
        node(
          "small",
          "",
          formatMessageDate(
            reply.sent_at || reply.created_at
          )
        )
      );

      thread.append(bubble);
    });

    target.append(thread);

    // ========================================
    // FORMULÁRIO DE RESPOSTA
    // ========================================

    const form = node("form", "support-reply-form");

    const label = node(
      "label",
      "",
      "Responder por e-mail"
    );

    label.htmlFor = "support-reply-text";

    const textarea = document.createElement("textarea");

    textarea.id = "support-reply-text";
    textarea.placeholder =
      "Escreva sua resposta ao cliente...";

    textarea.required = true;
    textarea.maxLength = MAX_REPLY;
    textarea.rows = 4;

    const footer = node("div", "support-reply-footer");

    const information = node(
      "small",
      "",
      `Destino: ${message.email || "não informado"}`
    );

    const counter = node(
      "small",
      "support-character-count",
      `0 / ${MAX_REPLY} caracteres`
    );

    const send = document.createElement("button");
    send.type = "submit";
    send.className = "support-send";
    send.textContent = "Enviar resposta ↗";
    send.disabled = !message.email;

    textarea.addEventListener("input", () => {
      counter.textContent =
        `${textarea.value.length} / ${MAX_REPLY} caracteres`;
    });

    footer.append(information, counter, send);
    form.append(label, textarea, footer);

    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (state.busy || !message.email) return;

      const responseText = textarea.value.trim();

      if (
        !responseText ||
        responseText.length > MAX_REPLY
      ) {
        showNotification(
          "Escreva uma resposta de até 5000 caracteres.",
          true
        );
        return;
      }

      if (Date.now() < state.cooldownUntil) {
        const seconds = Math.ceil(
          (state.cooldownUntil - Date.now()) / 1000
        );

        showNotification(
          `Aguarde aproximadamente ${seconds} segundos para tentar novamente.`,
          true
        );
        return;
      }

      state.busy = true;
      send.disabled = true;
      send.textContent = "Enviando...";

      try {
        // O servidor espera o campo reply.
        const result = await request(
          `/api/admin/messages/${encodeURIComponent(message.id)}/reply`,
          "POST",
          { reply: responseText }
        );

        if (result?.success === false) {
          throw new Error(
            result.error || "Não foi possível enviar a resposta."
          );
        }

        showNotification(
          "Resposta enviada ao cliente!"
        );

        textarea.value = "";
        counter.textContent = `0 / ${MAX_REPLY} caracteres`;

        // Atualizar o histórico.
        state.detail = null;

        await loadMessages();

        if (
          String(state.selectedId) ===
          String(message.id)
        ) {
          await selectMessage(message.id);
        }
      } catch (error) {
        const text = String(error.message || "");

        if (
          text.includes("429") ||
          /too many requests|limite temporário/i.test(text)
        ) {
          // Valor de segurança quando a função api()
          // não disponibiliza o cabeçalho Retry-After.
          state.cooldownUntil = Date.now() + 60 * 1000;

          showNotification(
            "Limite de tentativas atingido. Aguarde o prazo informado pelo servidor antes de reenviar.",
            true
          );
        } else {
          showNotification(
            text || "Erro ao enviar a resposta.",
            true
          );
        }
      } finally {
        state.busy = false;
        send.disabled = !message.email;
        send.textContent = "Enviar resposta ↗";
      }
    });

    target.append(form);
    thread.scrollTop = thread.scrollHeight;
  }

  // ==========================================
  // EXCLUIR MENSAGEM
  // ==========================================

  async function removeMessage(message) {
    if (state.busy) return;

    const confirmed = confirm(
      `Excluir a mensagem de ${message.name || "Visitante"}?`
    );

    if (!confirmed) return;

    state.busy = true;

    try {
      await request(
        `/api/admin/messages/${encodeURIComponent(message.id)}`,
        "DELETE"
      );

      state.selectedId = null;
      state.detail = null;
      state.replies = [];
      state.selectionToken++;

      await loadMessages();

      if (typeof loadOverview === "function") {
        await loadOverview();
      }

      showNotification("Mensagem excluída.");
    } catch (error) {
      showNotification(error.message, true);
    } finally {
      state.busy = false;
    }
  }

  // ==========================================
  // INTEGRAÇÃO COM ADMIN.JS
  // ==========================================

  window.renderMessages = renderMessagesPremium;
})();
