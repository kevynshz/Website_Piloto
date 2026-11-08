const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dados = new Map();
function abrir() {
  const contexto = { window: {}, crypto: require('node:crypto').webcrypto, TextEncoder,
    localStorage: { getItem: k => dados.get(k) ?? null,
      setItem: (k,v) => dados.set(k,v), removeItem: k => dados.delete(k) } };
  vm.createContext(contexto);
  for (const arquivo of ['usuarios.js', 'publicacoes.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), contexto);
  }
  return contexto.window;
}
test('publicações, comentários e perfil persistem e exigem conta local', async () => {
  let app = abrir();
  assert.throws(() => app.publicacoes.postar('teste'), /Entre/);
  assert.throws(() => app.usuariosDemo.editarPerfil('Teste', ''), /Entre/);
  await app.usuariosDemo.cadastrar('ana', 'senha-ficticia-123');
  await app.usuariosDemo.cadastrar('bia', 'outra-ficticia-123');
  dados.set('eva.sessao.demo.v1', 'ana');
  assert.throws(() => app.publicacoes.postar('  '), /280/);
  assert.throws(() => app.publicacoes.postar('a'.repeat(281)), /280/);
  const post = app.publicacoes.postar('Primeira publicação');
  app.publicacoes.comentar(post.id, 'Meu comentário');
  app.publicacoes.comentar('marina', 'Comentário no exemplo');
  assert.throws(() => app.publicacoes.comentar('inexistente', 'Oi'), /não encontrada/);
  assert.throws(() => app.publicacoes.comentar(post.id, ' '), /280/);
  assert.throws(() => app.usuariosDemo.editarPerfil('', ''), /nome/);
  assert.throws(() => app.usuariosDemo.editarPerfil('Ana', 'a'.repeat(161)), /biografia/);
  app.usuariosDemo.editarPerfil('Ana Silva', 'Gosto de café.');
  app = abrir();
  assert.equal(app.publicacoes.listar()[0].texto, 'Primeira publicação');
  assert.equal(app.publicacoes.listar()[0].comentarios[0].texto, 'Meu comentário');
  assert.equal(app.usuariosDemo.atual().nome, 'Ana Silva');
  assert.equal(app.usuariosDemo.atual().bio, 'Gosto de café.');
  assert.equal(await app.usuariosDemo.validar('ana', 'senha-ficticia-123'), true);
  assert.equal(app.usuariosDemo.obterUsuario('bia').nome, 'bia');
  dados.delete('eva.sessao.demo.v1');
  assert.throws(() => app.publicacoes.comentar(post.id, 'Oi'), /Entre/);
  assert.throws(() => app.usuariosDemo.editarPerfil('Outro', ''), /Entre/);
  assert.equal(app.publicacoes.listar()[0].comentarios.length, 1);
});
