import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError, username } from './errors.mjs';
const scrypt = promisify(scryptCallback);
const digest = token => createHash('sha256').update(token).digest('hex');
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const duration = 7 * 24 * 60 * 60 * 1000;
export function publicUser(row) {
  return { id: row.id, usuario: row.username, nome: row.name, bio: row.bio, criadoEm: row.created_at };
}
export function createAuth(db, { production = false } = {}) {
  const cookieName = production ? '__Host-entre_session' : 'entre_session';
  function cookie(token, logout = false) {
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${logout ? 0 : duration / 1000}${production ? '; Secure' : ''}`;
  }
  function issue(user) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(digest(token), user.id, Date.now() + duration);
    return { user: publicUser(user), cookie: cookie(token) };
  }
  function tokenFrom(request) {
    const part = (request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
    return part?.slice(cookieName.length + 1) || '';
  }
  function current(request, required = true) {
    const token = tokenFrom(request);
    const user = /^[a-f0-9]{64}$/.test(token) ? db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`).get(digest(token), Date.now()) : null;
    if (!user && required) throw new ApiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.');
    return user ? publicUser(user) : null;
  }
  function limit(ip) {
    const now = Date.now();
    db.prepare('DELETE FROM auth_limits WHERE reset_at <= ?').run(now);
    // Compartilhado entre processos que usam este banco. Não confiar em X-Forwarded-For do cliente.
    const key = digest(ip || 'unknown');
    db.prepare(`INSERT INTO auth_limits (key, attempts, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`).run(key, now + 10 * 60 * 1000);
    if (db.prepare('SELECT attempts FROM auth_limits WHERE key = ?').get(key).attempts > 20) {
      throw new ApiError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde 10 minutos.');
    }
  }
  async function register(body) {
    const name = username(body.usuario);
    if (typeof body.senha !== 'string' || body.senha.length < 12 || body.senha.length > 128) {
      throw new ApiError(400, 'INVALID_INPUT', 'A senha deve ter entre 12 e 128 caracteres.');
    }
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(name)) throw new ApiError(409, 'USER_EXISTS', 'Este usuário já existe.');
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(body.senha, salt, 64, options)).toString('hex');
    const id = randomUUID();
    try {
      db.prepare('INSERT INTO users (id, username, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, `scrypt-v1:${salt}:${hash}`, name, new Date().toISOString());
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) throw new ApiError(409, 'USER_EXISTS', 'Este usuário já existe.');
      throw error;
    }
    return issue(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  }
  async function login(body) {
    const name = username(body.usuario);
    if (typeof body.senha !== 'string' || body.senha.length > 128) throw new ApiError(400, 'INVALID_INPUT', 'Senha inválida.');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(name);
    const [, salt, expected] = (user?.password_hash || `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
    const actual = await scrypt(body.senha, salt, 64, options);
    if (!user || !timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Usuário ou senha incorretos.');
    return issue(user);
  }
  function logout(request) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(tokenFrom(request)));
    return cookie('', true);
  }
  return { current, register, login, logout, limit };
}
