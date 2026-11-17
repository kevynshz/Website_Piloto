export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function text(value, field, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new ApiError(400, 'INVALID_INPUT', `${field}: use entre ${min} e ${max} caracteres.`);
  }
  return value.trim();
}
export function username(value) {
  const name = text(value, 'Usuário', 3, 30).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(name)) throw new ApiError(400, 'INVALID_INPUT', 'Use letras, números ou sublinhados no usuário.');
  return name;
}
