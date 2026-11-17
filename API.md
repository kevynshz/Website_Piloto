# API HTTP v1

Base: `/api/v1`. O front-end usa a mesma origem da API. Dados em UTF-8 e JSON.
Sucesso: `{ "dados": ..., "requestId": "..." }`.
Erro: `{ "erro": { "codigo": "...", "mensagem": "..." }, "requestId": "..." }`.
A listagem inclui `proximoCursor`, que é `null` no fim dos resultados.

| Método | Rota | Corpo / observação |
| --- | --- | --- |
| GET | `/health` | Disponibilidade do servidor |
| POST | `/auth/register` | `{ "usuario": "ana", "senha": "uma-senha-longa-123" }`; cria conta e sessão |
| POST | `/auth/login` | Mesmo formato; inicia outra sessão |
| GET | `/auth/session` | Usuário da sessão ou `null` |
| POST | `/auth/logout` | Revoga a sessão atual |
| GET | `/me` | Perfil da conta autenticada |
| PATCH | `/me` | `{ "nome": "Ana Silva", "bio": "Moradora" }` |
| GET | `/posts?limit=20&cursor=123` | Mais recentes primeiro; cursor é opcional |
| POST | `/posts` | `{ "texto": "Olá, vizinhos!" }` |
| GET | `/posts/:id/comments?limit=20&cursor=123` | Mais antigos primeiro; cursor opcional |
| POST | `/posts/:id/comments` | `{ "texto": "Bem-vinda!" }` |

Leitura de posts e comentários é pública nesta versão, assim como a exploração
como visitante no protótipo. Publicar, comentar e editar exigem sessão válida.
O autor vem do cookie validado no servidor; o cliente não escolhe o autor.
Editar perfil afeta apenas a conta da sessão, preservando usuário de login e senha.

Usuário: 3–30 letras ASCII, números ou sublinhado, sem diferença entre maiúsculas
e minúsculas. Senha: 12–128 caracteres. Nome: 1–50. Bio: 0–160. Post/comentário:
1–280 caracteres após remover espaços nas pontas. Paginação: 1–50 itens,
cursor inteiro positivo. Posts incluem os primeiros 20 comentários, total e
`comentariosCursor`; use a rota de comentários para buscar os próximos.
Limite do corpo JSON: 16 KiB. Não há endpoint que retorne hash de senha.

## Exemplo pelo terminal

```bash
curl -c /tmp/entre-cookies.txt http://localhost:3100/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -H 'X-Requested-With: entre-web' \
  -d '{"usuario":"ana","senha":"senha-de-teste-123"}'

curl -b /tmp/entre-cookies.txt http://localhost:3100/api/v1/posts \
  -H 'Content-Type: application/json' \
  -H 'X-Requested-With: entre-web' \
  -d '{"texto":"Olá, comunidade!"}'

curl http://localhost:3100/api/v1/posts
```

Requisições de escrita precisam do cabeçalho `X-Requested-With: entre-web`.
Quando `Origin` estiver presente, deve coincidir com `APP_ORIGIN`. CORS entre
origens diferentes não está habilitado. O cookie é HttpOnly, SameSite=Strict,
com validade de sete dias e Secure em produção. Tokens são aleatórios e somente
seu hash fica no banco. Logout invalida o token no servidor.

Cadastros e logins compartilham limite de 20 tentativas por IP em dez minutos,
guardado no banco. O servidor usa o IP da conexão e não confia em cabeçalhos de
proxy enviados pelo cliente. Configure IPs de proxies confiáveis explicitamente
se precisar de limite individual atrás de um balanceador; nesta versão, um proxy
compartilha a cota. Outras rotas devem ganhar limites específicos conforme o uso.

Erros comuns: 400 entrada inválida, 401 sessão ausente/credenciais inválidas,
403 origem inválida, 404 recurso ausente, 409 usuário existente, 413 corpo grande,
415 conteúdo diferente de JSON, 429 limite de tentativas. Erros internos não
expõem detalhes do banco ao cliente; `requestId` permite correlacionar o log.

## Evolução

O contrato `/api/v1` separa o cliente do armazenamento. Migrações SQL são
aplicadas uma vez por arquivo e envolvidas em transação. Não edite migrações
já aplicadas: acrescente `002_...sql` e seguintes.

SQLite e consultas síncronas atendem a fase inicial em uma máquina. As camadas
separadas facilitam substituir o repositório, mas migrar para PostgreSQL ainda
exige adaptar consultas, transações, sessões, limites e os testes. Antes de abrir
o cadastro de um condomínio real, acrescente convite/aprovação de moradores,
recuperação de senha e regras de acesso adequadas à comunidade.
