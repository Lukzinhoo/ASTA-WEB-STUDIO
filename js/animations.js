
/* ========================================
   ASTA WEB STUDIO
   ANIMACOES DE ROLAGEM
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  const elementos = document.querySelectorAll(
    ".section-heading, .service-card, .about-description, .contact-content"
  );

  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -30px 0px"
    }
  );

  elementos.forEach((elemento) => {
    elemento.classList.add("reveal");
    observador.observe(elemento);
  });
});
