(() => {
  const composer = document.querySelector('.composer');
  const texto = document.querySelector('#idea');
  const publicar = composer.querySelector('button');
  const status = composer.querySelector('small');
  status.setAttribute('role', 'status');
  const perfilForm = document.querySelector('#perfil-form');
  const perfilStatus = document.querySelector('#perfil-status');
  const exemplos = [...document.querySelectorAll('.timeline > .post')];
  const ids = ['marina', 'rafael', 'bia'];
  const lista = document.createElement('div');
  composer.after(lista);
  function elemento(tag, conteudo, classe) {
    const e = document.createElement(tag);
    if (conteudo !== undefined) e.textContent = conteudo;
    if (classe) e.className = classe;
    return e;
  }
  function atual() {
    try { return window.usuariosDemo.atual(); } catch { return null; }
  }
  function nome(usuario) {
    return window.usuariosDemo.obterUsuario(usuario)?.nome || usuario;
  }
  function comentarios(post, id) {
    const area = elemento('section', undefined, 'comentarios');
    area.setAttribute('aria-label', 'Comentários');
    area.append(elemento('strong', `${post?.comentarios.length || 0} comentários locais`));
    for (const comentario of post?.comentarios || []) {
      const p = elemento('p');
      p.append(elemento('strong', nome(comentario.usuario)), document.createTextNode(`: ${comentario.texto}`));
      area.append(p);
    }
    const form = elemento('form', undefined, 'comentario-form');
    const campo = elemento('textarea');
    campo.maxLength = 280;
    campo.rows = 2;
    campo.required = true;
    campo.placeholder = atual() ? 'Escreva um comentário…' : 'Entre para comentar';
    campo.setAttribute('aria-label', 'Seu comentário');
    campo.disabled = !atual();
    const botao = elemento('button', 'Comentar', 'button');
    botao.type = 'submit';
    botao.disabled = !atual();
    const mensagem = elemento('p');
    mensagem.setAttribute('role', 'status');
    form.append(campo, botao, mensagem);
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      try {
        window.publicacoes.comentar(id, campo.value);
        renderizar();
        status.textContent = 'Comentário salvo.';
      } catch (erro) { mensagem.textContent = erro.message; }
    });
    area.append(form);
    return area;
  }
  function renderizar() {
    try {
      const posts = window.publicacoes.listar();
      const fragmento = document.createDocumentFragment();
      for (const post of posts.filter(p => !ids.includes(p.id))) {
        const article = elemento('article', undefined, 'post');
        const avatar = elemento('span', nome(post.usuario)[0].toUpperCase(), 'avatar green');
        const corpo = elemento('div');
        const header = elemento('header');
        header.append(elemento('strong', nome(post.usuario)), elemento('span', `@${post.usuario} · ${new Date(post.criadoEm).toLocaleString('pt-BR')}`));
        corpo.append(header, elemento('p', post.texto, 'post-texto'), comentarios(post, post.id));
        article.append(avatar, corpo);
        fragmento.append(article);
      }
      lista.replaceChildren(fragmento);
      exemplos.forEach((article, i) => {
        article.querySelector('.comentarios')?.remove();
        article.querySelector('div').append(comentarios(posts.find(p => p.id === ids[i]), ids[i]));
      });
    } catch (erro) { status.textContent = `Não foi possível carregar as publicações: ${erro.message}`; }
  }
  function atualizar() {
    const perfil = atual();
    publicar.disabled = !perfil;
    texto.disabled = !perfil;
    status.textContent = perfil ? 'Até 280 caracteres · salvo neste navegador' : 'Entre na sua conta para publicar e comentar.';
    perfilForm.hidden = !perfil;
    perfilForm.elements.nome.value = perfil?.nome || '';
    perfilForm.elements.bio.value = perfil?.bio || '';
    perfilStatus.textContent = perfil ? '' : 'Entre para editar seu perfil.';
    renderizar();
  }
  publicar.addEventListener('click', () => {
    try {
      window.publicacoes.postar(texto.value);
      texto.value = '';
      renderizar();
      status.textContent = 'Publicação salva!';
    } catch (erro) { status.textContent = erro.message; }
  });
  perfilForm.addEventListener('submit', evento => {
    evento.preventDefault();
    try {
      window.usuariosDemo.editarPerfil(perfilForm.elements.nome.value, perfilForm.elements.bio.value);
      window.dispatchEvent(new Event('perfil-alterado'));
      perfilStatus.textContent = 'Perfil atualizado!';
    } catch (erro) { perfilStatus.textContent = erro.message; }
  });
  window.addEventListener('conta-alterada', atualizar);
  window.addEventListener('storage', atualizar);
  atualizar();
})();
