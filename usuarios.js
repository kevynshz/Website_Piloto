// Persistência de teste no navegador: nunca salvar senhas em texto puro.
window.usuariosDemo = (() => {
  const chave = 'eva.usuarios.demo.v1';
  const iteracoes = 600000;
  function ler() {
    let conteudo;
    try {
      conteudo = localStorage.getItem(chave);
    } catch {
      throw new Error('O navegador bloqueou o armazenamento das contas. Permita os dados deste site.');
    }
    if (conteudo === null) return [];
    try {
      const registros = JSON.parse(conteudo);
      const bytes = (valor, tamanho) => Array.isArray(valor) && valor.length === tamanho
        && valor.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);
      if (!Array.isArray(registros) || !registros.every((registro) => registro
        && typeof registro.usuario === 'string'
        && bytes(registro.salt, 16) && bytes(registro.hash, 32))) {
        throw new Error();
      }
      return registros;
    } catch {
      throw new Error('Os dados locais das contas estão inválidos. Nenhuma conta foi sobrescrita.');
    }
  }

  // Grava o cadastro de forma persistente, preservando as outras contas.
  // Recebe somente o registro derivado da senha, nunca a senha original.
  function armazenarUsuario(registro) {
    const registros = ler();
    if (registros.some((item) => item.usuario === registro.usuario)) {
      throw new Error('Este usuário já existe neste navegador.');
    }
    registros.push(registro);
    try {
      localStorage.setItem(chave, JSON.stringify(registros));
    } catch {
      throw new Error('Não foi possível salvar a conta. Verifique o espaço e as permissões do navegador.');
    }
  }
  const normalizar = (usuario) => {
    if (typeof usuario !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(usuario.trim())) {
      throw new Error('Use um usuário com 3 a 30 letras, números ou sublinhados.');
    }
    return usuario.trim().toLowerCase();
  };

  async function derivar(senha, salt) {
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: iteracoes, hash: 'SHA-256' },
      material, 256
    );
    return Array.from(new Uint8Array(bits));
  }

  async function cadastrar(usuario, senha) {
    const nome = normalizar(usuario);
    if (typeof senha !== 'string' || senha.length < 12) {
      throw new Error('Use uma senha fictícia com pelo menos 12 caracteres.');
    }
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await derivar(senha, salt);
    armazenarUsuario({ usuario: nome, salt, hash, criadoEm: new Date().toISOString() });
    return { usuario: nome };
  }

  async function validar(usuario, senha) {
    const nome = normalizar(usuario);
    if (typeof senha !== 'string') return false;
    const registro = ler().find((item) => item.usuario === nome);
    if (!registro) return false;
    const hash = await derivar(senha, registro.salt);
    return hash.every((byte, indice) => byte === registro.hash[indice]);
  }

  function obterUsuario(usuario) {
    const registro = ler().find((item) => item.usuario === normalizar(usuario));
    return registro ? { usuario: registro.usuario, nome: registro.nome || registro.usuario,
      bio: registro.bio || '', criadoEm: registro.criadoEm || null } : null;
  }

  function atual() {
    const usuario = localStorage.getItem('eva.sessao.demo.v1');
    const perfil = usuario ? obterUsuario(usuario) : null;
    if (!perfil) throw new Error('Entre na sua conta para continuar.');
    return perfil;
  }

  function editarPerfil(nome, bio) {
    const perfil = atual();
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 50) {
      throw new Error('O nome deve ter entre 1 e 50 caracteres.');
    }
    if (typeof bio !== 'string' || bio.trim().length > 160) {
      throw new Error('A biografia deve ter até 160 caracteres.');
    }
    const registros = ler();
    const registro = registros.find((item) => item.usuario === perfil.usuario);
    registro.nome = nome.trim();
    registro.bio = bio.trim();
    localStorage.setItem(chave, JSON.stringify(registros));
    return obterUsuario(perfil.usuario);
  }

  return Object.freeze({ cadastrar, validar, obterUsuario, atual, editarPerfil });
})();
