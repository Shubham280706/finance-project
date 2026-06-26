import { ok } from "@/lib/api";

export async function GET() {
  return ok({ status: "healthy" });
}
