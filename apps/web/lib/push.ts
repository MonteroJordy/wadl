/**
 * Web Push API client. SERVER-ONLY.
 *
 * Uses node:crypto to ECDSA-sign the VAPID JWT and ECDH-encrypt the payload
 * per RFC 8291. No `web-push` SDK dep — the spec is small and self-contained.
 *
 * Env:
 *   VAPID_PUBLIC_KEY  — base64url-encoded uncompressed P-256 public key (65 bytes)
 *   VAPID_PRIVATE_KEY — base64url-encoded P-256 private scalar (32 bytes)
 *   VAPID_SUBJECT     — mailto:you@yourdomain.com (defaults to mailto:noreply@wadl.app)
 *
 * Generate keys once with `npx web-push generate-vapid-keys` OR run the helper
 * `node -e "..."` in the README.
 */

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4;
  const padded = pad === 0 ? s : s + "=".repeat(4 - pad);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function getVapidConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@wadl.app";
  if (!pub || !priv) return null;
  return { publicKey: pub, privateKey: priv, subject };
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Convert raw P-256 keys (uncompressed pub: 65 bytes; private scalar: 32 bytes)
 * to a node KeyObject by wrapping in JWK.
 */
function rawToKeyObject(
  pub: Buffer,
  priv: Buffer | null
): crypto.KeyObject {
  // Strip the 0x04 prefix from the uncompressed point.
  const x = b64urlEncode(pub.subarray(1, 33));
  const y = b64urlEncode(pub.subarray(33, 65));
  if (priv) {
    return crypto.createPrivateKey({
      key: { kty: "EC", crv: "P-256", x, y, d: b64urlEncode(priv) },
      format: "jwk",
    });
  }
  return crypto.createPublicKey({
    key: { kty: "EC", crv: "P-256", x, y },
    format: "jwk",
  });
}

function signVapidJwt(audience: string, cfg: ReturnType<typeof getVapidConfig>): string {
  if (!cfg) throw new Error("VAPID not configured");
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    sub: cfg.subject,
  };
  const encHeader = b64urlEncode(Buffer.from(JSON.stringify(header)));
  const encPayload = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const pub = b64urlDecode(cfg.publicKey);
  const priv = b64urlDecode(cfg.privateKey);
  const key = rawToKeyObject(pub, priv);

  const derSig = crypto.sign("SHA256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64urlEncode(derSig)}`;
}

/**
 * Encrypt a payload for one subscription per RFC 8291 (aes128gcm).
 */
function encryptPayload(
  subscription: PushSubscription,
  payload: Buffer
): { ciphertext: Buffer; salt: Buffer; localPub: Buffer } {
  const clientPub = b64urlDecode(subscription.keys.p256dh); // 65 bytes
  const auth = b64urlDecode(subscription.keys.auth); // 16 bytes

  // Generate ephemeral ECDH key.
  const ec = crypto.createECDH("prime256v1");
  const localPub = ec.generateKeys(); // 65 bytes (0x04 || x || y)
  const sharedSecret = ec.computeSecret(clientPub); // 32 bytes

  const salt = crypto.randomBytes(16);

  // HKDF — Node 16+ has crypto.hkdfSync.
  const prkKey = hkdf(
    auth,
    sharedSecret,
    Buffer.concat([
      Buffer.from("WebPush: info\0", "utf8"),
      clientPub,
      localPub,
    ]),
    32
  );
  const cek = hkdf(
    salt,
    prkKey,
    Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    16
  );
  const nonce = hkdf(
    salt,
    prkKey,
    Buffer.from("Content-Encoding: nonce\0", "utf8"),
    12
  );

  // Pad: 0x02 byte + 0 padding bytes (we don't pad).
  const padded = Buffer.concat([payload, Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const enc = Buffer.concat([cipher.update(padded), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([enc, tag]);

  // Build aes128gcm content: header || ciphertext.
  // Header: salt(16) || rs(4 BE = 4096) || idlen(1) || keyid(idlen)
  const header = Buffer.concat([
    salt,
    Buffer.from([0x00, 0x00, 0x10, 0x00]),
    Buffer.from([localPub.length]),
    localPub,
  ]);
  return { ciphertext: Buffer.concat([header, ciphertext]), salt, localPub };
}

function hkdf(
  salt: Buffer,
  ikm: Buffer,
  info: Buffer,
  length: number
): Buffer {
  // Use Node's hkdfSync for full RFC 5869.
  // hkdfSync(digest, ikm, salt, info, keylen) → ArrayBuffer
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));
}

export interface SendPushResult {
  ok: boolean;
  status?: number;
  error?: string;
  /** True if we should drop this subscription (410 / 404). */
  expired?: boolean;
}

export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<SendPushResult> {
  const cfg = getVapidConfig();
  if (!cfg) return { ok: false, error: "VAPID not configured" };

  const audience = new URL(subscription.endpoint).origin;
  const jwt = signVapidJwt(audience, cfg);

  const body = Buffer.from(JSON.stringify(payload));
  const enc = encryptPayload(subscription, body);

  try {
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Urgency: "normal",
        Authorization: `vapid t=${jwt}, k=${cfg.publicKey}`,
      },
      body: new Uint8Array(enc.ciphertext),
    });
    if (res.status === 201 || res.status === 200) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: `${res.status} ${text.slice(0, 200)}`,
      expired: res.status === 404 || res.status === 410,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Send to every subscription owned by users in the account.
 * Drops 410/404 subscriptions on the floor.
 */
export async function sendPushToAccount(
  accountId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; dropped: number }> {
  if (!getVapidConfig()) return { sent: 0, failed: 0, dropped: 0 };

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user:profiles!inner(account_id)")
    .eq("user.account_id", accountId);

  const rows = (subs ?? []) as unknown as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;
  let sent = 0;
  let failed = 0;
  let dropped = 0;
  for (const s of rows) {
    const r = await sendPush(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload
    );
    if (r.ok) sent++;
    else if (r.expired) {
      dropped++;
      await admin.from("push_subscriptions").delete().eq("id", s.id);
    } else failed++;
  }
  return { sent, failed, dropped };
}
