
"use strict";

// ==========================================
// ASTA WEB STUDIO
// CENTRAL DE ATENDIMENTO PREMIUM
// ==========================================

const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

function configurarMensagens(app, db, exigirAdmin) {
  // ========================================
  // BANCO DE DADOS
  // ========================================

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_contact_messages_date
    ON contact_messages(created_at);

    CREATE TABLE IF NOT EXISTS contact_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      reply TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id)
        REFERENCES contact_messages(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_replies_message
    ON contact_replies(message_id);
  `);

  const colunas = db
    .prepare("PRAGMA table_info(contact_messages)")
    .all();

  if (!colunas.some(coluna => coluna.name === "whatsapp")) {
    db.exec(`
      ALTER TABLE contact_messages
      ADD COLUMN whatsapp TEXT;
    `);
  }

  // ========================================
  // LIMITADORES
  // ========================================

  const limitarContato = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Muitas mensagens enviadas. Aguarde 15 minutos."
    }
  });

  const limitarRespostas = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipFailedRequests: true,
    message: {
      error: "Limite temporário de respostas atingido. Aguarde alguns minutos."
    }
  });

  // ========================================
  // VALIDAÇÕES
  // ========================================

  function validarTexto(valor, limite) {
    if (typeof valor !== "string") return null;

    const texto = valor.trim();

    if (!texto || texto.length > limite) return null;

    return texto;
  }

  function validarId(valor) {
    const id = Number(valor);

    return Number.isSafeInteger(id) && id > 0
      ? id
      : null;
  }

  function emailValido(email) {
    return (
      typeof email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
  }

  function validarWhatsapp(valor) {
    if (typeof valor !== "string") return null;

    let numero = valor.replace(/\D/g, "");

    if (
      numero.startsWith("55") &&
      (numero.length === 12 || numero.length === 13)
    ) {
      numero = numero.slice(2);
    }

    if (numero.length !== 10 && numero.length !== 11) {
      return null;
    }

    const ddd = Number(numero.slice(0, 2));

    if (ddd < 11 || ddd > 99) return null;

    return `55${numero}`;
  }

  // ========================================
  // CONFIGURAÇÃO SMTP
  // ========================================

  function criarTransportador() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return null;
    }

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error("Porta SMTP inválida.");
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }

  // ========================================
  // RECEBER MENSAGEM DO SITE
  // ========================================

  app.post(
    "/api/contact",
    limitarContato,
    (req, res) => {
      const dados = req.body;

      if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
      ) {
        return res.status(400).json({
          error: "Dados inválidos."
        });
      }

      const name = validarTexto(dados.name, 100);
      const email = validarTexto(dados.email, 254);
      const whatsapp = validarWhatsapp(dados.whatsapp);
      const subject = validarTexto(dados.subject, 150);
      const message = validarTexto(dados.message, 5000);

      if (
        !name ||
        !email ||
        !whatsapp ||
        !subject ||
        !message
      ) {
        return res.status(400).json({
          error: "Preencha todos os campos corretamente, incluindo o WhatsApp."
        });
      }

      if (!emailValido(email)) {
        return res.status(400).json({
          error: "Informe um e-mail válido."
        });
      }

      try {
        const resultado = db.prepare(`
          INSERT INTO contact_messages (
            name,
            email,
            whatsapp,
            subject,
            message
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          name,
          email,
          whatsapp,
          subject,
          message
        );

        console.log(
          "[MESSAGES] Nova mensagem:",
          resultado.lastInsertRowid
        );

        return res.status(201).json({
          success: true,
          message: "Mensagem enviada com sucesso!"
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao salvar:", erro);

        return res.status(500).json({
          error: "Não foi possível salvar a mensagem."
        });
      }
    }
  );

  // ========================================
  // LISTAR MENSAGENS
  // ========================================

  app.get(
    "/api/admin/messages",
    exigirAdmin,
    (req, res) => {
      try {
        const messages = db.prepare(`
          SELECT
            m.id,
            m.name,
            m.email,
            m.whatsapp,
            m.subject,
            m.message,
            m.is_read,
            m.created_at,
            (
              SELECT COUNT(*)
              FROM contact_replies r
              WHERE r.message_id = m.id
            ) AS reply_count,
            (
              SELECT MAX(r.sent_at)
              FROM contact_replies r
              WHERE r.message_id = m.id
            ) AS last_reply_at
          FROM contact_messages m
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 200
        `).all();

        const unread = db.prepare(`
          SELECT COUNT(*) AS total
          FROM contact_messages
          WHERE is_read = 0
        `).get().total;

        const total = db.prepare(`
          SELECT COUNT(*) AS total
          FROM contact_messages
        `).get().total;

        const replied = db.prepare(`
          SELECT COUNT(DISTINCT message_id) AS total
          FROM contact_replies
        `).get().total;

        return res.json({
          messages,
          unread,
          total,
          replied
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao listar:", erro);

        return res.status(500).json({
          error: "Não foi possível carregar as mensagens."
        });
      }
    }
  );

  // ========================================
  // VISUALIZAR MENSAGEM E HISTÓRICO
  // ========================================

  app.get(
    "/api/admin/messages/:id",
    exigirAdmin,
    (req, res) => {
      const id = validarId(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID inválido."
        });
      }

      try {
        const message = db.prepare(`
          SELECT
            id,
            name,
            email,
            whatsapp,
            subject,
            message,
            is_read,
            created_at
          FROM contact_messages
          WHERE id = ?
        `).get(id);

        if (!message) {
          return res.status(404).json({
            error: "Mensagem não encontrada."
          });
        }

        const replies = db.prepare(`
          SELECT
            id,
            message_id,
            reply,
            recipient_email,
            sent_at
          FROM contact_replies
          WHERE message_id = ?
          ORDER BY sent_at ASC, id ASC
        `).all(id);

        return res.json({
          message,
          replies
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao visualizar:", erro);

        return res.status(500).json({
          error: "Não foi possível carregar a mensagem."
        });
      }
    }
  );

  // ========================================
  // MARCAR COMO LIDA
  // ========================================

  app.patch(
    "/api/admin/messages/:id/read",
    exigirAdmin,
    (req, res) => {
      const id = validarId(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID inválido."
        });
      }

      if (typeof req.body?.is_read !== "boolean") {
        return res.status(400).json({
          error: "Informe is_read como true ou false."
        });
      }

      try {
        const resultado = db.prepare(`
          UPDATE contact_messages
          SET is_read = ?
          WHERE id = ?
        `).run(
          req.body.is_read ? 1 : 0,
          id
        );

        if (!resultado.changes) {
          return res.status(404).json({
            error: "Mensagem não encontrada."
          });
        }

        return res.json({
          success: true,
          message: "Status atualizado."
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao atualizar:", erro);

        return res.status(500).json({
          error: "Não foi possível atualizar a mensagem."
        });
      }
    }
  );

  // ========================================
  // RESPONDER PELO PAINEL
  // ========================================

  app.post(
    "/api/admin/messages/:id/reply",
    exigirAdmin,
    limitarRespostas,
    async (req, res) => {
      const id = validarId(req.params.id);

      // Compatibilidade com o painel.
      const reply = validarTexto(
        req.body?.reply ?? req.body?.message,
        5000
      );

      if (!id) {
        return res.status(400).json({
          error: "ID inválido."
        });
      }

      if (!reply) {
        return res.status(400).json({
          error: "Escreva uma resposta de até 5000 caracteres."
        });
      }

      try {
        const message = db.prepare(`
          SELECT
            id,
            name,
            email,
            subject
          FROM contact_messages
          WHERE id = ?
        `).get(id);

        if (!message) {
          return res.status(404).json({
            error: "Mensagem não encontrada."
          });
        }

        if (!emailValido(message.email)) {
          return res.status(400).json({
            error: "O cliente não possui um e-mail válido."
          });
        }

        const transportador = criarTransportador();

        if (!transportador) {
          return res.status(503).json({
            error: "O envio de e-mail ainda não foi configurado no servidor."
          });
        }

        const remetente =
          process.env.SMTP_FROM ||
          process.env.SMTP_USER;

        const assunto = message.subject
          .replace(/[\r\n]/g, " ")
          .slice(0, 150);

        const assuntoResposta = /^re:/i.test(assunto)
          ? assunto
          : `Re: ${assunto}`;

        // Enviar antes de registrar como enviada.
        await transportador.sendMail({
          from: remetente,
          to: message.email,
          replyTo: remetente,
          subject: assuntoResposta,
          text: [
            `Olá, ${message.name}!`,
            "",
            reply,
            "",
            "Atenciosamente,",
            "ASTA WEB STUDIO"
          ].join("\n")
        });

        let registro;

        try {
          const salvarResposta = db.transaction(() => {
            const resultado = db.prepare(`
              INSERT INTO contact_replies (
                message_id,
                reply,
                recipient_email
              )
              VALUES (?, ?, ?)
            `).run(
              id,
              reply,
              message.email
            );

            db.prepare(`
              UPDATE contact_messages
              SET is_read = 1
              WHERE id = ?
            `).run(id);

            return resultado;
          });

          registro = salvarResposta();
        } catch (erroBanco) {
          console.error(
            "[MESSAGES] E-mail enviado, mas falhou o registro:",
            erroBanco
          );

          return res.status(500).json({
            error:
              "O e-mail foi enviado, mas não foi possível registrar a resposta no histórico. Não reenvie sem verificar.",
            email_sent: true,
            history_saved: false
          });
        }

        console.log(
          "[MESSAGES] Resposta enviada:",
          registro.lastInsertRowid
        );

        return res.status(201).json({
          success: true,
          email_sent: true,
          history_saved: true,
          message: "Resposta enviada por e-mail com sucesso!",
          reply_id: registro.lastInsertRowid
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao responder:", erro);

        return res.status(502).json({
          error:
            "Não foi possível confirmar o envio do e-mail. Verifique o servidor antes de tentar novamente."
        });
      }
    }
  );

  // ========================================
  // EXCLUIR MENSAGEM
  // ========================================

  app.delete(
    "/api/admin/messages/:id",
    exigirAdmin,
    (req, res) => {
      const id = validarId(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID inválido."
        });
      }

      try {
        const excluirMensagem = db.transaction(() => {
          db.prepare(`
            DELETE FROM contact_replies
            WHERE message_id = ?
          `).run(id);

          return db.prepare(`
            DELETE FROM contact_messages
            WHERE id = ?
          `).run(id);
        });

        const resultado = excluirMensagem();

        if (!resultado.changes) {
          return res.status(404).json({
            error: "Mensagem não encontrada."
          });
        }

        return res.json({
          success: true,
          message: "Mensagem excluída com sucesso!"
        });
      } catch (erro) {
        console.error("[MESSAGES] Erro ao excluir:", erro);

        return res.status(500).json({
          error: "Não foi possível excluir a mensagem."
        });
      }
    }
  );

  console.log(
    "[MESSAGES] Central de Atendimento Premium ativada."
  );
}

module.exports = configurarMensagens;
