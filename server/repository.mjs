import { randomUUID } from 'node:crypto';
import { ApiError, text } from './errors.mjs';
import { publicUser } from './auth.mjs';
export function page(query) {
  const value = (name, fallback, max) => {
    const raw = query.get(name);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n) || n < 1 || n > max) throw new ApiError(400, 'INVALID_PAGE', 'Paginação inválida.');
    return n;
  };
  return { limit: value('limit', 20, 50), cursor: value('cursor', null, Number.MAX_SAFE_INTEGER) };
}
export function createRepository(db) {
  const postSelect = `SELECT p.*, u.username, u.name FROM posts p LEFT JOIN users u ON u.id = p.user_id`;
  function requirePost(id) {
    if (!db.prepare('SELECT id FROM posts WHERE id = ?').get(id)) throw new ApiError(404, 'NOT_FOUND', 'Publicação não encontrada.');
  }
  function comments(id, { limit = 20, cursor = null } = {}) {
    requirePost(id);
    const rows = db.prepare(`SELECT c.*, u.username, u.name FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ? AND c.seq > ? ORDER BY c.seq ASC LIMIT ?`).all(id, cursor || 0, limit + 1);
    const more = rows.length > limit;
    const result = rows.slice(0, limit);
    return { dados: result.map(c => ({ id: c.id, usuario: c.username, nome: c.name, texto: c.body, criadoEm: c.created_at })),
      proximoCursor: more ? result.at(-1).seq : null };
  }
  function serialize(row) {
    const first = comments(row.id);
    return { id: row.id, usuario: row.username || 'administracao', nome: row.name || row.example_name,
      exemplo: !row.user_id, texto: row.body, criadoEm: row.created_at, comentarios: first.dados,
      comentariosCursor: first.proximoCursor,
      totalComentarios: db.prepare('SELECT COUNT(*) AS total FROM comments WHERE post_id = ?').get(row.id).total };
  }
  function list({ limit, cursor }) {
    const rows = db.prepare(`${postSelect} WHERE p.seq < ? ORDER BY p.seq DESC LIMIT ?`)
      .all(cursor || Number.MAX_SAFE_INTEGER, limit + 1);
    const result = rows.slice(0, limit);
    return { dados: result.map(serialize), proximoCursor: rows.length > limit ? result.at(-1).seq : null };
  }
  function post(user, body) {
    const value = text(body.texto, 'Publicação', 1, 280);
    const id = randomUUID();
    db.prepare('INSERT INTO posts (id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
      .run(id, user.id, value, new Date().toISOString());
    return serialize(db.prepare(`${postSelect} WHERE p.id = ?`).get(id));
  }
  function comment(user, id, body) {
    requirePost(id);
    const value = text(body.texto, 'Comentário', 1, 280);
    const result = { id: randomUUID(), usuario: user.usuario, nome: user.nome, texto: value, criadoEm: new Date().toISOString() };
    db.prepare('INSERT INTO comments (id, post_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(result.id, id, user.id, value, result.criadoEm);
    return result;
  }
  function profile(user, body) {
    const name = text(body.nome, 'Nome', 1, 50);
    const bio = text(body.bio, 'Biografia', 0, 160);
    db.prepare('UPDATE users SET name = ?, bio = ? WHERE id = ?').run(name, bio, user.id);
    return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id));
  }
  return { list, post, comments, comment, profile };
}
