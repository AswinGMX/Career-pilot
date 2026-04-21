const crypto = require("crypto");

const sessionCookieName = "career_reality_session";
const sessionSecret = process.env.SESSION_SECRET || "career-reality-dev-secret";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !password) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function createSessionToken(user) {
  const payload = {
    sub: user.id,
    tenantId: user.tenantId || null,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function parseSessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function buildSessionCookie(user) {
  const token = createSessionToken(user);
  const isProduction = process.env.NODE_ENV === "production";
  const securePart = isProduction ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `${sessionCookieName}=${encodeURIComponent(
    token
  )}; Max-Age=604800; Path=/; HttpOnly${securePart}`;
}

function buildLogoutCookie() {
  const isProduction = process.env.NODE_ENV === "production";
  const securePart = isProduction ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `${sessionCookieName}=; Max-Age=0; Path=/; HttpOnly${securePart}`;
}

module.exports = {
  buildLogoutCookie,
  buildSessionCookie,
  hashPassword,
  parseSessionToken,
  sessionCookieName,
  verifyPassword
};
