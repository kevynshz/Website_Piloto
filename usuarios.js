// O servidor mantém as contas. Este cache serve apenas para desenhar a interface.
window.usuariosDemo = (() => {
  let perfil = null;
  async function sessao() {
    perfil = (await window.api.request('/auth/session')).dados;
    return perfil;
  }
  async function cadastrar(usuario, senha) {
    perfil = (await window.api.request('/auth/register', { method: 'POST', body: { usuario, senha } })).dados;
    return perfil;
  }
  async function validar(usuario, senha) {
    perfil = (await window.api.request('/auth/login', { method: 'POST', body: { usuario, senha } })).dados;
    return true;
  }
  function atual() {
    if (!perfil) throw new Error('Entre na sua conta para continuar.');
    return perfil;
  }
  function obterUsuario(usuario) { return perfil?.usuario === usuario ? perfil : null; }
  async function editarPerfil(nome, bio) {
    perfil = (await window.api.request('/me', { method: 'PATCH', body: { nome, bio } })).dados;
    return perfil;
  }
  async function sair() {
    await window.api.request('/auth/logout', { method: 'POST' });
    perfil = null;
  }
  return Object.freeze({ sessao, cadastrar, validar, atual, obterUsuario, editarPerfil, sair });
})();
