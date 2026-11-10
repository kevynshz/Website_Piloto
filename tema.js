// Executado antes do CSS para restaurar o tema sem piscar a tela.
(() => {
  const chave = 'entre.tema.v1';
  let tema = 'escuro';
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo === 'claro' || salvo === 'escuro') tema = salvo;
  } catch { /* O botão funciona mesmo com armazenamento bloqueado. */ }
  const raiz = document.documentElement;
  raiz.dataset.tema = tema;

  function atualizarBotao() {
    const botao = document.querySelector('#alternar-tema');
    if (!botao) return;
    const escuro = raiz.dataset.tema === 'escuro';
    botao.setAttribute('aria-pressed', String(escuro));
    botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
    botao.title = escuro ? 'Ativar tema claro' : 'Ativar tema escuro';
    botao.querySelector('.theme-icon').textContent = escuro ? '☀' : '☾';
    botao.querySelector('.theme-label').textContent = escuro ? 'Tema claro' : 'Tema escuro';
  }
  document.addEventListener('DOMContentLoaded', () => {
    atualizarBotao();
    document.querySelector('#alternar-tema').addEventListener('click', () => {
      raiz.dataset.tema = raiz.dataset.tema === 'escuro' ? 'claro' : 'escuro';
      try { localStorage.setItem(chave, raiz.dataset.tema); } catch { /* Preferência vale nesta aba. */ }
      atualizarBotao();
    });
  });
  window.addEventListener('storage', evento => {
    if (evento.key === chave) {
      raiz.dataset.tema = evento.newValue === 'claro' ? 'claro' : 'escuro';
      atualizarBotao();
    }
  });
})();
