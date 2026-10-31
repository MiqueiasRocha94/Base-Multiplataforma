import type { AuthSession } from "@/lib/auth/session";

// Static export keeps auth decisions on the client side for now.
export async function getServerSession(): Promise<AuthSession | null> {
  return null;
}
