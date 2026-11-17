import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.mjs';
const origin = 'http://localhost:3000';
async function start(options = {}) {
  const app = createApp({ origin, logger: error => { throw error.error; }, ...options });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { ...app, base, async close() {
    const closed = once(app.server, 'close');
    app.server.close(); app.server.closeAllConnections(); await closed; app.db.close();
  } };
}
async function request(app, path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(app.base + path, { method,
    headers: { 'X-Requested-With': 'entre-web', Origin: origin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  return { response, status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const register = (app, usuario = 'ana') => request(app, '/api/v1/auth/register', {
  method: 'POST', body: { usuario, senha: 'senha-de-teste-123' } });

test('cadastro, sessão, perfil, postagens, comentários e logout HTTP', async t => {
  const app = await start(); t.after(() => app.close());
  const registered = await register(app);
  assert.equal(registered.status, 201);
  assert.match(registered.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const cookie = registered.cookie;
  const id = registered.body.dados.id;
  assert.equal(registered.body.dados.password_hash, undefined);
  assert.ok(!JSON.stringify(registered.body).includes('senha-de-teste'));
  assert.equal((await request(app, '/api/v1/auth/session', { cookie })).body.dados.usuario, 'ana');
  assert.equal((await register(app)).status, 409);
  assert.equal((await request(app, '/api/v1/auth/login', { method: 'POST', body: { usuario: 'ana', senha: 'errada' } })).status, 401);
  assert.equal((await request(app, '/api/v1/auth/login', { method: 'POST', body: { usuario: 'ANA', senha: 'senha-de-teste-123' } })).status, 200);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', body: { texto: 'Sem conta' } })).status, 401);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: '  ' } })).status, 400);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'a'.repeat(281) } })).status, 400);
  const post = await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'Olá, vizinhos!', user_id: 'forjado' } });
  assert.equal(post.status, 201); assert.equal(post.body.dados.usuario, 'ana');
  const postId = post.body.dados.id;
  const comment = await request(app, `/api/v1/posts/${postId}/comments`, { method: 'POST', cookie, body: { texto: 'Bem-vinda!' } });
  assert.equal(comment.status, 201);
  assert.equal((await request(app, '/api/v1/posts/inexistente/comments', { method: 'POST', cookie, body: { texto: 'Teste' } })).status, 404);
  await register(app, 'bia');
  const edit = await request(app, '/api/v1/me', { method: 'PATCH', cookie, body: { nome: 'Ana Silva', bio: 'Moradora', id: 'bia' } });
  assert.equal(edit.body.dados.id, id);
  assert.equal(app.db.prepare("SELECT name FROM users WHERE username='bia'").get().name, 'bia');
  assert.equal((await request(app, `/api/v1/posts/${postId}/comments`)).body.dados[0].nome, 'Ana Silva');
  assert.equal((await request(app, '/api/v1/me', { method: 'PATCH', cookie, body: { nome: '', bio: '' } })).status, 400);
  await request(app, '/api/v1/auth/logout', { method: 'POST', cookie });
  assert.equal((await request(app, '/api/v1/me', { cookie })).status, 401);
});

test('banco e sessões sobrevivem ao reinício; sessão expirada é rejeitada', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'entre-api-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = join(dir, 'db.sqlite');
  let app = await start({ databasePath });
  const { cookie } = await register(app);
  await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'Persistência real' } });
  await app.close();
  app = await start({ databasePath }); t.after(() => app.close());
  assert.equal((await request(app, '/api/v1/me', { cookie })).status, 200);
  assert.equal((await request(app, '/api/v1/posts')).body.dados[0].texto, 'Persistência real');
  assert.equal(app.db.prepare('SELECT COUNT(*) AS total FROM migrations').get().total, 1);
  app.db.prepare('UPDATE sessions SET expires_at=0').run();
  assert.equal((await request(app, '/api/v1/me', { cookie })).status, 401);
});

test('paginação, JSON inválido, CSRF, arquivos privados e limite de autenticação', async t => {
  const app = await start(); t.after(() => app.close());
  const { cookie } = await register(app);
  for (let n = 0; n < 23; n++) {
    const response = await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: `Publicação ${n}` } });
    assert.equal(response.status, 201);
  }
  const first = (await request(app, '/api/v1/posts?limit=5')).body;
  const second = (await request(app, `/api/v1/posts?limit=5&cursor=${first.proximoCursor}`)).body;
  assert.equal(first.dados.length, 5); assert.equal(second.dados.length, 5);
  assert.equal(new Set([...first.dados, ...second.dados].map(p => p.id)).size, 10);
  for (let n = 0; n < 4; n++) await request(app, '/api/v1/posts/marina/comments', { method: 'POST', cookie, body: { texto: `Resposta ${n}` } });
  const comments = (await request(app, '/api/v1/posts/marina/comments?limit=2')).body;
  assert.equal(comments.dados.length, 2);
  const more = (await request(app, `/api/v1/posts/marina/comments?limit=2&cursor=${comments.proximoCursor}`)).body;
  assert.equal(more.dados[0].texto, 'Resposta 2');
  assert.equal(more.proximoCursor, null);
  assert.equal((await request(app, '/api/v1/posts?limit=500')).status, 400);
  assert.equal((await request(app, '/api/v1/posts?cursor=abc')).status, 400);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: '{' })).status, 400);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'Teste' }, headers: { Origin: 'https://outro.site' } })).status, 403);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'Teste' }, headers: { 'X-Requested-With': '' } })).status, 403);
  assert.equal((await request(app, '/api/v1/posts', { method: 'POST', cookie, body: { texto: 'a'.repeat(17000) } })).status, 413);
  for (const path of ['/server/database.mjs', '/data/comunidade.sqlite', '/.env', '/.git/config']) {
    assert.equal((await request(app, path)).status, 404);
  }
  const html = await fetch(app.base + '/'); assert.equal(html.status, 200);
  assert.match(await html.text(), /api.js/);
  assert.ok(html.headers.get('content-security-policy'));
  const badCookie = 'entre_session=forjado';
  assert.equal((await request(app, '/api/v1/me', { cookie: badCookie })).status, 401);
  for (let n = 0; n < 20; n++) await request(app, '/api/v1/auth/login', { method: 'POST', body: { usuario: '?', senha: '' } });
  assert.equal((await register(app, 'novo')).status, 429);
});
