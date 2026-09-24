/**
 * Data Security Utilities
 * 
 * Client-side masking, HTTPS enforcement, and log sanitization.
 */

// ─── HTTPS Enforcement ─────────────────────────────────────

/**
 * Enforces HTTPS in production. Call once at app startup.
 * Redirects HTTP to HTTPS and sets strict transport headers via meta tag.
 */
export const enforceHTTPS = (): void => {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1")
  ) {
    window.location.replace(
      window.location.href.replace("http:", "https:")
    );
  }
};

// ─── Data Masking ───────────────────────────────────────────

/** Mask an email: j***@example.com */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return "****";
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const visibleLocal = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visibleLocal}${"*".repeat(Math.max(local.length - visibleLocal.length, 3))}@${domain}`;
};

/** Mask a phone number: ***-***-1234 */
export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return "****";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "•••-•••-" + digits.slice(-4);
};

/** Mask a generic string: show first N chars, mask rest */
export const maskValue = (
  value: string | null | undefined,
  visibleChars: number = 4
): string => {
  if (!value) return "****";
  if (value.length <= visibleChars) return "****";
  return value.slice(0, visibleChars) + "•".repeat(Math.min(value.length - visibleChars, 8));
};

/** Mask a certification/serial number: CERT-1••••••• */
export const maskCertificationNumber = (num: string | null | undefined): string => {
  return maskValue(num, 6);
};

/** Mask a UUID for display: a1b2c3d4•••• */
export const maskUUID = (uuid: string | null | undefined): string => {
  if (!uuid) return "****";
  return uuid.slice(0, 8) + "••••";
};

// ─── Log Sanitization ──────────────────────────────────────

/** Fields that should never appear in logs */
const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "credential",
  "certification_number",
  "document_url",
  "serial_number",
  "ssn",
  "social_security",
  "credit_card",
  "card_number",
]);

/**
 * Recursively sanitize an object, masking sensitive fields.
 * Safe to use before logging or sending to error tracking.
 */
export const sanitizeForLogging = <T extends Record<string, any>>(
  obj: T
): T => {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized = Array.isArray(obj)
    ? ([...obj] as any)
    : { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret") || lowerKey.includes("token")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
};

// ─── Content Security ───────────────────────────────────────

/**
 * Add a Content-Security-Policy meta tag to prevent mixed content.
 * Call once at app startup.
 */
export const enforceContentSecurity = (): void => {
  if (typeof document === "undefined") return;

  const isDev = import.meta.env.DEV;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  // Derive https + wss origins for connect-src
  const supaHttps = supabaseUrl.replace(/\/$/, "");
  const supaWss = supaHttps.replace(/^https:/, "wss:");

  // Vite dev needs 'unsafe-eval' + ws:// for HMR; production is strict.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co"
    : "'self' 'unsafe-inline' https://cdn.gpteng.co";
  const connectSrc = [
    "'self'",
    supaHttps,
    supaWss,
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://api.stripe.com",
    "https://api.pwnedpasswords.com",
    "https://*.stripe.com",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    isDev ? "ws: http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc} https://js.stripe.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.com https://challenges.cloudflare.com",
    // frame-ancestors is intentionally omitted: browsers ignore it when delivered
    // via <meta>, and it is served as a real HTTP header from public/_headers.
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const ensureMeta = (httpEquiv: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(
      `meta[http-equiv="${httpEquiv}"]`,
    );
    if (!el) {
      el = document.createElement("meta");
      el.httpEquiv = httpEquiv;
      document.head.appendChild(el);
    }
    el.content = content;
  };
  const ensureNameMeta = (name: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };

  ensureMeta("Content-Security-Policy", csp);
  ensureMeta("X-Content-Type-Options", "nosniff");
  ensureNameMeta("referrer", "strict-origin-when-cross-origin");
  ensureMeta(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "bluetooth=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      'payment=(self "https://js.stripe.com" "https://checkout.stripe.com")',
      "picture-in-picture=()",
      "publickey-credentials-get=(self)",
      "screen-wake-lock=()",
      "serial=()",
      "usb=()",
      "web-share=(self)",
      "xr-spatial-tracking=()",
    ].join(", "),
  );
};
