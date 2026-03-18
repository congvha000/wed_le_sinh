export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import BusyRegistrationPanel from "@/components/busy-registration-panel";
import { getUserPageData } from "@/lib/user-page-data";
import { formatDateInputValue } from "@/lib/date-utils";

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
        nextWeekStart={formatDateInputValue(data.nextWeekStart)}
        windowOpen={Boolean(data.busyWindow?.isOpen)}
        selectedDate={data.currentUserBusyRequest ? formatDateInputValue(data.currentUserBusyRequest.busyDate) : null}
        partnerDate={data.partnerBusyRequest ? formatDateInputValue(data.partnerBusyRequest.busyDate) : null}
        legacyBusyDates={data.legacyBusyDates.map((date) => formatDateInputValue(date))}
      />
    </WorkspaceShell>
  );
}
