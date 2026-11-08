// Dados locais de demonstração; a sessão não substitui autorização no servidor.
window.publicacoes = (() => {
  const chave = 'eva.publicacoes.v1';
  const exemplos = ['marina', 'rafael', 'bia'];
  function ler() {
    const dados = JSON.parse(localStorage.getItem(chave) || '[]');
    if (!Array.isArray(dados) || !dados.every(p => p && typeof p.id === 'string'
      && typeof p.usuario === 'string' && typeof p.texto === 'string'
      && Array.isArray(p.comentarios) && p.comentarios.every(c => c
        && typeof c.usuario === 'string' && typeof c.texto === 'string'))) {
      throw new Error('Os dados das publicações estão inválidos.');
    }
    return dados;
  }
  function textoValido(texto) {
    if (typeof texto !== 'string' || !texto.trim() || texto.trim().length > 280) {
      throw new Error('Escreva entre 1 e 280 caracteres.');
    }
    return texto.trim();
  }
  function postar(texto) {
    const autor = window.usuariosDemo.atual();
    const post = { id: crypto.randomUUID(), usuario: autor.usuario,
      texto: textoValido(texto), criadoEm: new Date().toISOString(), comentarios: [] };
    const dados = ler();
    dados.unshift(post);
    localStorage.setItem(chave, JSON.stringify(dados));
    return post;
  }
  function comentar(id, texto) {
    const autor = window.usuariosDemo.atual();
    const comentario = { usuario: autor.usuario, texto: textoValido(texto), criadoEm: new Date().toISOString() };
    const dados = ler();
    let post = dados.find(p => p.id === id);
    if (!post) {
      if (!exemplos.includes(id)) throw new Error('Publicação não encontrada.');
      post = { id, usuario: '', texto: '', comentarios: [] };
      dados.push(post);
    }
    post.comentarios.push(comentario);
    localStorage.setItem(chave, JSON.stringify(dados));
    return comentario;
  }
  return Object.freeze({ listar: ler, postar, comentar });
})();
