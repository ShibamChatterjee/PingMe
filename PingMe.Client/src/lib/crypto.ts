import sodium from "libsodium-wrappers-sumo";

let ready = false;

export async function initSodium() {
  console.log("initSodium called, ready:", ready);
  if (!ready) {
    await sodium.ready;
    console.log("sodium.ready resolved");
    ready = true;
  }
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export function generateIdentityKeyPair(): KeyPair {
  const kp = sodium.crypto_box_keypair();

  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  };
}

/**
 * Deterministically derive an identity key pair from a user's identifier (email/username)
 * and password using libsodium's crypto_pwhash (Argon2) + crypto_box_seed_keypair.
 *
 * This guarantees that the SAME keypair is always produced from the same credentials,
 * on any device or browser session, even after clearing localStorage.
 * This permanently prevents "[Unable to decrypt]" errors.
 */
export function deriveIdentityKeyPair(
  identifier: string,
  password: string,
): KeyPair {
  const normalizedId = (identifier || "pingme-user").trim().toLowerCase();

  // Create a deterministic 16-byte salt from the identifier.
  // crypto_generichash key must be a Uint8Array or null — use from_string.
  const salt = sodium.crypto_generichash(
    sodium.crypto_pwhash_SALTBYTES,
    sodium.from_string(normalizedId),
    sodium.from_string("pingme-v1"),
  );

  // Derive a 32-byte seed from password + salt via Argon2id
  const seed = sodium.crypto_pwhash(
    sodium.crypto_box_SEEDBYTES,
    sodium.from_string(password),
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT,
  );

  // Deterministic keypair from seed — same seed => same keys, always
  const kp = sodium.crypto_box_seed_keypair(seed);

  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  };
}

export function deriveKeyFromUserId(userId: string): KeyPair {
  const normalizedId = (userId || "pingme-user").trim().toLowerCase();
  const seed = sodium.crypto_generichash(
    sodium.crypto_box_SEEDBYTES,
    sodium.from_string(normalizedId),
    sodium.from_string("pingme-deterministic-key-v1"),
  );
  const kp = sodium.crypto_box_seed_keypair(seed);

  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  };
}

/**
 * Derive the public key from an existing private key.
 *
 * This allows us to decrypt messages that the current user
 * sent to themselves using the self-encrypted copy.
 */
export function getPublicKeyFromPrivateKey(
  privateKeyB64: string,
): string {
  const privateKey = sodium.from_base64(privateKeyB64);

  const publicKey = sodium.crypto_scalarmult_base(privateKey);

  return sodium.to_base64(publicKey);
}

export interface EncryptedPayload {
  // Encrypted for recipient
  ciphertext: string;
  nonce: string;

  // Encrypted for sender/self
  selfCiphertext: string;
  selfNonce: string;
}

/**
 * Encrypt the same plaintext twice:
 *
 * 1. For the recipient:
 *    recipient public key + sender private key
 *
 * 2. For the sender:
 *    sender public key + sender private key
 *
 * This allows both sides to decrypt their own copy
 * from message history.
 */
export function encryptMessage(
  plaintext: string,
  recipientPubKeyB64: string,
  myPublicKeyB64: string,
  myPrivKeyB64: string,
): EncryptedPayload {
  const message = sodium.from_string(plaintext);

  // --------------------------------------------------
  // Encrypt for recipient
  // --------------------------------------------------

  const recipientNonce = sodium.randombytes_buf(
    sodium.crypto_box_NONCEBYTES,
  );

  const recipientCiphertext = sodium.crypto_box_easy(
    message,
    recipientNonce,
    sodium.from_base64(recipientPubKeyB64),
    sodium.from_base64(myPrivKeyB64),
  );

  // --------------------------------------------------
  // Encrypt for sender
  // --------------------------------------------------

  const selfNonce = sodium.randombytes_buf(
    sodium.crypto_box_NONCEBYTES,
  );

  const selfCiphertext = sodium.crypto_box_easy(
    message,
    selfNonce,
    sodium.from_base64(myPublicKeyB64),
    sodium.from_base64(myPrivKeyB64),
  );

  return {
    ciphertext: sodium.to_base64(recipientCiphertext),
    nonce: sodium.to_base64(recipientNonce),

    selfCiphertext: sodium.to_base64(selfCiphertext),
    selfNonce: sodium.to_base64(selfNonce),
  };
}

export function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  senderPubKeyB64: string,
  myPrivKeyB64: string,
): string {
  const plaintext = sodium.crypto_box_open_easy(
    sodium.from_base64(ciphertextB64),
    sodium.from_base64(nonceB64),
    sodium.from_base64(senderPubKeyB64),
    sodium.from_base64(myPrivKeyB64),
  );

  return sodium.to_string(plaintext);
}

export function encryptGroupMessage(
  plaintext: string,
  groupId: string,
): EncryptedPayload {
  const message = sodium.from_string(plaintext);

  // Derive a 32-byte key from the Group ID using SHA256/crypto_generichash
  const key = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    sodium.from_string(groupId),
    null,
  );

  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES,
  );

  const ciphertext = sodium.crypto_secretbox_easy(
    message,
    nonce,
    key,
  );

  const ciphertextB64 = sodium.to_base64(ciphertext);
  const nonceB64 = sodium.to_base64(nonce);

  return {
    ciphertext: ciphertextB64,
    nonce: nonceB64,
    selfCiphertext: ciphertextB64,
    selfNonce: nonceB64,
  };
}

export function decryptGroupMessage(
  ciphertextB64: string,
  nonceB64: string,
  groupId: string,
): string {
  const key = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    sodium.from_string(groupId),
    null,
  );

  const plaintext = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(ciphertextB64),
    sodium.from_base64(nonceB64),
    key,
  );

  return sodium.to_string(plaintext);
}