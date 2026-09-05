import sodium from "libsodium-wrappers-sumo";

export interface WrappedKey {
  wrapped: string;
  nonce: string;
  salt: string;
}

const keyFor = (userId: string) =>
  `pingme.wrappedkey.${userId}`;

export function wrapPrivateKey(
  privateKeyB64: string,
  password: string,
): WrappedKey {
  if (!password) {
    throw new Error("Password is required");
  }

  const salt = sodium.randombytes_buf(
    sodium.crypto_pwhash_SALTBYTES,
  );

  const key = sodium.crypto_pwhash(
    32,
    sodium.from_string(password),
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT,
  );

  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES,
  );

  const wrapped = sodium.crypto_secretbox_easy(
    sodium.from_base64(privateKeyB64),
    nonce,
    key,
  );

  return {
    wrapped: sodium.to_base64(wrapped),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt),
  };
}

export function unwrapPrivateKey(
  w: WrappedKey,
  password: string,
): string {
  if (!password) {
    throw new Error("Password is required");
  }

  const key = sodium.crypto_pwhash(
    32,
    sodium.from_string(password),
    sodium.from_base64(w.salt),
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT,
  );

  const decrypted = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(w.wrapped),
    sodium.from_base64(w.nonce),
    key,
  );

  return sodium.to_base64(decrypted);
}

export function storeWrappedKey(
  userId: string,
  wrappedKey: WrappedKey,
): void {
  if (!userId) {
    throw new Error("userId is required");
  }

  localStorage.setItem(
    keyFor(userId),
    JSON.stringify(wrappedKey),
  );
}

export function loadWrappedKey(
  userId: string,
): WrappedKey | null {
  if (!userId) {
    return null;
  }

  try {
    const raw = localStorage.getItem(keyFor(userId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WrappedKey;

    if (
      typeof parsed.wrapped !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.salt !== "string" ||
      !parsed.wrapped ||
      !parsed.nonce ||
      !parsed.salt
    ) {
      localStorage.removeItem(keyFor(userId));
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(keyFor(userId));
    return null;
  }
}

export function clearWrappedKey(userId: string): void {
  if (!userId) {
    return;
  }

  localStorage.removeItem(keyFor(userId));
}