
"use strict";

// ASTA WEB STUDIO
// Upload de imagens para as missões do QG.

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("mission-form");
  const campoImagem = document.getElementById("mission-image");

  if (!formulario || !campoImagem) return;

  // Permite imagens hospedadas e arquivos locais enviados.
  campoImagem.type = "text";
  campoImagem.placeholder =
    "URL da imagem ou /assets/uploads/imagem.png";

  const grupo = campoImagem.closest(".form-group");
  if (!grupo) return;

  const seletor = document.createElement("input");
  seletor.type = "file";
  seletor.accept = "image/png,image/jpeg,image/webp";
  seletor.id = "mission-image-file";

  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = "Enviar imagem";
  botao.className = "small-red-button";

  const mensagem = document.createElement("p");
  mensagem.setAttribute("role", "status");
  mensagem.style.marginTop = "10px";

  const previa = document.createElement("img");
  previa.alt = "Prévia da imagem do projeto";
  previa.style.cssText = `
    display: none;
    width: 100%;
    max-width: 340px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    margin-top: 14px;
    border-radius: 10px;
    border: 1px solid #49313b;
  `;

  grupo.append(seletor, botao, mensagem, previa);

  function atualizarPrevia() {
    const valor = campoImagem.value.trim();

    if (!valor) {
      previa.removeAttribute("src");
      previa.style.display = "none";
      return;
    }

    let url;

    try {
      url = new URL(valor, window.location.origin);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("URL inválida");
      }
    } catch {
      previa.removeAttribute("src");
      previa.style.display = "none";
      return;
    }

    previa.src = url.href;
    previa.style.display = "block";
  }

  campoImagem.addEventListener("input", atualizarPrevia);

  previa.addEventListener("error", () => {
    previa.style.display = "none";
  });

  // Atualiza a prévia ao abrir uma missão para edição.
  const observador = new MutationObserver(() => {
    if (!document.getElementById("view-new-mission").hidden) {
      atualizarPrevia();
    }
  });

  observador.observe(
    document.getElementById("view-new-mission"),
    { attributes: true, attributeFilter: ["hidden"] }
  );

  botao.addEventListener("click", async () => {
    const arquivo = seletor.files?.[0];

    if (!arquivo) {
      mensagem.textContent = "Selecione uma imagem primeiro.";
      mensagem.style.color = "#ff5364";
      return;
    }

    const formatos = ["image/png", "image/jpeg", "image/webp"];

    if (!formatos.includes(arquivo.type)) {
      mensagem.textContent = "Use PNG, JPG ou WebP.";
      mensagem.style.color = "#ff5364";
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      mensagem.textContent = "A imagem deve ter até 5 MB.";
      mensagem.style.color = "#ff5364";
      return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando...";
    mensagem.textContent = "";

    try {
      const resposta = await fetch("/api/admin/upload-image", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": arquivo.type
        },
        body: arquivo
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.error || `Erro no upload (${resposta.status}).`
        );
      }

      if (!dados.image) {
        throw new Error("O servidor não retornou a imagem.");
      }

      campoImagem.value = dados.image;
      campoImagem.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      mensagem.textContent = "Imagem enviada com sucesso!";
      mensagem.style.color = "#3ddc84";
      seletor.value = "";
    } catch (erro) {
      mensagem.textContent = erro.message;
      mensagem.style.color = "#ff5364";
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar imagem";
    }
  });

  formulario.addEventListener("reset", () => {
    seletor.value = "";
    mensagem.textContent = "";

    setTimeout(atualizarPrevia, 0);
  });
});
