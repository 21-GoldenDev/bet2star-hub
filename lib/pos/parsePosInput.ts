import { NextRequest } from "next/server";

export function parseNumberList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((n) => Number.isFinite(n));
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;\s]+/).map(Number).filter((n) => Number.isFinite(n));
  }
  return [];
}

export function parseNumbers(value: unknown): number[] | Record<string, number[]> {
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parseNumbers(parsed);
      }
    } catch {
      return parseNumberList(value);
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const result: Record<string, number[]> = {};
    for (const [key, items] of Object.entries(value as Record<string, unknown>)) {
      result[key] = parseNumberList(items);
    }
    return result;
  }

  return parseNumberList(value);
}

export async function parsePosInput(request: NextRequest): Promise<Record<string, unknown>> {
  const { searchParams } = new URL(request.url);
  let body: Record<string, unknown> = {};

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  const merged: Record<string, unknown> = { ...body };

  for (const [key, value] of searchParams.entries()) {
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

export function pickString(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function parseMatchList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    if (value.trim().startsWith("[")) {
      try {
        return parseMatchList(JSON.parse(value));
      } catch {
        // fall through
      }
    }
    return value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function parseMatches(value: unknown): string[] | Record<string, string[]> {
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parseMatches(parsed);
      }
    } catch {
      return parseMatchList(value);
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const result: Record<string, string[]> = {};
    for (const [key, items] of Object.entries(value as Record<string, unknown>)) {
      result[key] = parseMatchList(items);
    }
    return result;
  }

  return parseMatchList(value);
}

export function parseJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown,
): T | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}
