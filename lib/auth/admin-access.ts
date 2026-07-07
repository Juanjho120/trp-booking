export const ADMIN_ROLE = "ADMIN" as const;

export type AdminRole = typeof ADMIN_ROLE;

export function normalizeAdminEmail(email: string | null | undefined): string | null {
  const normalizedEmail = email?.trim().toLowerCase();

  return normalizedEmail ? normalizedEmail : null;
}

export function isAllowedAdminEmail(
  email: string | null | undefined,
  allowedAdminEmails: ReadonlySet<string>,
): boolean {
  const normalizedEmail = normalizeAdminEmail(email);

  return normalizedEmail ? allowedAdminEmails.has(normalizedEmail) : false;
}
