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
        nextWeekStart={data.nextWeekStart.toISOString()}
        windowOpen={Boolean(data.busyWindow?.isOpen)}
        registeredDates={(data.pair?.busyRequests ?? []).map((item) => item.busyDate.toISOString())}
      />
    </WorkspaceShell>
  );
}
