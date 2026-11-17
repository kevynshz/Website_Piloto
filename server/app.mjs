import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { openDatabase } from './database.mjs';
import { createAuth } from './auth.mjs';
import { createRepository, page } from './repository.mjs';
import { ApiError } from './errors.mjs';
const assets = new Map([
  ['/', ['base.html', 'text/html']], ['/base.html', ['base.html', 'text/html']],
  ...['base.css', 'comunidade-tema.css'].map(name => [`/${name}`, [name, 'text/css']]),
  ...['api.js', 'usuarios.js', 'conta.js', 'publicacoes.js', 'comunidade.js', 'residences.js', 'tema.js']
    .map(name => [`/${name}`, [name, 'text/javascript']])
]);
async function readBody(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'Envie dados em JSON.');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new ApiError(413, 'BODY_TOO_LARGE', 'Requisição muito grande.');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new ApiError(400, 'INVALID_JSON', 'JSON inválido.'); }
}
export function createApp({ databasePath = ':memory:', origin = 'http://localhost:3100', production = false, logger = console.error } = {}) {
  origin = new URL(origin).origin;
  const db = openDatabase(databasePath);
  const auth = createAuth(db, { production });
  const repository = createRepository(db);
  const server = createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https://images.unsplash.com; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    const send = (status, data, cookie) => {
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      if (cookie) response.setHeader('Set-Cookie', cookie);
      response.end(JSON.stringify({ ...data, requestId }));
    };
    try {
      const url = new URL(request.url, origin);
      const method = request.method;
      const path = url.pathname;
      if (!path.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
        const asset = assets.get(path);
        if (!asset) throw new ApiError(404, 'NOT_FOUND', 'Página não encontrada.');
        const data = await readFile(new URL(`../${asset[0]}`, import.meta.url));
        response.setHeader('Content-Type', `${asset[1]}; charset=utf-8`);
        response.setHeader('Cache-Control', 'no-cache');
        response.end(method === 'HEAD' ? undefined : data);
        return;
      }
      if (!['GET', 'HEAD'].includes(method)) {
        // JSON + cabeçalho exclusivo impedem formulários cross-site; Origin é validado também.
        if (request.headers['x-requested-with'] !== 'entre-web'
          || (request.headers.origin && request.headers.origin !== origin)
          || request.headers['sec-fetch-site'] === 'cross-site') {
          throw new ApiError(403, 'INVALID_ORIGIN', 'Origem da requisição não permitida.');
        }
      }
      if (method === 'GET' && path === '/api/v1/health') return send(200, { dados: { status: 'ok' } });
      if (method === 'GET' && path === '/api/v1/auth/session') return send(200, { dados: auth.current(request, false) });
      if (method === 'POST' && ['/api/v1/auth/register', '/api/v1/auth/login'].includes(path)) {
        auth.limit(request.socket.remoteAddress);
        const body = await readBody(request);
        const result = await (path.endsWith('/register') ? auth.register(body) : auth.login(body));
        return send(path.endsWith('/register') ? 201 : 200, { dados: result.user }, result.cookie);
      }
      if (method === 'POST' && path === '/api/v1/auth/logout') return send(200, { dados: null }, auth.logout(request));
      if (path === '/api/v1/me' && method === 'GET') return send(200, { dados: auth.current(request) });
      if (path === '/api/v1/me' && method === 'PATCH') {
        const user = auth.current(request);
        return send(200, { dados: repository.profile(user, await readBody(request)) });
      }
      if (path === '/api/v1/posts' && method === 'GET') return send(200, repository.list(page(url.searchParams)));
      if (path === '/api/v1/posts' && method === 'POST') {
        const user = auth.current(request);
        return send(201, { dados: repository.post(user, await readBody(request)) });
      }
      const match = path.match(/^\/api\/v1\/posts\/([a-zA-Z0-9-]{1,64})\/comments$/);
      if (match && method === 'GET') return send(200, repository.comments(match[1], page(url.searchParams)));
      if (match && method === 'POST') {
        const user = auth.current(request);
        return send(201, { dados: repository.comment(user, match[1], await readBody(request)) });
      }
      throw new ApiError(404, 'NOT_FOUND', 'Rota não encontrada.');
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      if (!(error instanceof ApiError)) logger({ requestId, error });
      send(error instanceof ApiError ? error.status : 500,
        { erro: { codigo: error.code && error instanceof ApiError ? error.code : 'INTERNAL_ERROR',
          mensagem: error instanceof ApiError ? error.message : 'Erro interno. Tente novamente.' } });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxRequestsPerSocket = 1000;
  return { server, db };
}
