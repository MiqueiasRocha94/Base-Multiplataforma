import { readDevBundle } from "@/dev-tools/runtime/app-update-channel";

// Pacote assinado do canal de desenvolvimento (o manifesto aponta para cá).
export const dynamic = "force-dynamic";

export async function GET() {
  const bundle = await readDevBundle();
  if (!bundle) {
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(bundle), {
    headers: { "Content-Type": "application/zip", "Cache-Control": "no-store" },
  });
}
