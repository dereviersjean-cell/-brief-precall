import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import type { ReactNode } from "react";
import { getViewer } from "@/lib/session-user";
import { getDealOwnerId } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

// Page d'un deal (Deal Execution, 27/10/2026). Son propre deal se range dans
// « Deals », celui d'un commercial dans « Suivi des deals » (menu du
// 03/11/2026) : la barre latérale ne connaît pas le propriétaire, la mise en
// page le lui dit.
export default async function DealLayout({ children, params }: { children: ReactNode; params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const [viewer, ownerId] = await Promise.all([getViewer().catch(() => null), isUuid(dealId) ? getDealOwnerId(dealId).catch(() => null) : null]);
  const section = viewer && ownerId && ownerId !== viewer.userId ? "suivi" : "deals";
  return (
    <AppShell>
      <div className="flex min-h-screen">
        <AppSidebar dealSection={section} />
        <div className="flex-1 ml-0 lg:ml-60 min-w-0">
          <ImpersonationBanner />
          <BillingGraceBanner />
          <TopBar />
          <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
