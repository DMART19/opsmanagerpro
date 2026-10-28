import { buildCorsHeaders, isAllowedOrigin } from "./cors.ts";

Deno.test("production origin is allowed", () => {
  if (!isAllowedOrigin("https://opsmanagerpro.com")) throw new Error("production origin denied");
});

Deno.test("unknown preview and attacker origins are rejected", () => {
  const previous = Deno.env.get("CORS_ADDITIONAL_ORIGINS");
  try {
    Deno.env.delete("CORS_ADDITIONAL_ORIGINS");
    for (const origin of ["https://attacker.example", "https://unlisted.lovable.app", "null"]) {
      if (isAllowedOrigin(origin)) throw new Error(`unexpected allowed origin: ${origin}`);
      const headers = buildCorsHeaders(new Request("https://opsmanagerpro.com", {
        headers: { Origin: origin },
      }));
      if ("Access-Control-Allow-Origin" in headers) throw new Error(`origin reflected: ${origin}`);
    }
  } finally {
    if (previous === undefined) Deno.env.delete("CORS_ADDITIONAL_ORIGINS");
    else Deno.env.set("CORS_ADDITIONAL_ORIGINS", previous);
  }
});

Deno.test("explicit staging origin requires exact configured match", () => {
  const previous = Deno.env.get("CORS_ADDITIONAL_ORIGINS");
  try {
    Deno.env.set("CORS_ADDITIONAL_ORIGINS", "https://approved-preview.lovable.app");
    if (!isAllowedOrigin("https://approved-preview.lovable.app")) throw new Error("configured origin denied");
    if (isAllowedOrigin("https://evil-approved-preview.lovable.app")) throw new Error("prefix bypass");
  } finally {
    if (previous === undefined) Deno.env.delete("CORS_ADDITIONAL_ORIGINS");
    else Deno.env.set("CORS_ADDITIONAL_ORIGINS", previous);
  }
});
