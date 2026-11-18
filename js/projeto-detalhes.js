
/* ==========================================
   ASTA WEB STUDIO
   DETALHES DO PROJETO — VERSÃO 2
========================================== */

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", iniciar);

  function $(id) {
    return document.getElementById(id);
  }

  function texto(id, valor) {
    const elemento = $(id);

    if (elemento) {
      elemento.textContent = valor;
    }
  }

  function urlSegura(valor) {
    if (typeof valor !== "string") {
      return "";
    }

    try {
      const url = new URL(valor.trim());

      if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
      ) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function imagemSegura(valor) {
    if (typeof valor !== "string") {
      return "";
    }

    if (
      /^\/assets\/uploads\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(valor)
    ) {
      return valor;
    }

    return urlSegura(valor);
  }

  function configurarLink(id, idVazio, valor) {
    const link = $(id);
    const vazio = $(idVazio);
    const endereco = urlSegura(valor);

    if (!link) return;

    if (endereco) {
      link.href = endereco;
      link.hidden = false;

      if (vazio) {
        vazio.hidden = true;
      }
    } else {
      link.hidden = true;

      if (vazio) {
        vazio.hidden = false;
      }
    }
  }

  function formatarData(valor) {
    if (!valor) {
      return "Não informada";
    }

    // O SQLite pode devolver:
    // 2026-11-16 20:30:00
    const correspondencia = String(valor).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (correspondencia) {
      const [, ano, mes, dia] = correspondencia;

      return `${dia}/${mes}/${ano}`;
    }

    return "Não informada";
  }

  function mostrarErro(mensagem) {
    $("detail").hidden = true;
    $("feedback").hidden = false;
    $("feedback").textContent = mensagem;
  }

  function montarTecnologias(valor) {
    const area = $("technologies");
    area.replaceChildren();

    const tecnologias = String(valor || "")
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(Boolean);

    if (tecnologias.length === 0) {
      const tag = document.createElement("span");
      tag.className = "tech-tag";
      tag.textContent = "Não informadas";
      area.appendChild(tag);
      return;
    }

    for (const tecnologia of tecnologias) {
      const tag = document.createElement("span");
      tag.className = "tech-tag";
      tag.textContent = tecnologia;
      area.appendChild(tag);
    }
  }

  // ==========================================
  // GALERIA DE IMAGENS
  // ==========================================

  function montarGaleria(projeto) {
    const area = $("gallery-content");
    const miniaturas = $("gallery-thumbnails");
    const anterior = $("gallery-prev");
    const proxima = $("gallery-next");

    const imagens = [];
    const imagemPrincipal = imagemSegura(projeto.image);

    if (imagemPrincipal) {
      imagens.push(imagemPrincipal);
    }

    // Suporte para futuras galerias.
    // Só utiliza imagens realmente fornecidas pela API.
    if (Array.isArray(projeto.images)) {
      for (const valor of projeto.images) {
        const endereco = imagemSegura(valor);

        if (endereco && !imagens.includes(endereco)) {
          imagens.push(endereco);
        }
      }
    }

    area.replaceChildren();
    miniaturas.replaceChildren();

    if (imagens.length === 0) {
      const aviso = document.createElement("p");
      aviso.className = "gallery-empty";
      aviso.textContent = "Este projeto ainda não possui uma captura disponível.";
      area.appendChild(aviso);

      anterior.hidden = true;
      proxima.hidden = true;
      miniaturas.hidden = true;
      return;
    }

    let indiceAtual = 0;

    const imagem = document.createElement("img");
    imagem.alt = `Captura do projeto ${projeto.title}`;
    imagem.decoding = "async";

    const fallback = document.createElement("p");
    fallback.className = "gallery-empty";
    fallback.textContent = "Não foi possível carregar a captura.";
    fallback.hidden = true;

    imagem.addEventListener("error", () => {
      imagem.hidden = true;
      fallback.hidden = false;
    });

    imagem.addEventListener("load", () => {
      imagem.hidden = false;
      fallback.hidden = true;
    });

    area.append(imagem, fallback);

    const botoes = [];

    function mostrarImagem(indice) {
      indiceAtual =
        (indice + imagens.length) % imagens.length;

      fallback.hidden = true;
      imagem.hidden = false;
      imagem.src = imagens[indiceAtual];

      area.scrollTop = 0;

      botoes.forEach((botao, posicao) => {
        const ativo = posicao === indiceAtual;
        botao.classList.toggle("active", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
      });
    }

    if (imagens.length > 1) {
      anterior.hidden = false;
      proxima.hidden = false;
      miniaturas.hidden = false;

      imagens.forEach((endereco, indice) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "gallery-thumb";
        botao.setAttribute(
          "aria-label",
          `Mostrar imagem ${indice + 1}`
        );

        const miniatura = document.createElement("img");
        miniatura.src = endereco;
        miniatura.alt = "";
        miniatura.loading = "lazy";

        botao.appendChild(miniatura);

        botao.addEventListener("click", () => {
          mostrarImagem(indice);
        });

        botoes.push(botao);
        miniaturas.appendChild(botao);
      });

      anterior.addEventListener("click", () => {
        mostrarImagem(indiceAtual - 1);
      });

      proxima.addEventListener("click", () => {
        mostrarImagem(indiceAtual + 1);
      });
    } else {
      anterior.hidden = true;
      proxima.hidden = true;
      miniaturas.hidden = true;
    }

    mostrarImagem(0);
  }

  // ==========================================
  // PREENCHER PÁGINA
  // ==========================================

  function preencherProjeto(projeto) {
    const categorias = {
      web: "Website",
      sistemas: "Sistema",
      gamer: "Gamer"
    };

    const titulo = projeto.title || "Projeto sem título";
    const categoria =
      categorias[projeto.category] || "Projeto digital";

    const descricao =
      projeto.description ||
      "Projeto desenvolvido pela ASTA WEB STUDIO.";

    texto("title", titulo);
    texto("category", categoria);
    texto("category-info", categoria);
    texto("description", descricao);
    texto("long-description", descricao);
    texto("date", formatarData(projeto.created_at));

    document.title = `${titulo} | ASTA WEB STUDIO`;

    const site = urlSegura(projeto.website);

    if (site) {
      texto("domain", new URL(site).hostname);
    } else {
      texto("domain", "Prévia do projeto");
    }

    configurarLink(
      "website",
      "website-empty",
      projeto.website
    );

    configurarLink(
      "github",
      "github-empty",
      projeto.github
    );

    montarTecnologias(projeto.technologies);
    montarGaleria(projeto);

    $("feedback").hidden = true;
    $("detail").hidden = false;
  }

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================

  async function iniciar() {
    texto("year", new Date().getFullYear());

    const parametros = new URLSearchParams(
      window.location.search
    );

    const idTexto = parametros.get("id");
    const id = Number(idTexto);

    if (
      !idTexto ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      mostrarErro(
        "Projeto inválido. Volte ao portfólio e escolha um projeto."
      );
      return;
    }

    try {
      const resposta = await fetch("/api/missions", {
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(
          `Erro ao consultar projetos: ${resposta.status}`
        );
      }

      const dados = await resposta.json();

      if (!Array.isArray(dados.missions)) {
        throw new Error("Formato de resposta inválido.");
      }

      const projeto = dados.missions.find(
        item => Number(item.id) === id
      );

      if (!projeto) {
        mostrarErro(
          "Este projeto não foi encontrado ou não está publicado."
        );
        return;
      }

      preencherProjeto(projeto);

    } catch (erro) {
      console.error(
        "[ASTA] Erro ao carregar projeto:",
        erro
      );

      mostrarErro(
        "Não foi possível carregar o projeto. Verifique se o servidor está ligado na porta 3000."
      );
    }
  }
})();
