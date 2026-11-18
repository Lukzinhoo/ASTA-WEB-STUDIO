
/* ==========================================
   ASTA WEB STUDIO
   DESPERTAR O GRIMÓRIO COM SOM

   ATUALIZAÇÃO:
   - Mantém a introdução na entrada normal
   - Ignora a introdução ao voltar aos projetos
   - Abre diretamente a seção solicitada
   - Preserva os sons e animações
========================================== */

(() => {
  "use strict";

  const DURACAO_INTRO = 3200;
  const DURACAO_SAIDA = 700;

  let audioContext = null;
  let intro = null;
  let iniciada = false;
  let finalizada = false;
  let timers = [];
  let overflowOriginal = "";

  // ==========================================
  // GERENCIAMENTO DOS TEMPORIZADORES
  // ==========================================

  function agendar(funcao, atraso) {
    const timer = setTimeout(funcao, atraso);
    timers.push(timer);
    return timer;
  }

  function limparTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // ==========================================
  // NAVEGAÇÃO DIRETA PARA SEÇÕES
  // ==========================================

  function obterSecaoDaURL() {
    const hash = window.location.hash;

    if (!hash || hash === "#inicio") {
      return null;
    }

    try {
      const id = decodeURIComponent(hash.slice(1));

      return document.getElementById(id);
    } catch (erro) {
      console.warn(
        "Não foi possível identificar a seção:",
        erro
      );

      return null;
    }
  }

  function navegarParaSecao() {
    const secao = obterSecaoDaURL();

    if (!secao) {
      return;
    }

    // Aguarda os scripts terminarem de montar a página.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        secao.scrollIntoView({
          behavior: "instant",
          block: "start"
        });
      });
    });
  }

  function deveIgnorarIntro() {
    return Boolean(obterSecaoDaURL());
  }

  // ==========================================
  // SISTEMA DE ÁUDIO
  // ==========================================

  async function prepararAudio() {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    try {
      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      return audioContext.state === "running";
    } catch (erro) {
      console.warn(
        "Não foi possível iniciar o áudio:",
        erro
      );

      return false;
    }
  }

  function tocarTom({
    frequencia = 440,
    frequenciaFinal = 100,
    duracao = 0.4,
    volume = 0.1,
    tipo = "sawtooth",
    inicio = 0
  } = {}) {
    const ctx = audioContext;

    if (!ctx || ctx.state !== "running") {
      return;
    }

    const agora = ctx.currentTime + inicio;
    const fim = agora + duracao;

    const oscilador = ctx.createOscillator();
    const ganho = ctx.createGain();

    oscilador.type = tipo;

    oscilador.frequency.setValueAtTime(
      Math.max(1, frequencia),
      agora
    );

    oscilador.frequency.exponentialRampToValueAtTime(
      Math.max(1, frequenciaFinal),
      fim
    );

    ganho.gain.setValueAtTime(0.0001, agora);

    ganho.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      agora + Math.min(0.025, duracao / 2)
    );

    ganho.gain.exponentialRampToValueAtTime(
      0.0001,
      fim
    );

    oscilador.connect(ganho);
    ganho.connect(ctx.destination);

    oscilador.start(agora);
    oscilador.stop(fim + 0.02);

    oscilador.onended = () => {
      oscilador.disconnect();
      ganho.disconnect();
    };
  }

  // ==========================================
  // SOM DE ENERGIA MÁGICA
  // ==========================================

  function somEnergia() {
    tocarTom({
      frequencia: 85,
      frequenciaFinal: 500,
      duracao: 0.95,
      volume: 0.055,
      tipo: "sawtooth"
    });

    tocarTom({
      frequencia: 160,
      frequenciaFinal: 850,
      duracao: 0.9,
      volume: 0.035,
      tipo: "sine",
      inicio: 0.05
    });
  }

  // ==========================================
  // SOM DE ESPADA
  // ==========================================

  function somEspada() {
    tocarTom({
      frequencia: 1700,
      frequenciaFinal: 120,
      duracao: 0.32,
      volume: 0.12,
      tipo: "sawtooth"
    });

    tocarTom({
      frequencia: 950,
      frequenciaFinal: 90,
      duracao: 0.42,
      volume: 0.065,
      tipo: "triangle",
      inicio: 0.04
    });
  }

  // ==========================================
  // SOM DE IMPACTO
  // ==========================================

  function somImpacto() {
    tocarTom({
      frequencia: 160,
      frequenciaFinal: 38,
      duracao: 0.65,
      volume: 0.16,
      tipo: "sine"
    });

    tocarTom({
      frequencia: 600,
      frequenciaFinal: 65,
      duracao: 0.28,
      volume: 0.06,
      tipo: "sawtooth"
    });
  }

  // ==========================================
  // PARTÍCULAS VERMELHAS
  // ==========================================

  function criarParticulas(cena) {
    if (!cena) return;

    for (let i = 0; i < 35; i++) {
      const particula = document.createElement("span");

      particula.className = "intro-particle";

      particula.style.left =
        `${Math.random() * 100}%`;

      particula.style.animationDuration =
        `${2 + Math.random() * 2}s`;

      particula.style.animationDelay =
        `${Math.random() * 1.5}s`;

      cena.appendChild(particula);
    }
  }

  // ==========================================
  // FINALIZAR INTRODUÇÃO
  // ==========================================

  function finalizarIntro() {
    if (finalizada || !intro) {
      return;
    }

    finalizada = true;
    limparTimers();

    intro.classList.add("intro-finished");

    agendar(() => {
      intro?.remove();
      intro = null;

      document.body.style.overflow = overflowOriginal;

      window.dispatchEvent(
        new CustomEvent("asta:intro-finished")
      );

      // Se houver uma seção na URL,
      // navega diretamente para ela.
      navegarParaSecao();

    }, DURACAO_SAIDA);
  }

  // ==========================================
  // DESPERTAR O GRIMÓRIO
  // ==========================================

  function despertarGrimorio() {
    if (iniciada || !intro) {
      return;
    }

    iniciada = true;

    const botao = intro.querySelector(
      "#intro-start-button"
    );

    if (botao) {
      botao.disabled = true;
    }

    prepararAudio().then((permitido) => {
      if (permitido && !finalizada) {
        somEnergia();
      }
    });

    intro.classList.add("is-playing");

    // Golpe de espada.
    agendar(() => {
      if (!finalizada) {
        somEspada();
      }
    }, 1050);

    // Impacto mágico.
    agendar(() => {
      if (!finalizada) {
        somImpacto();
      }
    }, 1450);

    // Revela o site.
    agendar(() => {
      finalizarIntro();
    }, DURACAO_INTRO);
  }

  // ==========================================
  // CRIAR TELA INICIAL
  // ==========================================

  function criarIntro() {
    if (document.getElementById("asta-intro")) {
      return;
    }

    intro = document.createElement("div");
    intro.id = "asta-intro";

    intro.innerHTML = `
      <!-- TELA INICIAL -->

      <div class="intro-start-screen">

        <p class="intro-start-label">
          O DESPERTAR DA MAGIA
        </p>

        <div class="intro-book" aria-hidden="true">
          <span class="intro-book-symbol">✿</span>
        </div>

        <h1 class="intro-welcome-title">
          ASTA
          <span>WEB STUDIO</span>
        </h1>

        <p class="intro-welcome-text">
          Um universo onde criatividade, tecnologia
          e magia se encontram.
          Seu grimório está pronto para despertar.
        </p>

        <button
          type="button"
          class="intro-start-button"
          id="intro-start-button"
        >
          <span aria-hidden="true">⚔</span>
          DESPERTAR O GRIMÓRIO
        </button>

      </div>

      <!-- ABERTURA CINEMATOGRÁFICA -->

      <div class="intro-scene" aria-hidden="true">

        <div class="intro-energy"></div>
        <div class="intro-ring"></div>
        <div class="intro-slash"></div>
        <div class="intro-flash"></div>

        <div class="intro-logo">
          <strong>ASTA</strong>
          <span>WEB STUDIO</span>
        </div>

      </div>

      <!-- PULAR INTRODUÇÃO -->

      <button
        type="button"
        class="intro-skip"
        id="intro-skip"
      >
        Pular introdução →
      </button>
    `;

    document.body.appendChild(intro);

    const cena = intro.querySelector(".intro-scene");

    criarParticulas(cena);

    overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const botaoIniciar = intro.querySelector(
      "#intro-start-button"
    );

    const botaoPular = intro.querySelector(
      "#intro-skip"
    );

    botaoIniciar.addEventListener(
      "click",
      despertarGrimorio
    );

    botaoPular.addEventListener(
      "click",
      finalizarIntro
    );

    botaoIniciar.focus();
  }

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================

  function inicializar() {
    const movimentoReduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Se o visitante chegou por um link direto
    // para uma seção, não mostra a introdução.
    if (deveIgnorarIntro()) {
      navegarParaSecao();
      return;
    }

    // Respeita a preferência de acessibilidade.
    if (movimentoReduzido) {
      return;
    }

    // Entrada normal: mostra o grimório.
    criarIntro();
  }

  // Se o hash mudar enquanto o site está aberto,
  // garante que a seção seja exibida.
  window.addEventListener("hashchange", () => {
    if (!intro) {
      navegarParaSecao();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      inicializar,
      { once: true }
    );
  } else {
    inicializar();
  }

})();
