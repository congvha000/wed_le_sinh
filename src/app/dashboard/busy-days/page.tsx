export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import BusyRegistrationPanel from "@/components/busy-registration-panel";
import { getUserPageData } from "@/lib/user-page-data";

export default async function DashboardBusyDaysPage() {
  const data = await getUserPageData();

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Ngày bận"
      title="Đăng ký ngày bận tuần sau"
      metaLabel="Cặp hiện tại"
      metaValue={data.pair?.name || "Chưa có cặp"}
    >
      <BusyRegistrationPanel
        pairId={data.pair?.id ?? null}
        pairName={data.pair?.name ?? null}
        partnerName={data.partnerName}
        nextWeekStart={data.nextWeekStart.toISOString()}
        windowOpen={Boolean(data.busyWindow?.isOpen)}
        selectedDate={data.currentUserBusyRequest?.busyDate.toISOString() ?? null}
        partnerDate={data.partnerBusyRequest?.busyDate.toISOString() ?? null}
        legacyBusyDates={data.legacyBusyDates.map((date) => date.toISOString())}
      />
    </WorkspaceShell>
  );
}
