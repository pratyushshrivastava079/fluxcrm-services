import crypto from 'crypto';

/** SHA-256 hash of a string — used for token fingerprinting */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Generate a cryptographically random hex string of `bytes` bytes */
export function randomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Generate a random URL-safe base64 token */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
