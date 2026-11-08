window.usuariosDemo = (() => {
  const chave = 'eva.usuarios.demo.v1';
  const iteracoes = 600000;
  const ler = () => JSON.parse(localStorage.getItem(chave) || '[]');
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
    const registros = ler();
    if (registros.some((registro) => registro.usuario === nome)) {
      throw new Error('Este usuário já existe neste navegador.');
    }
    registros.push({ usuario: nome, salt, hash });
    localStorage.setItem(chave, JSON.stringify(registros));
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

  return Object.freeze({ cadastrar, validar });
})();
