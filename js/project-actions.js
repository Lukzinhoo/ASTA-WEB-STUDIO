
"use strict";

// ==========================================
// ASTA WEB STUDIO — MENU DE AÇÕES
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("missions-list");

  if (!list) return;

  function closeMenus(except = null) {
    list.querySelectorAll(".project-actions-menu").forEach(menu => {
      if (menu === except) return;

      menu.hidden = true;

      const button = menu.parentElement.querySelector(
        ".project-actions-toggle"
      );

      if (button) {
        button.setAttribute("aria-expanded", "false");
      }
    });
  }

  function prepareCard(card) {
    const actions = card.querySelector(
      ".asta-mission-actions"
    );

    if (!actions) return;

    if (actions.dataset.menuReady === "true") {
      return;
    }

    actions.dataset.menuReady = "true";
    actions.classList.add("project-actions-enhanced");

    const wrapper = document.createElement("div");
    wrapper.className = "project-actions-wrapper";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "project-actions-toggle";
    toggle.textContent = "⋮";
    toggle.setAttribute(
      "aria-label",
      "Abrir ações do projeto"
    );
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-haspopup", "true");

    const menu = document.createElement("div");
    menu.className = "project-actions-menu";
    menu.hidden = true;

    const buttons = Array.from(
      actions.querySelectorAll("button")
    );

    buttons.forEach(button => {
      button.classList.add("project-menu-item");

      const label = button.textContent.trim().toLowerCase();

      if (label.includes("excluir")) {
        button.classList.add("project-menu-danger");
      }

      menu.append(button);
    });

    wrapper.append(toggle, menu);

    actions.append(wrapper);

    toggle.addEventListener("click", event => {
      event.stopPropagation();

      const willOpen = menu.hidden;

      closeMenus();

      menu.hidden = !willOpen;

      toggle.setAttribute(
        "aria-expanded",
        String(willOpen)
      );
    });

    menu.addEventListener("click", event => {
      const button = event.target.closest("button");

      if (!button) return;

      closeMenus();
    });
  }

  function prepareCards() {
    list.querySelectorAll(".asta-mission-card").forEach(
      prepareCard
    );
  }

  // Funciona após o admin.js recriar os cartões.
  const observer = new MutationObserver(prepareCards);

  observer.observe(list, {
    childList: true
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".project-actions-wrapper")) {
      closeMenus();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenus();
    }
  });

  prepareCards();
});
