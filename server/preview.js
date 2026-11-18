
"use strict";

const { chromium } = require("playwright");
const dns = require("node:dns").promises;
const net = require("node:net");
const fs = require("node:fs").promises;
const path = require("node:path");
const crypto = require("node:crypto");

// ==========================================
// ASTA WEB STUDIO
// SISTEMA DE CAPTURAS AUTOMATICAS
// ==========================================

const LARGURA = 1366;
const ALTURA = 768;
const ALTURA_MAXIMA = 8000;

const TIMEOUT_NAVEGACAO = 30000;
const TIMEOUT_CAPTURA = 30000;

const bloqueadosIPv4 = new net.BlockList();
const bloqueadosIPv6 = new net.BlockList();

const redesIPv4 = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
];

const redesIPv6 = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32]
];

for (const [ip, bits] of redesIPv4) {
  bloqueadosIPv4.addSubnet(ip, bits, "ipv4");
}

for (const [ip, bits] of redesIPv6) {
  bloqueadosIPv6.addSubnet(ip, bits, "ipv6");
}

// ==========================================
// IDENTIFICAR IPv4 MAPEADO EM IPv6
// ==========================================

function extrairIPv4Mapeado(ip) {
  const texto = String(ip).toLowerCase();

  if (!texto.startsWith("::ffff:")) {
    return null;
  }

  const parte = texto.substring(7);

  if (net.isIP(parte) === 4) {
    return parte;
  }

  const grupos = parte.split(":");

  if (
    grupos.length === 2 &&
    grupos.every((grupo) =>
      /^[0-9a-f]{1,4}$/.test(grupo)
    )
  ) {
    const numero1 = parseInt(grupos[0], 16);
    const numero2 = parseInt(grupos[1], 16);

    return [
      numero1 >> 8,
      numero1 & 255,
      numero2 >> 8,
      numero2 & 255
    ].join(".");
  }

  return null;
}

// ==========================================
// VALIDAR ENDERECO IP
// ==========================================

function enderecoBloqueado(ip, familia) {
  const tipoReal = net.isIP(ip);

  if (!tipoReal || tipoReal !== familia) {
    return true;
  }

  if (familia === 4) {
    return bloqueadosIPv4.check(ip, "ipv4");
  }

  if (familia === 6) {
    const ipv4Mapeado = extrairIPv4Mapeado(ip);

    if (ipv4Mapeado) {
      return bloqueadosIPv4.check(
        ipv4Mapeado,
        "ipv4"
      );
    }

    return bloqueadosIPv6.check(ip, "ipv6");
  }

  return true;
}

// ==========================================
// VALIDAR URL
// ==========================================

function validarURL(texto) {
  let url;

  try {
    url = new URL(texto);
  } catch {
    throw new Error(
      "O endereco do site e invalido."
    );
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(
      "Use um endereco HTTPS publico, sem usuario ou porta personalizada."
    );
  }

  const host = url.hostname
    .replace(/\.$/, "")
    .toLowerCase();

  if (
    !host ||
    net.isIP(host.replace(/^\[|\]$/g, "")) ||
    host === "localhost" ||
    [
      ".localhost",
      ".local",
      ".internal",
      ".test"
    ].some((sufixo) => host.endsWith(sufixo))
  ) {
    throw new Error(
      `Endereco interno nao permitido: ${host}`
    );
  }

  return { url, host };
}

// ==========================================
// VERIFICAR DNS
// ==========================================

async function verificarDestino(
  texto,
  cache = new Map()
) {
  const { url, host } = validarURL(texto);

  if (cache.has(host)) {
    return url;
  }

  let ips;

  try {
    ips = await dns.lookup(host, {
      all: true
    });
  } catch (erro) {
    throw new Error(
      `Falha ao consultar DNS de ${host}: ${erro.message}`
    );
  }

  if (!ips || ips.length === 0) {
    throw new Error(
      `Dominio sem endereco IP valido: ${host}`
    );
  }

  console.log(`[PREVIEW] Dominio: ${host}`);

  console.log(
    `[PREVIEW] IPs: ${ips
      .map((item) => item.address)
      .join(", ")}`
  );

  for (const item of ips) {
    if (
      enderecoBloqueado(
        item.address,
        item.family
      )
    ) {
      throw new Error(
        `Endereco bloqueado: ${host} (${item.address})`
      );
    }
  }

  cache.set(host, ips);

  return url;
}

// ==========================================
// PREPARAR PAGINA PARA CAPTURA COMPLETA
// ==========================================

async function prepararPagina(pagina) {
  console.log(
    "[PREVIEW] Preparando captura completa..."
  );

  // Percorre a pagina para ativar imagens
  // e elementos carregados durante a rolagem.
  let altura = await pagina.evaluate(() => {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight
    );
  });

  altura = Math.min(altura, ALTURA_MAXIMA);

  const passo = 650;

  for (
    let posicao = 0;
    posicao < altura;
    posicao += passo
  ) {
    await pagina.evaluate((y) => {
      window.scrollTo(0, y);
    }, posicao);

    await pagina.waitForTimeout(120);
  }

  // Retorna ao inicio.
  await pagina.evaluate(() => {
    window.scrollTo(0, 0);
  });

  await pagina.waitForTimeout(1000);

  // Calcula novamente a altura depois
  // de carregar os elementos da pagina.
  const alturaFinal = await pagina.evaluate(() => {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight
    );
  });

  const alturaCaptura = Math.min(
    Math.max(ALTURA, Math.ceil(alturaFinal)),
    ALTURA_MAXIMA
  );

  console.log(
    `[PREVIEW] Altura da pagina: ${alturaFinal}px`
  );

  console.log(
    `[PREVIEW] Altura da captura: ${alturaCaptura}px`
  );

  return alturaCaptura;
}

