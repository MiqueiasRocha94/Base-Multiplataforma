import { readDevChannelStatus } from "@/dev-tools/runtime/app-update-channel";

// Manifesto do canal de desenvolvimento do APK debug (só no `npm run dev`; pasta
// removida dos builds — scripts/dev-only.mjs). 204 = nada novo para baixar.
export const dynamic = "force-dynamic";

const HEADERS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };

export function GET() {
  const status = readDevChannelStatus();
  if (status.state === "ready") {
    return Response.json(status.manifest, { headers: HEADERS });
  }
  if (status.state === "failed") {
    console.warn(`[app-update-dev] pacote não gerado: ${status.error}`);
  }
  return new Response(null, { status: 204, headers: { ...HEADERS, "X-App-Update-State": status.state } });
}
