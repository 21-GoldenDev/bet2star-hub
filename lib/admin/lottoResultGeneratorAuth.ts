import { cookies } from "next/headers";

export const LOTTO_RESULT_GENERATOR_AUTH_COOKIE = "lotto_result_generator_auth";

export function getLottoResultGeneratorPassword(): string | null {
  return process.env.LOTTO_RESULT_GENERATOR_PASSWORD || null;
}

export function isValidLottoResultGeneratorPassword(password: string): boolean {
  const expected = getLottoResultGeneratorPassword();
  if (!expected) return false;
  return password === expected;
}

export async function isLottoResultGeneratorUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(LOTTO_RESULT_GENERATOR_AUTH_COOKIE)?.value === "unlocked";
}
