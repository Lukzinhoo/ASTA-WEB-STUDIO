
"use strict";

/* ==========================================
   ASTA WEB STUDIO
   LINKS PARA DETALHES DOS PROJETOS

   CORREÇÃO:
   /assets/projeto.html
   alterado para
   /projeto.html
========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const grade = document.getElementById("projects-grid");

  if (!grade) return;

  let projetos = [];
  let agendado = false;

  /* ==========================================
     NORMALIZAR URL
  ========================================== */

  function urlNormalizada(valor) {
    try {
      return new URL(valor, location.origin).href;
    } catch {
      return "";
    }
  }

  /* ==========================================
     ADICIONAR BOTÕES DE DETALHES
  ========================================== */

  function atualizarLinks() {

    agendado = false;

    const cartoes = grade.querySelectorAll(
      ".asta-project-card"
    );

    for (const cartao of cartoes) {

      // Evita criar botões duplicados.
      if (cartao.querySelector(".asta-details-link")) {
        continue;
      }

      const titulo = cartao
        .querySelector(".asta-project-title")
        ?.textContent?.trim();

      const links = cartao.querySelector(
        ".asta-project-links"
      );

      if (!titulo || !links) continue;

      const site = cartao.querySelector(
        "a.project-link.primary"
      )?.href || "";

      const candidatos = projetos.filter((projeto) => {

        return (
          projeto.title === titulo &&
          (
            !site ||
            urlNormalizada(projeto.website) === site
          )
        );

      });

      // Evita associar projetos errados
      // quando existem títulos duplicados.
      if (candidatos.length !== 1) {
        continue;
      }

      const projeto = candidatos[0];

      /* ======================================
         CRIAR BOTÃO
      ====================================== */

      const link = document.createElement("a");

      link.className =
        "project-link asta-details-link";

      /* ======================================
         ENDEREÇO CORRIGIDO
      ====================================== */

      link.href =
        `/projeto.html?id=${encodeURIComponent(projeto.id)}`;

      link.textContent = "Ver detalhes →";

      link.setAttribute(
        "aria-label",
        `Ver detalhes de ${titulo}`
      );

      links.appendChild(link);
    }
  }

  /* ==========================================
     AGENDAR ATUALIZAÇÃO
  ========================================== */

  function agendar() {

    if (agendado) return;

    agendado = true;

    requestAnimationFrame(atualizarLinks);
  }

  /* ==========================================
     OBSERVAR PROJETOS CARREGADOS
  ========================================== */

  const observador = new MutationObserver(agendar);

  observador.observe(grade, {
    childList: true,
    subtree: true
  });

  /* ==========================================
     CARREGAR PROJETOS DO BANCO
  ========================================== */

  async function carregar() {

    try {

      const resposta = await fetch("/api/missions", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(
          "Não foi possível consultar os projetos."
        );
      }

      const dados = await resposta.json();

      projetos = Array.isArray(dados.missions)
        ? dados.missions
        : [];

      agendar();

    } catch (erro) {

      console.error(
        "ASTA WEB STUDIO - Links de detalhes:",
        erro
      );

    }
  }

  /* ==========================================
     CARREGAMENTO INICIAL
  ========================================== */

  carregar();

  /* ==========================================
     ATUALIZAÇÃO AO VOLTAR PARA A PÁGINA
  ========================================== */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (!document.hidden) {
        carregar();
      }

    }
  );

});

/* ==========================================
   FIM — ASTA WEB STUDIO
========================================== */
