export const MIN_AUTH_PASSWORD_LENGTH = 6;

export function validateAuthPassword(password: string, context: "hierarchy" | "online" = "online") {
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < MIN_AUTH_PASSWORD_LENGTH) {
    if (context === "hierarchy") {
      return `Password must be at least ${MIN_AUTH_PASSWORD_LENGTH} characters for staff and agent login.`;
    }
    return `Password must be at least ${MIN_AUTH_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validateHierarchyPassword(password: string) {
  return validateAuthPassword(password, "hierarchy");
}
