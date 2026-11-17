window.publicacoes = Object.freeze({
  listar(cursor = null) {
    return window.api.request(`/posts?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
  },
  async postar(texto) {
    return (await window.api.request('/posts', { method: 'POST', body: { texto } })).dados;
  },
  async comentar(id, texto) {
    return (await window.api.request(`/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { texto } })).dados;
  },
  comentarios(id, cursor) {
    return window.api.request(`/posts/${encodeURIComponent(id)}/comments?limit=20&cursor=${encodeURIComponent(cursor)}`);
  }
});
