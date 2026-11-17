// Todas as chamadas usam a mesma origem do site; o cookie de sessão é HttpOnly.
window.api = Object.freeze({
  async request(path, { method = 'GET', body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/v1${path}`, {
        method, credentials: 'same-origin', signal: controller.signal,
        headers: { 'X-Requested-With': 'entre-web', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const result = await response.json().catch(() => null);
      if (!result) throw new Error('Abra o site pelo servidor: execute npm start e acesse http://localhost:3100.');
      if (!response.ok) {
        const error = new Error(result.erro?.mensagem || 'Não foi possível concluir a solicitação.');
        error.status = response.status;
        error.requestId = result.requestId;
        throw error;
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('O servidor demorou para responder. Tente novamente.');
      if (error instanceof TypeError) throw new Error('Sem conexão com a API. Execute npm start e abra http://localhost:3100.');
      throw error;
    } finally { clearTimeout(timer); }
  }
});
