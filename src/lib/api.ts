import { NextResponse } from "next/server";

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    { ok: false, error },
    { status },
  );
}

/**
 * Wrap a route handler so it always returns typed JSON and never leaks a stack
 * trace to the client. Full errors are logged server-side.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error("[FilingIQ] Unhandled route error:", err);
      return fail(
        "Something went wrong on our end. Please try again.",
        500,
      );
    }
  };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
