// A sessão é validada pela API e mantida em cookie HttpOnly.
(() => {
  const dialog = document.querySelector('#conta-dialog');
  const form = document.querySelector('#conta-form');
  const usuario = form.elements.usuario;
  const senha = form.elements.senha;
  const mensagem = document.querySelector('#conta-mensagem');
  const enviar = document.querySelector('#conta-enviar');
  const alternar = document.querySelector('#conta-alternar');
  let modo = 'entrar';
  let ocupado = false;

  function configurar(novoModo) {
    modo = novoModo;
    const cadastro = modo === 'cadastrar';
    document.querySelector('#conta-titulo').textContent = cadastro ? 'Criar sua conta' : 'Entrar na comunidade';
    document.querySelector('#conta-ajuda').textContent = cadastro
      ? 'Crie uma conta para participar da comunidade.'
      : 'Entre com seu usuário e senha.';
    enviar.textContent = cadastro ? 'Criar conta' : 'Entrar';
    alternar.textContent = cadastro ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta';
    senha.autocomplete = cadastro ? 'new-password' : 'current-password';
    senha.minLength = cadastro ? 12 : 1;
    senha.value = '';
    mensagem.textContent = '';
  }

  function atualizarPerfil(nome) {
    const perfil = nome ? window.usuariosDemo.obterUsuario(nome) : null;
    document.querySelector('.account strong').textContent = perfil?.nome || 'Visitante';
    document.querySelector('.account small').textContent = nome ? `@${nome} · Editar perfil ↗` : '@visitante · Meu perfil ↗';
    document.querySelector('.account').setAttribute('aria-label', nome ? 'Editar meu perfil' : 'Abrir meu perfil');
    document.querySelector('#conta-sair').hidden = !nome;
    document.querySelectorAll('.account .avatar, .composer > .avatar').forEach((avatar) => {
      avatar.textContent = nome ? nome[0].toUpperCase() : 'V';
    });
    document.querySelector('#perfil h2').textContent = `Olá, ${perfil?.nome || 'visitante'}.`;
    document.querySelector('#perfil p').textContent = nome
      ? perfil.bio || 'Seu espaço na comunidade. Conte um pouco sobre você na biografia.'
      : 'Entre na comunidade para personalizar seu perfil.';
    window.dispatchEvent(new Event('conta-alterada'));
  }

  window.addEventListener('perfil-alterado', () => {
    try { atualizarPerfil(window.usuariosDemo.atual().usuario); } catch { atualizarPerfil(null); }
  });

  document.querySelectorAll('[data-conta]').forEach((botao) => {
    botao.addEventListener('click', () => {
      configurar(botao.dataset.conta);
      dialog.showModal();
      usuario.focus();
    });
  });
  alternar.addEventListener('click', () => configurar(modo === 'entrar' ? 'cadastrar' : 'entrar'));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (evento) => { if (ocupado) evento.preventDefault(); });
  dialog.addEventListener('close', () => { form.reset(); mensagem.textContent = ''; });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (ocupado) return;
    ocupado = true;
    dialog.querySelectorAll('button, input').forEach((elemento) => { elemento.disabled = true; });
    mensagem.textContent = 'Aguarde…';
    try {
      const nome = usuario.value.trim().toLowerCase();
      if (modo === 'cadastrar') {
        await window.usuariosDemo.cadastrar(nome, senha.value);
      } else if (!await window.usuariosDemo.validar(nome, senha.value)) {
        throw new Error('Usuário ou senha incorretos. Cadastre-se se ainda não tiver uma conta.');
      }
      atualizarPerfil(nome);
      dialog.close();
      window.location.hash = 'feed';
    } catch (erro) {
      mensagem.textContent = erro.message;
    } finally {
      ocupado = false;
      dialog.querySelectorAll('button, input').forEach((elemento) => { elemento.disabled = false; });
      senha.value = '';
    }
  });

  document.querySelector('.account').addEventListener('click', (evento) => {
    evento.preventDefault();
    window.location.hash = 'perfil';
    requestAnimationFrame(() => {
      const campo = document.querySelector('#perfil-nome');
      if (!document.querySelector('#perfil-form').hidden) campo.focus();
      document.querySelector('#perfil').scrollIntoView({ block: 'start' });
    });
  });

  document.querySelector('#conta-sair').addEventListener('click', async (evento) => {
    evento.preventDefault();
    try {
      await window.usuariosDemo.sair();
    } catch (erro) {
      window.alert(erro.message);
      return;
    }
    atualizarPerfil(null);
    window.location.hash = '';
  });
  atualizarPerfil(null);
  window.usuariosDemo.sessao().then(perfil => atualizarPerfil(perfil?.usuario || null)).catch(erro => {
    document.querySelector('.composer small').textContent = erro.message;
  });
})();
