import { resolve } from 'node:path';
import { createApp } from './app.mjs';
const port = Number(process.env.PORT || 3100);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const host = process.env.HOST || '127.0.0.1';
const origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
const { server, db } = createApp({ databasePath: resolve(process.env.DATABASE_PATH || 'data/comunidade.sqlite'),
  origin, production: process.env.NODE_ENV === 'production' });
server.listen(port, host, () => console.log(`Comunidade e API disponíveis em ${origin}`));
server.on('error', error => { console.error(error.message); db.close(); process.exitCode = 1; });
function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
