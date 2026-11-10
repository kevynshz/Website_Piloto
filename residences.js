// Realça a seção atual sem interferir no cadastro ou nos dados existentes.
(() => {
  function atualizarNavegacao() {
    const secao = location.hash.slice(1) || 'feed';
    document.querySelectorAll('[data-nav]').forEach(link => {
      const atual = link.dataset.nav === (secao === 'escrever' ? 'feed' : secao);
      if (atual) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', atualizarNavegacao);
  atualizarNavegacao();
  // O conteúdo continua visível se a API não estiver disponível.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observador = new IntersectionObserver(entradas => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visible');
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.community-hero, .timeline > .post, .notice-panel, .life-panel, .concierge-card').forEach(secao => {
      secao.classList.add('reveal-pending');
      observador.observe(secao);
    });
  }
})();
