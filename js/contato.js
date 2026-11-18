
"use strict";

// ==========================================
// ASTA WEB STUDIO
// FORMULÁRIO DE CONTATO + WHATSAPP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("contact-feedback");

  if (!form || !feedback) return;

  const button = form.querySelector('button[type="submit"]');
  const whatsappInput = form.querySelector(
    'input[name="whatsapp"]'
  );

  let sending = false;

  // ==========================================
  // FORMATAR WHATSAPP
  // ==========================================

  function formatarWhatsapp(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);

    if (numeros.length <= 2) {
      return numeros;
    }

    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    if (numeros.length <= 10) {
      return (
        `(${numeros.slice(0, 2)}) ` +
        `${numeros.slice(2, 6)}-${numeros.slice(6)}`
      );
    }

    return (
      `(${numeros.slice(0, 2)}) ` +
      `${numeros.slice(2, 7)}-${numeros.slice(7)}`
    );
  }

  if (whatsappInput) {
    whatsappInput.addEventListener("input", () => {
      whatsappInput.value = formatarWhatsapp(
        whatsappInput.value
      );
    });
  }

  // ==========================================
  // MENSAGENS DE STATUS
  // ==========================================

  function mostrarFeedback(mensagem, estado) {
    feedback.textContent = mensagem;
    feedback.dataset.state = estado;
  }

  // ==========================================
  // ENVIAR FORMULÁRIO
  // ==========================================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (sending) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(
      new FormData(form).entries()
    );

    for (const key of Object.keys(data)) {
      data[key] = String(data[key]).trim();
    }

    // ==========================================
    // VALIDAR CAMPOS
    // ==========================================

    const camposObrigatorios = [
      "name",
      "email",
      "whatsapp",
      "subject",
      "message"
    ];

    const campoVazio = camposObrigatorios.some(
      (campo) => !data[campo]
    );

    if (campoVazio) {
      mostrarFeedback(
        "Preencha todos os campos obrigatórios.",
        "error"
      );
      return;
    }

    // ==========================================
    // VALIDAR WHATSAPP
    // ==========================================

    const numeroWhatsapp = data.whatsapp.replace(/\D/g, "");

    if (
      numeroWhatsapp.length !== 10 &&
      numeroWhatsapp.length !== 11
    ) {
      mostrarFeedback(
        "Informe um WhatsApp válido com DDD.",
        "error"
      );

      whatsappInput?.focus();
      return;
    }

    // Salvar telefone no formato internacional.
    // Exemplo: 5581999999999
    data.whatsapp = `55${numeroWhatsapp}`;

    // ==========================================
    // INICIAR ENVIO
    // ==========================================

    sending = true;
    button.disabled = true;
    button.textContent = "Enviando...";

    mostrarFeedback(
      "Enviando sua mensagem...",
      "pending"
    );

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          (
            response.status === 404
              ? "O servidor ainda não possui a rota de mensagens."
              : "Não foi possível enviar sua mensagem."
          )
        );
      }

      // ==========================================
      // SUCESSO
      // ==========================================

      mostrarFeedback(
        "Mensagem enviada com sucesso! Entraremos em contato pelo WhatsApp ou e-mail.",
        "success"
      );

      form.reset();

    } catch (error) {
      mostrarFeedback(
        error.message || "Erro ao enviar mensagem.",
        "error"
      );

    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = "✉ Enviar mensagem →";
    }
  });
});
