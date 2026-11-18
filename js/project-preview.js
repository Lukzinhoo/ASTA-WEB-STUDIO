
"use strict";

// ==========================================
// ASTA WEB STUDIO — VISUALIZAÇÃO AMPLIADA
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const projectsList = document.getElementById("missions-list");

  if (!projectsList) return;

  // Criar janela de visualização
  const modal = document.createElement("div");
  modal.id = "project-preview-modal";
  modal.className = "project-preview-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="project-preview-overlay"></div>

    <div
      class="project-preview-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-preview-title"
      tabindex="-1"
    >
      <div class="project-preview-header">
        <div>
          <span class="project-preview-label">
            ASTA WEB STUDIO / PRÉVIA
          </span>
          <h2 id="project-preview-title">Projeto</h2>
        </div>

        <button
          type="button"
          class="project-preview-close"
          aria-label="Fechar visualização"
        >
          &times;
        </button>
      </div>

      <div class="project-preview-image-container">
        <img
          id="project-preview-image"
          alt="Captura ampliada do projeto"
        >
      </div>

      <div class="project-preview-footer">
        <span>Captura do website</span>

        <a
          id="project-preview-visit"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visitar projeto ↗
        </a>
      </div>
    </div>
  `;

  document.body.append(modal);

  const dialog = modal.querySelector(
    ".project-preview-dialog"
  );

  const image = document.getElementById(
    "project-preview-image"
  );

  const title = document.getElementById(
    "project-preview-title"
  );

  const visit = document.getElementById(
    "project-preview-visit"
  );

  const closeButton = modal.querySelector(
    ".project-preview-close"
  );

  let previousFocus = null;

  function openPreview(card) {
    const cardImage = card.querySelector("img");

    if (!cardImage || !cardImage.getAttribute("src")) {
      return;
    }

    const projectTitle =
      card.querySelector("h3")?.textContent?.trim() ||
      "Projeto";

    const projectLink = Array.from(
      card.querySelectorAll("a")
    ).find(link => {
      try {
        const url = new URL(link.href);

        return (
          url.protocol === "https:" ||
          url.protocol === "http:"
        );
      } catch {
        return false;
      }
    });

    previousFocus = document.activeElement;

    title.textContent = projectTitle;
    image.src = cardImage.src;
    image.alt = `Captura ampliada de ${projectTitle}`;

    if (projectLink) {
      visit.href = projectLink.href;
      visit.hidden = false;
    } else {
      visit.removeAttribute("href");
      visit.hidden = true;
    }

    modal.hidden = false;
    document.body.classList.add(
      "project-preview-open"
    );

    dialog.focus();
  }

  function closePreview() {
    if (modal.hidden) return;

    modal.hidden = true;

    document.body.classList.remove(
      "project-preview-open"
    );

    image.removeAttribute("src");

    if (
      previousFocus &&
      previousFocus.isConnected
    ) {
      previousFocus.focus();
    }
  }

  // Funciona mesmo quando o admin.js
  // recria os cartões após atualizar projetos.
  projectsList.addEventListener("click", event => {
    const cardImage = event.target.closest(
      ".asta-mission-card > img"
    );

    if (!cardImage) return;

    const card = cardImage.closest(
      ".asta-mission-card"
    );

    if (card) openPreview(card);
  });

  projectsList.addEventListener("keydown", event => {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    const cardImage = event.target.closest(
      ".asta-mission-card > img"
    );

    if (!cardImage) return;

    event.preventDefault();

    const card = cardImage.closest(
      ".asta-mission-card"
    );

    if (card) openPreview(card);
  });

  // Permitir acesso pelo teclado
  function prepareImages() {
    projectsList
      .querySelectorAll(".asta-mission-card > img")
      .forEach(img => {
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute(
          "aria-label",
          "Ampliar captura do projeto"
        );
      });
  }

  const observer = new MutationObserver(
    prepareImages
  );

  observer.observe(projectsList, {
    childList: true,
    subtree: true
  });

  prepareImages();

  closeButton.addEventListener(
    "click",
    closePreview
  );

  modal.querySelector(
    ".project-preview-overlay"
  ).addEventListener(
    "click",
    closePreview
  );

  document.addEventListener("keydown", event => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      closePreview();
    }

    if (event.key === "Tab") {
      const focusable = Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), a[href]:not([hidden])'
        )
      ).filter(node => node.getClientRects().length);

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
         document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  });
});
