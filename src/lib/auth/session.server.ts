import type { DemoSession } from "@/lib/auth/session";

// Static export keeps auth decisions on the client side for now.
export async function getServerSession(): Promise<DemoSession | null> {
  return null;
}
