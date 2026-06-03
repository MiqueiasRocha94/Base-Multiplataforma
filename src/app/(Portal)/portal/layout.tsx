import { PortalGate } from "@/app/(Portal)/portal/_components/portal-gate";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return <PortalGate>{children}</PortalGate>;
}
