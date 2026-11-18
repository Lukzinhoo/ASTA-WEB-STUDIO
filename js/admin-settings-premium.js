
"use strict";

/* ==========================================
   ASTA WEB STUDIO
   CONFIGURAÇÕES — MINIMAL PREMIUM
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const view = document.getElementById("view-settings");

  const grid = view?.querySelector(".settings-grid");

  if (!view || !grid || grid.dataset.premiumReady) {
    return;
  }

  grid.dataset.premiumReady = "true";

  // CABEÇALHO

  const heading = view.querySelector(".page-heading");

  if (heading) {
    heading.classList.add("settings-premium-heading");

    const eyebrow = document.createElement("span");

    eyebrow.className = "settings-premium-eyebrow";
    eyebrow.textContent = "ASTA WEB STUDIO / MINHA CONTA";

    heading.querySelector("h1")?.before(eyebrow);
  }

  // SEÇÕES

  const sections = [
    {
      id: "profile",
      label: "Meu perfil",
      icon: "◉",
      subtitle: "Atualize sua foto e informações de identificação."
    },
    {
      id: "security",
      label: "Segurança",
      icon: "◇",
      subtitle: "Proteja sua conta e altere sua senha."
    },
    {
      id: "business",
      label: "Informações comerciais",
      icon: "▦",
      subtitle: "Gerencie os dados públicos do seu estúdio."
    },
    {
      id: "preferences",
      label: "Preferências",
      icon: "⚙",
      subtitle: "Personalize alertas e aparência do painel."
    }
  ];

  const cards = [...grid.children].filter(node =>
    node.classList.contains("panel-card")
  );

  if (cards.length !== sections.length) {
    return;
  }

  grid.classList.add("settings-premium-layout");

  // MENU INTERNO

  const nav = document.createElement("nav");

  nav.className = "settings-premium-nav";

  nav.setAttribute(
    "aria-label",
    "Seções das configurações"
  );

  const navTitle = document.createElement("span");

  navTitle.className = "settings-premium-nav-title";

  navTitle.textContent = "CONFIGURAÇÕES DA CONTA";

  nav.append(navTitle);

  // ÁREA PRINCIPAL

  const content = document.createElement("div");

  content.className = "settings-premium-content";

  const buttons = [];
  const panels = [];

  sections.forEach((section, index) => {

    const card = cards[index];

    // BOTÃO DE NAVEGAÇÃO

    const button = document.createElement("button");

    button.type = "button";

    button.className = "settings-premium-nav-item";

    button.dataset.tab = section.id;

    const icon = document.createElement("span");

    icon.className = "settings-premium-nav-icon";

    icon.setAttribute("aria-hidden", "true");

    icon.textContent = section.icon;

    const label = document.createElement("span");

    label.textContent = section.label;

    button.append(icon, label);

    nav.append(button);

    buttons.push(button);

    // PAINEL DA SEÇÃO

    card.classList.add("settings-premium-panel");

    card.dataset.tab = section.id;

    const h2 = card.querySelector("h2");

    if (h2) {
      const subtitle = document.createElement("p");

      subtitle.className = "settings-premium-subtitle";

      subtitle.textContent = section.subtitle;

      h2.after(subtitle);
    }

    const form = card.querySelector("form");

    if (form) {

      form.classList.add("settings-premium-form");

      // ORGANIZA CAMPOS E RÓTULOS

      const labels = [
        ...form.querySelectorAll(":scope > label")
      ];

      labels.forEach(label => {

        if (label.classList.contains("check-label")) {

          const row = document.createElement("div");

          row.className =
            "settings-premium-row settings-premium-checkbox-row";

          label.before(row);

          row.append(label);

          return;
        }

        const control = document.getElementById(
          label.htmlFor
        );

        if (!control || control.parentElement !== form) {
          return;
        }

        const row = document.createElement("div");

        row.className = "settings-premium-row";

        label.before(row);

        row.append(label, control);
      });

      // FOTO DE PERFIL

      const avatar = form.querySelector(
        ".settings-avatar-row"
      );

      if (avatar) {
        avatar.classList.add("settings-premium-avatar");
      }

      // BOTÃO DE SALVAR

      const submit = form.querySelector(
        'button[type="submit"]'
      );

      if (submit) {

        const footer = document.createElement("div");

        footer.className = "settings-premium-footer";

        submit.before(footer);

        const feedback = form.querySelector(
          '[role="status"]'
        );

        if (feedback) {
          footer.append(feedback);
        }

        footer.append(submit);
      }
    }

    content.append(card);

    panels.push(card);
  });

  // RODAPÉ DO MENU

  const footer = document.createElement("div");

  footer.className = "settings-premium-nav-footer";

  const footerTitle = document.createElement("span");

  footerTitle.textContent = "ASTA WEB STUDIO";

  const footerSubtitle = document.createElement("small");

  footerSubtitle.textContent =
    "Gerenciamento administrativo";

  footer.append(footerTitle, footerSubtitle);

  nav.append(footer);

  grid.append(nav, content);

  // NAVEGAÇÃO ENTRE AS SEÇÕES

  function activate(id) {

    buttons.forEach(button => {

      const selected = button.dataset.tab === id;

      button.classList.toggle("active", selected);

      if (selected) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    panels.forEach(panel => {
      panel.hidden = panel.dataset.tab !== id;
    });
  }

  buttons.forEach(button => {

    button.addEventListener("click", () => {
      activate(button.dataset.tab);
    });

  });

  // ABRE O PERFIL POR PADRÃO

  activate("profile");

});
