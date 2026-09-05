import { api } from "./api";

const cache = new Map<string, string>();

export async function getPublicKey(
  token: string,
  userId: string,
  forceRefresh: boolean = false,
): Promise<string> {
  if (!forceRefresh) {
    const cached = cache.get(userId);
    if (cached) return cached;
  }

  const data = await api.getPublicKey(token, userId);
  const key = data?.identityPublicKey || data?.publicKey;

  if (!key) {
    throw new Error(`No public key found for ${userId}`);
  }

  cache.set(userId, key);
  return key;
}

export function clearKeyCache(): void {
  cache.clear();
}