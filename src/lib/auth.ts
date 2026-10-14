// Sesion por PIN. Cookie firmada con HMAC; sin dependencias externas.
export const COOKIE = "almuerzos_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("Falta SESSION_SECRET (minimo 16 caracteres)");
  return s;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Token = expira.firma, y la firma depende del PIN: cambiar el PIN cierra todas las sesiones. */
export async function makeToken(): Promise<string> {
  const pin = process.env.APP_PIN;
  if (!pin) throw new Error("Falta APP_PIN");
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const sig = await hmac(secret(), `${exp}.${pin}`);
  return `${exp}.${sig}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const pin = process.env.APP_PIN;
  if (!pin) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = await hmac(secret(), `${exp}.${pin}`);
  return safeEqual(sig, expected);
}

export function pinMatches(input: string): boolean {
  const pin = process.env.APP_PIN ?? "";
  return pin.length > 0 && safeEqual(input, pin);
}
