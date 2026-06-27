/**
 * Gmail-only email validation. We intentionally restrict sign-up/sign-in to
 * real Gmail addresses, so this enforces Google's local-part rules rather than
 * a generic "looks like an email" check:
 *   - domain must be exactly gmail.com (case-insensitive)
 *   - local part is 6–30 characters
 *   - only letters, digits and dots are allowed
 *   - no leading/trailing dot and no consecutive dots
 *
 * (Google ignores dots when routing, but they're still valid characters.)
 */
const GMAIL_LOCAL = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/;

export function validateGmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();

  const at = email.lastIndexOf("@");
  if (at === -1) return "Enter a valid email address.";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (domain !== "gmail.com") {
    return "Only Gmail addresses (@gmail.com) are allowed.";
  }
  if (local.length < 6 || local.length > 30) {
    return "Gmail usernames must be 6–30 characters long.";
  }
  if (!GMAIL_LOCAL.test(local)) {
    return "That doesn't look like a valid Gmail address.";
  }

  return null;
}

export function isGmail(raw: string): boolean {
  return validateGmail(raw) === null;
}
