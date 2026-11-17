import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)');
  const folder = new URL('./migrations/', import.meta.url);
  for (const name of readdirSync(folder).filter(name => name.endsWith('.sql')).sort()) {
    if (db.prepare('SELECT name FROM migrations WHERE name = ?').get(name)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(new URL(name, folder), 'utf8'));
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  // IDs fixos mantêm os exemplos reconhecíveis, sem criar contas fictícias.
  const seed = db.prepare('INSERT OR IGNORE INTO posts (id, example_name, body, created_at) VALUES (?, ?, ?, ?)');
  for (const [id, name, text] of [
    ['marina', 'Marina Costa', 'Acabamos de chegar! Alguém indica um bom café pelo bairro? Vamos adorar conhecer nossos vizinhos.'],
    ['rafael', 'Rafael Lima', 'Que tal um grupo de caminhada pela manhã? Quem anima um encontro no jardim?'],
    ['bia', 'Bia Alves', 'O pôr do sol no lounge é especial. Que tal fazer uma pausa e conhecer a vizinhança?']
  ]) seed.run(id, name, text, '2026-11-01T12:00:00.000Z');
  return db;
}
