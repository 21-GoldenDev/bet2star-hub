export const MIN_HIERARCHY_PASSWORD_LENGTH = 6;

export function validateHierarchyPassword(password: string) {
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < MIN_HIERARCHY_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_HIERARCHY_PASSWORD_LENGTH} characters for staff and agent login.`;
  }
  return null;
}
