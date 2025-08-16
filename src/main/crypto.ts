// Outils de chiffrement pour les clés API stockées en base.
// Utilise AES-GCM avec une clé dérivée de l'ENV ENC_SECRET (ou APP_ENC_SECRET / PING_ENC_SECRET fallback).
// Si aucune clé n'est fournie, les valeurs restent en clair (avec un avertissement).
// Format stocké: enc:<base64(iv)>:<base64(cipher)>

const ENC_PREFIX = "enc:"; // legacy format (single key)
const ENC_PREFIX2 = "enc2:"; // nouveau format multi-clés: enc2:<index>:<b64(iv)>:<b64(ct)>
let cachedPrimary: CryptoKey | null = null;
let cachedSecondary: CryptoKey | null = null; // ancienne clé éventuelle
let warned = false;

// Reset cache (tests / rotation forcée)
export function resetCryptoCache() {
  cachedPrimary = null;
  cachedSecondary = null;
  warned = false;
}

async function derive(secret: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(secret);
  return await crypto.subtle.digest("SHA-256", data);
}

async function loadKeys(): Promise<
  { primary: CryptoKey | null; secondary: CryptoKey | null }
> {
  if (cachedPrimary || cachedSecondary) {
    return { primary: cachedPrimary, secondary: cachedSecondary };
  }
  const primarySecret = Deno.env.get("ENC_SECRET") || null;
  const previousSecret = Deno.env.get("ENC_SECRET_PREVIOUS") || null;

  if (primarySecret) {
    const mat = await derive(primarySecret);
    cachedPrimary = await crypto.subtle.importKey(
      "raw",
      mat,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }
  if (previousSecret) {
    // N'utiliser la secondaire que si différente
    if (!primarySecret || previousSecret !== primarySecret) {
      const mat2 = await derive(previousSecret);
      cachedSecondary = await crypto.subtle.importKey(
        "raw",
        mat2,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      );
    }
  }
  return { primary: cachedPrimary, secondary: cachedSecondary };
}

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64s: string): ArrayBuffer {
  const bin = atob(b64s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

export async function encryptForStorage(
  value: string | undefined | null,
): Promise<string | undefined | null> {
  if (value == null || value === "") return value;
  if (value.startsWith(ENC_PREFIX) || value.startsWith(ENC_PREFIX2)) {
    return value; // déjà chiffré
  }
  const { primary } = await loadKeys();
  if (!primary) {
    if (!warned) {
      console.warn(
        "[crypto] Aucune clé de chiffrement (ENC_SECRET) – les clés API resteront en clair.",
      );
      warned = true;
    }
    return value; // fallback clair
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    primary,
    new TextEncoder().encode(value),
  );
  // Utiliser nouveau format pour tout nouvel encrypt
  return `${ENC_PREFIX2}0:${b64(iv.buffer)}:${b64(cipher)}`;
}

export async function decryptFromStorage(
  stored: string | null,
): Promise<{ plain: string | null; reencrypted?: string | null }> {
  if (stored == null) return { plain: null };
  const { primary, secondary } = await loadKeys();

  // Plaintext (migration)
  if (!stored.startsWith(ENC_PREFIX) && !stored.startsWith(ENC_PREFIX2)) {
    const encrypted = await encryptForStorage(stored);
    if (encrypted !== stored) return { plain: stored, reencrypted: encrypted };
    return { plain: stored };
  }

  // Legacy format enc:
  if (stored.startsWith(ENC_PREFIX)) {
    if (!primary) return { plain: "(clé chiffrée – aucune clé maître)" };
    try {
      const without = stored.slice(ENC_PREFIX.length);
      const sep = without.indexOf(":");
      if (sep === -1) return { plain: stored };
      const ivB64 = without.slice(0, sep);
      const ctB64 = without.slice(sep + 1);
      const iv = new Uint8Array(fromB64(ivB64));
      const ct = fromB64(ctB64);
      const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        primary,
        ct,
      ).catch(async (err) => {
        // Essayer secondary
        if (secondary) {
          try {
            return await crypto.subtle.decrypt(
              { name: "AES-GCM", iv },
              secondary,
              ct,
            );
          } catch {
            throw err;
          }
        }
        throw err;
      });
      const plain = new TextDecoder().decode(plainBuf);
      // Ré-encrypt nouveau format si legacy
      const reencrypted = await encryptForStorage(plain);
      return {
        plain,
        reencrypted: reencrypted && reencrypted !== stored
          ? reencrypted
          : undefined,
      };
    } catch (e) {
      console.error("[crypto] Erreur déchiffrement (legacy):", e);
      return { plain: "(erreur dechiffrement)" };
    }
  }

  // Nouveau format enc2:<kid>:<iv>:<ct>
  if (stored.startsWith(ENC_PREFIX2)) {
    if (!primary) return { plain: "(clé chiffrée – aucune clé maître)" };
    try {
      const without = stored.slice(ENC_PREFIX2.length);
      const parts = without.split(":");
      if (parts.length !== 3) return { plain: stored };
      const kid = parts[0];
      const iv = new Uint8Array(fromB64(parts[1]));
      const ct = fromB64(parts[2]);

      const tryKeys: CryptoKey[] = [];
      if (kid === "0") { // supposé primary lors de l'encodage
        if (primary) tryKeys.push(primary);
        if (secondary) tryKeys.push(secondary);
      } else {
        // si un autre id futur, on essaie toutes
        if (primary) tryKeys.push(primary);
        if (secondary) tryKeys.push(secondary);
      }
      let decrypted: ArrayBuffer | null = null;
      let usedSecondary = false;
      for (const k of tryKeys) {
        try {
          decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            k,
            ct,
          );
          if (k === secondary) usedSecondary = true;
          break;
        } catch { /* next */ }
      }
      if (!decrypted) return { plain: "(erreur dechiffrement)" };
      const plain = new TextDecoder().decode(decrypted);
      if (usedSecondary) {
        // ré-encrypt avec primary (kid=0)
        const reencrypted = await encryptForStorage(plain);
        return { plain, reencrypted };
      }
      return { plain };
    } catch (e) {
      console.error("[crypto] Erreur déchiffrement (enc2):", e);
      return { plain: "(erreur dechiffrement)" };
    }
  }

  return { plain: stored };
}

export function isEncrypted(value: string | null | undefined) {
  return !!value &&
    (value.startsWith(ENC_PREFIX) || value.startsWith(ENC_PREFIX2));
}
