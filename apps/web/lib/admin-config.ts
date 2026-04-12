/**
 * Control de acceso opcional.
 * - Google: listas ALLOWED_USER_EMAILS / ADMIN_EMAILS.
 * - Usuario/contraseña: NEXTAUTH_CREDENTIALS_* → sesión con email fijo (admin y enlace Visibilidad).
 */

/** Email fijo en JWT/sesión tras login por Credentials (no es un correo real). */
export const CREDENTIALS_ADMIN_SESSION_EMAIL = "hexaminer-admin@local";

export function isCredentialsLoginConfigured(): boolean {
  const u = process.env.NEXTAUTH_CREDENTIALS_USER?.trim();
  const p = process.env.NEXTAUTH_CREDENTIALS_PASSWORD;
  return Boolean(u && p != null && String(p).length > 0);
}

export function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Si hay lista, el sitio exige sesión en rutas protegidas por middleware. */
export function isPrivateSiteEnabled(): boolean {
  return parseEmailList(process.env.ALLOWED_USER_EMAILS).length > 0;
}

/**
 * Admin: ADMIN_EMAILS si está definido; si no, misma lista que ALLOWED_USER_EMAILS
 * (un solo operador con un correo).
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (isCredentialsLoginConfigured() && e === CREDENTIALS_ADMIN_SESSION_EMAIL.toLowerCase()) {
    return true;
  }
  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  if (admins.length > 0) return admins.includes(e);
  const allowed = parseEmailList(process.env.ALLOWED_USER_EMAILS);
  if (allowed.length > 0) return allowed.includes(e);
  return false;
}
