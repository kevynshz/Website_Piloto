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
})();
