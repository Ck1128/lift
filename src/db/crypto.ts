/**
 * Password-protected export, using the browser's Web Crypto API only. Nothing here invents a cipher.
 *
 *  - Key derivation: PBKDF2 with SHA-256, a random 16-byte salt and 600,000 iterations.
 *  - Encryption: AES-256-GCM (authenticated), with a fresh random 12-byte nonce for every export.
 *  - The unencrypted header (format, version, algorithm names, iteration count) is bound to the ciphertext as
 *    additional authenticated data, so changing any header field makes decryption fail.
 *  - The file holds only that header, the salt, the nonce and the ciphertext. Never the password or the key.
 *
 * Encryption protects a file that is lost or found. It cannot protect a file whose password was shared or guessed.
 * A forgotten password cannot be recovered.
 */

export const ENCRYPTED_FORMAT = 'lift-encrypted'
export const ENCRYPTED_VERSION = 1
export const PBKDF2_ITERATIONS = 600_000
/** Lowest iteration count accepted when reading a file. A tampered, absurdly high value is refused too. */
export const MIN_ITERATIONS = 100_000
export const MAX_ITERATIONS = 5_000_000
export const MIN_PASSWORD_LENGTH = 8
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedEnvelope {
  format: typeof ENCRYPTED_FORMAT
  version: number
  kdf: 'PBKDF2-SHA256'
  iterations: number
  cipher: 'AES-256-GCM'
  salt: string
  iv: string
  ciphertext: string
}

export type CryptoErrorCode = 'unsupported' | 'bad-file' | 'wrong-password' | 'empty-password' | 'weak-password'
export class CryptoError extends Error {
  code: CryptoErrorCode
  constructor(code: CryptoErrorCode, message: string) {
    super(message)
    this.name = 'CryptoError'
    this.code = code
  }
}

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new CryptoError('unsupported', 'This browser cannot encrypt files (Web Crypto is not available in this context).')
  return s
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(text: string): Uint8Array {
  if (typeof text !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new CryptoError('bad-file', 'The encrypted file is damaged.')
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** The bytes that bind the unencrypted header to the ciphertext. */
const header = (e: Pick<EncryptedEnvelope, 'format' | 'version' | 'kdf' | 'iterations' | 'cipher'>): Uint8Array =>
  new TextEncoder().encode(JSON.stringify({ format: e.format, version: e.version, kdf: e.kdf, iterations: e.iterations, cipher: e.cipher }))

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const s = subtle()
  const base = await s.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return s.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** Checks a password the person is choosing for an export. */
export function passwordProblem(password: string): string | null {
  if (password.length === 0) return 'Enter a password.'
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  return null
}

export async function encryptText(plain: string, password: string, opts: { iterations?: number } = {}): Promise<EncryptedEnvelope> {
  if (password.length === 0) throw new CryptoError('empty-password', 'Enter a password.')
  const problem = passwordProblem(password)
  if (problem) throw new CryptoError('weak-password', problem)
  const iterations = opts.iterations ?? PBKDF2_ITERATIONS
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const meta = { format: ENCRYPTED_FORMAT, version: ENCRYPTED_VERSION, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-256-GCM' } as const
  const key = await deriveKey(password, salt, iterations)
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: header(meta) as BufferSource }, key, new TextEncoder().encode(plain))
  return { ...meta, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ct)) }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** True when the text looks like one of this app's encrypted exports (it does not validate it). */
export function looksEncrypted(text: string): boolean {
  if (text.length > 80 * 1024 * 1024) return false
  try {
    const raw: unknown = JSON.parse(text)
    return isObj(raw) && raw.format === ENCRYPTED_FORMAT
  } catch {
    return false
  }
}

/** Validates the header and field sizes before any key derivation, so a damaged file fails fast and safely. */
export function parseEnvelope(text: string): EncryptedEnvelope {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new CryptoError('bad-file', 'This file is not valid JSON.')
  }
  if (!isObj(raw) || raw.format !== ENCRYPTED_FORMAT) throw new CryptoError('bad-file', 'This is not an encrypted Lift export.')
  if (typeof raw.version !== 'number' || raw.version > ENCRYPTED_VERSION || raw.version < 1) {
    throw new CryptoError('unsupported', `Encrypted export version ${String(raw.version)} is not supported by this app version.`)
  }
  if (raw.kdf !== 'PBKDF2-SHA256' || raw.cipher !== 'AES-256-GCM') throw new CryptoError('unsupported', 'This file uses an algorithm this app does not support.')
  const it = raw.iterations
  if (typeof it !== 'number' || !Number.isInteger(it) || it < MIN_ITERATIONS || it > MAX_ITERATIONS) throw new CryptoError('bad-file', 'The encrypted file has damaged settings.')
  if (typeof raw.salt !== 'string' || typeof raw.iv !== 'string' || typeof raw.ciphertext !== 'string') throw new CryptoError('bad-file', 'The encrypted file is missing parts.')
  if (fromBase64(raw.salt).length !== SALT_BYTES || fromBase64(raw.iv).length !== IV_BYTES) throw new CryptoError('bad-file', 'The encrypted file has damaged settings.')
  if (fromBase64(raw.ciphertext).length < 17) throw new CryptoError('bad-file', 'The encrypted file is too short.')
  return raw as unknown as EncryptedEnvelope
}

/** Decrypts the text of an encrypted export. A wrong password and a changed file fail the same way, by design. */
export async function decryptEnvelope(env: EncryptedEnvelope, password: string): Promise<string> {
  if (password.length === 0) throw new CryptoError('empty-password', 'Enter the password for this file.')
  const key = await deriveKey(password, fromBase64(env.salt), env.iterations)
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(env.iv) as BufferSource, additionalData: header(env) as BufferSource }, key, fromBase64(env.ciphertext) as BufferSource)
    return new TextDecoder().decode(pt)
  } catch {
    throw new CryptoError('wrong-password', 'Wrong password, or the file was changed. Nothing was imported.')
  }
}
