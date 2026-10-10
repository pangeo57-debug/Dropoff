/**
 * App lock: a PIN (stored only as a salted PBKDF2 hash) and optionally Face ID / Touch ID via WebAuthn.
 * This hides the app from someone holding the unlocked phone; it does not encrypt the data stored on the device.
 */
const KEY = 'cashflow:lock'

export interface LockCfg {
  salt: string // hex
  hash: string // hex
  length: number // PIN digits (4-6)
  timeout: number // seconds in the background before locking again (0 = immediately)
  bio?: string // base64url WebAuthn credential id
}

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16))
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export function loadLock(): LockCfg | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LockCfg | null
    return c && c.hash && c.salt ? c : null
  } catch {
    return null
  }
}

const save = (c: LockCfg) => localStorage.setItem(KEY, JSON.stringify(c))

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 150000, hash: 'SHA-256' }, key, 256))
}

export async function setPin(pin: string, keep?: Pick<LockCfg, 'timeout' | 'bio'>): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  save({ salt: hex(salt), hash: await derive(pin, salt), length: pin.length, timeout: keep?.timeout ?? 60, bio: keep?.bio })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const c = loadLock()
  return !!c && (await derive(pin, unhex(c.salt))) === c.hash
}

export const removeLock = () => localStorage.removeItem(KEY)

export function setTimeoutSec(timeout: number) {
  const c = loadLock()
  if (c) save({ ...c, timeout })
}

export async function bioAvailable(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

/** Register a device credential that requires Face ID / Touch ID to be used. */
export async function enrollBio(): Promise<boolean> {
  const c = loadLock()
  if (!c) return false
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Cash Flow' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'cashflow', displayName: 'Cash Flow' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    save({ ...c, bio: b64(cred.rawId) })
    return true
  } catch {
    return false
  }
}

export async function unlockBio(): Promise<boolean> {
  const c = loadLock()
  if (!c?.bio) return false
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(c.bio) as BufferSource }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!res
  } catch {
    return false
  }
}

export function disableBio() {
  const c = loadLock()
  if (c) save({ ...c, bio: undefined })
}

/** "Forgot PIN": wipes this device's data and the lock. Cloud copies (if sync is on) are untouched. */
export function resetEverything() {
  for (const k of [KEY, 'tutor-cashflow:v1', 'cashflow:syncMeta']) localStorage.removeItem(k)
  location.reload()
}
