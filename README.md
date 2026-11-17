# Entre · Comunidade

Comunidade de moradores com cadastro, login, edição de perfil, publicações,
comentários e temas claro/escuro. O site e a API são servidos pelo mesmo Node.js.

## Executar

Requer **Node.js 24 ou superior**, com suporte ao módulo nativo `node:sqlite`.
Não há dependências externas para instalar.

```bash
cd "/Users/kevyn/Documents/vscode projects/website_piloto"
npm start
```

Abra **http://localhost:3100**. O banco é criado automaticamente em
`data/comunidade.sqlite`; ele permanece no disco ao fechar o servidor.
Para desenvolvimento com reinicialização automática, use `npm run dev`.
Encerre com `Ctrl + C`.

Para visualizar dentro do VS Code, inicie o servidor e use **Simple Browser:
Show** pela paleta de comandos, informando `http://localhost:3100`.
O Live Preview serve apenas arquivos estáticos e não inicia a API.

Opcionalmente copie `.env.example` para `.env` e ajuste host, porta, origem e
caminho do banco. `.env` e o banco estão excluídos do Git. O tema continua salvo
no navegador. Contas e conteúdos agora são guardados pelo servidor.

## Dados do protótipo anterior

Os registros antigos do localStorage não são apagados nem enviados automaticamente.
As contas do banco são independentes: cadastre uma conta pela nova API.
Uma migração de dados antigos deve validar a posse de cada conta; importar
livremente usuários e hashes enviados pelo navegador permitiria falsificar contas.

## Organização e API

- `server/app.mjs`: HTTP, rotas versionadas, validação de origem e erros.
- `server/auth.mjs`: senhas scrypt, sessões HttpOnly e limite de tentativas.
- `server/repository.mjs`: consultas parametrizadas, perfil, posts e comentários.
- `server/database.mjs` e `server/migrations/`: banco e migrações versionadas.
- `api.js`: cliente fetch centralizado, timeout e tratamento de falhas.
- `usuarios.js` e `publicacoes.js`: operações do site que consomem a API.
- `tests/api.test.mjs`: testes HTTP com banco temporário isolado.

Consulte [API.md](API.md) para rotas, exemplos e decisões de evolução.

```bash
npm test
```

Os testes cobrem cadastro, login, sessão, logout, edição do próprio perfil,
publicações, comentários, paginação, persistência após reiniciar, expiração,
validação, proteção contra requisições de outra origem e acesso a arquivos privados.
A pipeline do GitHub executa esses testes a cada push e pull request.

## Implantação e crescimento

Esta versão atende uma comunidade em um servidor com disco persistente.
O SQLite usa WAL, chaves estrangeiras, índices e migrações. Faça backups
consistentes com a ferramenta de backup do SQLite, incluindo dados necessários
para restauração; copiar só o arquivo principal enquanto há escritas pode perder
transações do WAL. Teste a restauração dos backups.

Para produção, use um serviço que execute Node.js, disco persistente, proxy HTTPS,
`NODE_ENV=production` e `APP_ORIGIN=https://seu-dominio`. O cookie terá `Secure`.
GitHub Pages hospeda arquivos estáticos e não executa este servidor.

Para múltiplas instâncias ou alto volume de escrita, migre o repositório para
PostgreSQL e compartilhe o armazenamento das sessões e do limite de tentativas.
Não compartilhe SQLite em disco de rede. Para vários condomínios, introduza
condomínio, associação de moradores e autorização em todas as consultas antes de
aceitar dados de grupos distintos. Uploads devem ir para armazenamento de objetos.

O mural de avisos ainda é ilustrativo. Um painel administrativo exigirá papéis
e permissões próprios. A direção visual usa fotografias externas do Unsplash,
contraste escuro e tipografia editorial, inspirada na referência visual enviada.
