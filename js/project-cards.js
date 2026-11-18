
"use strict";

// ASTA WEB STUDIO — PROJECT CARDS

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("missions-list");
  const section = document.getElementById("view-missions");

  if (!list || !section) return;

  const toolbar = document.createElement("div");
  toolbar.className = "project-toolbar";

  const search = document.createElement("input");
  search.className = "project-search";
  search.type = "search";
  search.placeholder = "Buscar projetos...";
  search.setAttribute("aria-label", "Buscar projetos");

  const filter = document.createElement("select");
  filter.className = "project-filter";
  filter.setAttribute("aria-label", "Filtrar projetos");

  [
    ["all", "Todos os projetos"],
    ["published", "Publicados"],
    ["draft", "Rascunhos"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filter.append(option);
  });

  const count = document.createElement("span");
  count.className = "project-count";
  count.setAttribute("aria-live", "polite");

  toolbar.append(search, filter, count);

  const panel = list.parentElement;
  panel.parentElement.insertBefore(toolbar, panel);

  const empty = document.createElement("p");
  empty.className = "project-empty";
  empty.textContent = "Nenhum projeto encontrado.";
  empty.hidden = true;

  list.after(empty);

  function updateCards() {
    const cards = Array.from(
      list.querySelectorAll(".asta-mission-card")
    );

    const term = search.value
      .trim()
      .toLocaleLowerCase("pt-BR");

    let visible = 0;

    cards.forEach(card => {
      const title = card.querySelector("h3")
        ?.textContent
        ?.toLocaleLowerCase("pt-BR") || "";

      const description = card.querySelector("p")
        ?.textContent
        ?.toLocaleLowerCase("pt-BR") || "";

      const published = Boolean(
        card.querySelector(".status-pill.published")
      );

      const matchesText =
        title.includes(term) ||
        description.includes(term);

      const matchesStatus =
        filter.value === "all" ||
        (filter.value === "published" && published) ||
        (filter.value === "draft" && !published);

      const show = matchesText && matchesStatus;

      card.hidden = !show;

      if (show) visible++;
    });

    empty.hidden = cards.length === 0 || visible > 0;

    count.textContent =
      `${visible} de ${cards.length} projeto(s) exibido(s)`;
  }

  search.addEventListener("input", updateCards);
  filter.addEventListener("change", updateCards);

  // Atualiza os filtros quando o admin.js
  // recriar a lista após salvar ou excluir.
  const observer = new MutationObserver(updateCards);

  observer.observe(list, {
    childList: true
  });

  updateCards();
});
