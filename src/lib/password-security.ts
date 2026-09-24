/**
 * Check if a password has been found in known data breaches
 * using the HaveIBeenPwned k-Anonymity API.
 * 
 * Only the first 5 characters of the SHA-1 hash are sent —
 * the full password never leaves the browser.
 */
export async function checkPasswordBreached(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });

    if (!response.ok) return false; // Fail open — don't block signup if API is down

    const text = await response.text();
    return text.split("\n").some(line => {
      const [hash] = line.split(":");
      return hash.trim() === suffix;
    });
  } catch {
    return false; // Fail open on network errors
  }
}

export const BREACHED_PASSWORD_MESSAGE = 
  "This password has been found in a known data breach. Please choose a more secure password.";
