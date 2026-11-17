(() => {
  const composer = document.querySelector('.composer');
  const texto = document.querySelector('#idea');
  const publicar = composer.querySelector('button');
  const status = composer.querySelector('small');
  status.setAttribute('role', 'status');
  const perfilForm = document.querySelector('#perfil-form');
  const perfilStatus = document.querySelector('#perfil-status');
  const lista = document.createElement('div');
  const mais = document.createElement('button');
  mais.className = 'button secondary';
  mais.type = 'button';
  mais.textContent = 'Carregar mais publicações';
  mais.hidden = true;
  composer.after(lista, mais);
  let cursor = null;
  let versao = 0;
  function elemento(tag, conteudo, classe) {
    const e = document.createElement(tag);
    if (conteudo !== undefined) e.textContent = conteudo;
    if (classe) e.className = classe;
    return e;
  }
  function atual() {
    try { return window.usuariosDemo.atual(); } catch { return null; }
  }
  function linhaComentario(comentario) {
    const p = elemento('p');
    p.append(elemento('strong', comentario.nome), document.createTextNode(`: ${comentario.texto}`));
    return p;
  }
  function comentarios(post) {
    const area = elemento('section', undefined, 'comentarios');
    area.setAttribute('aria-label', 'Comentários');
    area.append(elemento('strong', `${post.totalComentarios} comentários`));
    const respostas = elemento('div');
    respostas.append(...post.comentarios.map(linhaComentario));
    area.append(respostas);
    const erroLeitura = elemento('p');
    erroLeitura.setAttribute('role', 'status');
    const anteriores = elemento('button', 'Carregar mais comentários', 'button secondary');
    anteriores.type = 'button';
    let proximo = post.comentariosCursor;
    anteriores.hidden = !proximo;
    anteriores.addEventListener('click', async () => {
      anteriores.disabled = true;
      erroLeitura.textContent = '';
      try {
        const resultado = await window.publicacoes.comentarios(post.id, proximo);
        respostas.append(...resultado.dados.map(linhaComentario));
        proximo = resultado.proximoCursor;
        anteriores.hidden = !proximo;
      } catch (erro) { erroLeitura.textContent = erro.message; }
      finally { anteriores.disabled = false; }
    });
    area.append(anteriores, erroLeitura);
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
    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      if (botao.disabled) return;
      botao.disabled = true;
      try {
        await window.publicacoes.comentar(post.id, campo.value);
        await renderizar();
        status.textContent = 'Comentário salvo.';
      } catch (erro) { mensagem.textContent = erro.message; }
      finally { botao.disabled = !atual(); }
    });
    area.append(form);
    return area;
  }
  function artigo(post) {
    const article = elemento('article', undefined, 'post');
    const avatar = elemento('span', post.nome[0].toUpperCase(), 'avatar green');
    const corpo = elemento('div');
    const header = elemento('header');
    header.append(elemento('strong', post.nome), elemento('span', post.exemplo
      ? 'Publicação de exemplo' : `@${post.usuario} · ${new Date(post.criadoEm).toLocaleString('pt-BR')}`));
    corpo.append(header, elemento('p', post.texto, 'post-texto'), comentarios(post));
    article.append(avatar, corpo);
    return article;
  }
  async function renderizar(acrescentar = false) {
    const carga = ++versao;
    mais.disabled = true;
    try {
      const resultado = await window.publicacoes.listar(acrescentar ? cursor : null);
      if (carga !== versao) return;
      const artigos = resultado.dados.map(artigo);
      if (acrescentar) lista.append(...artigos);
      else lista.replaceChildren(...artigos);
      cursor = resultado.proximoCursor;
      mais.hidden = !cursor;
    } catch (erro) {
      if (carga === versao) status.textContent = erro.message;
    } finally { if (carga === versao) mais.disabled = false; }
  }
  function atualizar() {
    const perfil = atual();
    publicar.disabled = !perfil;
    texto.disabled = !perfil;
    status.textContent = perfil ? 'Até 280 caracteres · compartilhe com a comunidade' : 'Entre na sua conta para publicar e comentar.';
    perfilForm.hidden = !perfil;
    perfilForm.elements.nome.value = perfil?.nome || '';
    perfilForm.elements.bio.value = perfil?.bio || '';
    perfilStatus.textContent = perfil ? '' : 'Entre para editar seu perfil.';
    renderizar();
  }
  publicar.addEventListener('click', async () => {
    if (publicar.disabled) return;
    publicar.disabled = true;
    try {
      await window.publicacoes.postar(texto.value);
      texto.value = '';
      await renderizar();
      status.textContent = 'Publicação salva!';
    } catch (erro) { status.textContent = erro.message; }
    finally { publicar.disabled = !atual(); }
  });
  perfilForm.addEventListener('submit', async evento => {
    evento.preventDefault();
    const botao = perfilForm.querySelector('button');
    botao.disabled = true;
    try {
      await window.usuariosDemo.editarPerfil(perfilForm.elements.nome.value, perfilForm.elements.bio.value);
      window.dispatchEvent(new Event('perfil-alterado'));
      perfilStatus.textContent = 'Perfil atualizado!';
    } catch (erro) { perfilStatus.textContent = erro.message; }
    finally { botao.disabled = false; }
  });
  mais.addEventListener('click', () => renderizar(true));
  window.addEventListener('conta-alterada', atualizar);
  atualizar();
})();
