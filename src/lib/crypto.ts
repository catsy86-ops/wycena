/**
 * Szyfrowanie AES-GCM dla wrażliwych danych klientów.
 * Klucz generowany z hasła użytkownika (PBKDF2) lub losowy.
 *
 * UWAGA: To szyfrowanie client-side — chroni dane w IndexedDB
 * przed odczytem przez inne skrypty/rozszerzenia, ale nie zastępuje
 * szyfrowania server-side w produkcji.
 */

const SALT = new Uint8Array([87, 121, 99, 101, 110, 107, 97, 80, 76, 83, 65, 76, 84, 50, 48, 50]);
const ITERATIONS = 100000;

/**
 * Generuje klucz AES z hasła (PBKDF2).
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Szyfruje tekst za pomocą AES-GCM.
 * Zwraca string base64 (IV + ciphertext).
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Łączymy IV + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Deszyfruje tekst zaszyfrowany przez encrypt().
 */
export async function decrypt(encryptedBase64: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Sprawdza czy tekst wygląda na zaszyfrowany (base64 o odpowiedniej długości).
 */
export function isEncrypted(text: string): boolean {
  if (!text || text.length < 20) return false;
  try {
    atob(text);
    return text.length > 30 && !/\s/.test(text);
  } catch {
    return false;
  }
}

/**
 * Szyfruje wrażliwe pola obiektu klienta.
 */
export async function encryptClientFields(
  client: { nip?: string; email?: string; phone?: string },
  password: string
): Promise<{ nip?: string; email?: string; phone?: string }> {
  const result: { nip?: string; email?: string; phone?: string } = {};
  if (client.nip && !isEncrypted(client.nip)) {
    result.nip = await encrypt(client.nip, password);
  }
  if (client.email && !isEncrypted(client.email)) {
    result.email = await encrypt(client.email, password);
  }
  if (client.phone && !isEncrypted(client.phone)) {
    result.phone = await encrypt(client.phone, password);
  }
  return result;
}

/**
 * Deszyfruje wrażliwe pola obiektu klienta.
 */
export async function decryptClientFields(
  client: { nip?: string; email?: string; phone?: string },
  password: string
): Promise<{ nip?: string; email?: string; phone?: string }> {
  const result: { nip?: string; email?: string; phone?: string } = {};
  try {
    if (client.nip && isEncrypted(client.nip)) result.nip = await decrypt(client.nip, password);
    if (client.email && isEncrypted(client.email)) result.email = await decrypt(client.email, password);
    if (client.phone && isEncrypted(client.phone)) result.phone = await decrypt(client.phone, password);
  } catch {
    // Błąd deszyfrowania — prawdopodobnie złe hasło
    throw new Error("Nie można odszyfrować danych. Sprawdź hasło.");
  }
  return result;
}
