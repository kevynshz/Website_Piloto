// Interface de demonstração local; não cria uma sessão autenticada no servidor.
(() => {
  const dialog = document.querySelector('#conta-dialog');
  const form = document.querySelector('#conta-form');
  const usuario = form.elements.usuario;
  const senha = form.elements.senha;
  const mensagem = document.querySelector('#conta-mensagem');
  const enviar = document.querySelector('#conta-enviar');
  const alternar = document.querySelector('#conta-alternar');
  const chaveSessao = 'eva.sessao.demo.v1';
  let modo = 'entrar';
  let ocupado = false;

  function configurar(novoModo) {
    modo = novoModo;
    const cadastro = modo === 'cadastrar';
    document.querySelector('#conta-titulo').textContent = cadastro ? 'Criar sua conta' : 'Entrar na comunidade';
    document.querySelector('#conta-ajuda').textContent = cadastro
      ? 'Sua conta ficará salva somente neste navegador. Use uma senha fictícia.'
      : 'Use a conta cadastrada neste navegador.';
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
    atualizarPerfil(localStorage.getItem(chaveSessao));
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
      if (!window.crypto?.subtle) throw new Error('Abra o site em HTTPS ou localhost para usar as contas locais.');
      const nome = usuario.value.trim().toLowerCase();
      if (modo === 'cadastrar') {
        await window.usuariosDemo.cadastrar(nome, senha.value);
      } else if (!await window.usuariosDemo.validar(nome, senha.value)) {
        throw new Error('Usuário ou senha incorretos. Cadastre-se se ainda não tiver uma conta neste navegador.');
      }
      // Apenas o nome é mantido para restaurar a interface, nunca a senha.
      localStorage.setItem(chaveSessao, nome);
      atualizarPerfil(nome);
      dialog.close();
      window.location.hash = 'feed';
    } catch (erro) {
      mensagem.textContent = erro instanceof DOMException
        ? 'Não foi possível acessar os dados locais. Verifique as permissões de armazenamento do navegador.'
        : erro.message;
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

  document.querySelector('#conta-sair').addEventListener('click', (evento) => {
    evento.preventDefault();
    try {
      localStorage.removeItem(chaveSessao);
    } catch {
      window.alert('Não foi possível sair. Verifique as permissões de armazenamento do navegador.');
      return;
    }
    atualizarPerfil(null);
    window.location.hash = '';
  });
  try {
    const salvo = localStorage.getItem(chaveSessao);
    const nome = salvo ? window.usuariosDemo.obterUsuario(salvo)?.usuario : null;
    atualizarPerfil(nome);
  } catch {
    atualizarPerfil(null);
  }
})();