// ==========================================
// GERAR CAPTURA
// ==========================================

async function gerarCaptura(site, destino) {
  console.log("");
  console.log("====================================");
  console.log("[PREVIEW] Iniciando captura");
  console.log(`[PREVIEW] Site: ${site}`);
  console.log("====================================");

  const cacheDNS = new Map();

  const url = await verificarDestino(
    site,
    cacheDNS
  );

  let navegador;

  try {
    navegador = await chromium.launch({
      headless: true
    });

    const contexto = await navegador.newContext({
      viewport: {
        width: LARGURA,
        height: ALTURA
      },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      acceptDownloads: false,
      ignoreHTTPSErrors: false
    });

    const pagina = await contexto.newPage();

    // ======================================
    // PROTEGER REQUISICOES
    // ======================================

    await pagina.route("**/*", async (rota) => {
      try {
        const requisicao = rota.request();
        const recurso = requisicao.url();

        if (
          recurso.startsWith("data:") ||
          recurso.startsWith("blob:")
        ) {
          await rota.continue();
          return;
        }

        const destinoURL = await verificarDestino(
          recurso,
          cacheDNS
        );

        if (
          requisicao.isNavigationRequest() &&
          requisicao.frame() === pagina.mainFrame() &&
          destinoURL.origin !== url.origin
        ) {
          console.warn(
            `[PREVIEW] Redirecionamento bloqueado: ${recurso}`
          );

          await rota.abort();
          return;
        }

        await rota.continue();

      } catch (erro) {
        console.warn(
          `[PREVIEW] Recurso bloqueado: ${rota.request().url()}`
        );

        console.warn(
          `[PREVIEW] Motivo: ${erro.message}`
        );

        await rota.abort().catch(() => {});
      }
    });

    // ======================================
    // ABRIR SITE
    // ======================================

    console.log("[PREVIEW] Abrindo site...");

    const resposta = await pagina.goto(
      url.href,
      {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT_NAVEGACAO
      }
    );

    if (!resposta) {
      throw new Error(
        "O site nao retornou uma resposta."
      );
    }

    if (!resposta.ok()) {
      throw new Error(
        `O site respondeu com HTTP ${resposta.status()}.`
      );
    }

    await pagina.waitForTimeout(2500);

    // ======================================
    // PREPARAR CAPTURA LONGA
    // ======================================

    const alturaCaptura = await prepararPagina(
      pagina
    );

    // ======================================
    // SALVAR CAPTURA
    // ======================================

    await fs.mkdir(
      path.dirname(destino),
      {
        recursive: true
      }
    );

    await pagina.screenshot({
      path: destino,
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: LARGURA,
        height: alturaCaptura
      },
      captureBeyondViewport: true,
      animations: "disabled",
      timeout: TIMEOUT_CAPTURA
    });

    console.log(
      `[PREVIEW] Captura completa salva: ${destino}`
    );

    await contexto.close();

    return destino;

  } catch (erro) {
    console.error(
      `[PREVIEW] Falha na captura: ${erro.message}`
    );

    throw erro;

  } finally {
    if (navegador) {
      await navegador.close();
    }
  }
}

// ==========================================
// CAPTURAS AUTOMATICAS
// ==========================================

function iniciarCapturas(db, raizProjeto) {
  const pasta = path.join(
    raizProjeto,
    "assets",
    "uploads"
  );

  const tentativas = new Map();

  let trabalhando = false;

  async function processar() {
    if (trabalhando) return;

    trabalhando = true;

    try {
      await fs.mkdir(pasta, {
        recursive: true
      });

      const missoes = db.prepare(`
        SELECT id, title, website
        FROM missions
        WHERE status = 'published'
          AND TRIM(COALESCE(website, '')) <> ''
          AND TRIM(COALESCE(image, '')) = ''
        ORDER BY id DESC
        LIMIT 20
      `).all();

      for (const missao of missoes) {
        const ultimaTentativa =
          tentativas.get(missao.id) || 0;

        if (
          Date.now() - ultimaTentativa <
          300000
        ) {
          continue;
        }

        tentativas.set(
          missao.id,
          Date.now()
        );

        const nome =
          `${crypto.randomUUID()}.png`;

        const destino = path.join(
          pasta,
          nome
        );

        try {
          console.log(
            `[PREVIEW] Capturando projeto: ${missao.title}`
          );

          await gerarCaptura(
            missao.website,
            destino
          );

          const resultado = db.prepare(`
            UPDATE missions
            SET image = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND website = ?
              AND status = 'published'
              AND TRIM(COALESCE(image, '')) = ''
          `).run(
            `/assets/uploads/${nome}`,
            missao.id,
            missao.website
          );

          if (!resultado.changes) {
            await fs.unlink(destino)
              .catch(() => {});
          } else {
            console.log(
              `[PREVIEW] Projeto atualizado: ${missao.title}`
            );
          }

        } catch (erro) {
          await fs.unlink(destino)
            .catch(() => {});

          console.error(
            `[PREVIEW] Erro em ${missao.title}: ${erro.message}`
          );
        }
      }

    } catch (erro) {
      console.error(
        `[PREVIEW] Erro geral: ${erro.message}`
      );

    } finally {
      trabalhando = false;
    }
  }

  setTimeout(processar, 3000);
  setInterval(processar, 60000);

  console.log(
    "[PREVIEW] Capturas automaticas ativadas."
  );
}

// ==========================================
// EXPORTAR FUNCOES
// ==========================================

module.exports = {
  iniciarCapturas,
  gerarCaptura
};
