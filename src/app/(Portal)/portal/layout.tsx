import { PortalGate } from "@/components/portal-gate";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return <PortalGate>{children}</PortalGate>;
}
