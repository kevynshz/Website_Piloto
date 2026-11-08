# Website_Piloto

## Cadastro e login locais

Abra `base.html` pelo Live Preview do VS Code (localhost) ou em HTTPS.
Clique em **Criar conta**, escolha um usuário e uma senha de teste com pelo
menos 12 caracteres. Depois de cadastrar, você entra automaticamente.
Clique no seu usuário na barra lateral para sair e em **Entrar** para validar
novamente o usuário e a senha.

`usuarios.js` usa a função interna `armazenarUsuario` para persistir cada conta
no localStorage, na chave `eva.usuarios.demo.v1`. O registro inclui usuário,
data de criação, salt aleatório e hash PBKDF2 da senha. A senha original não
é salva. Contas existentes continuam compatíveis.

Os dados sobrevivem à atualização e ao fechamento do navegador. Use sempre
o mesmo navegador, perfil e endereço (incluindo a porta do Live Preview).
Outro endereço, como GitHub Pages, tem armazenamento separado. Limpar os
dados do site remove as contas; navegação anônima não oferece persistência
após fechar a sessão. Sair remove apenas o nome da sessão, preservando a conta.

Este é um teste local: os registros podem ser alterados pelas ferramentas do
navegador e não protegem recursos do site. Use dados fictícios. Um arquivo JS
adicional não torna as contas privadas; para contas compartilhadas entre
dispositivos e autenticação real, é necessário um servidor e banco de dados.

## Publicações, comentários e perfil

Entre em uma conta para escrever até 280 caracteres e clicar em **Publicar**.
Cada publicação, incluindo as de exemplo, tem um formulário de comentários.
Em **Meu perfil**, edite o nome de exibição e a biografia e clique em
**Salvar perfil**. O usuário de login e a senha permanecem iguais.

Publicações e comentários ficam na chave `eva.publicacoes.v1` do localStorage.
O nome e a biografia ficam junto ao cadastro local. Os dados são específicos
para este navegador e endereço; não são compartilhados com outros dispositivos.
Visitantes podem ler, mas precisam entrar para publicar, comentar ou editar.
Essa restrição é apenas de demonstração no navegador, sem autorização de servidor.

Validação automatizada (Node.js):

```bash
node --test tests/comunidade.test.cjs
```
