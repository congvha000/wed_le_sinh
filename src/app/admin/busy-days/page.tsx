export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AdminBusyDaysPanel from "@/components/admin-busy-days-panel";
import { getAdminBusyDaysPageData } from "@/lib/admin-page-data";

export default async function AdminBusyDaysPage() {
  const data = await getAdminBusyDaysPageData();

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Ngày bận"
      title="Đăng ký ngày bận tuần sau"
      metaLabel="Lượt đăng ký"
      metaValue={`${data.stats.busyRegistrations}`}
    >
      <AdminBusyDaysPanel
        nextWeekStart={data.nextWeekStart.toISOString()}
        busyWindow={
          data.busyWindow
            ? {
                isOpen: data.busyWindow.isOpen,
                opensAt: data.busyWindow.opensAt.toISOString(),
                closesAt: data.busyWindow.closesAt ? data.busyWindow.closesAt.toISOString() : null,
                maxPairsPerDay: data.busyWindow.maxPairsPerDay,
                requests: data.busyWindow.requests.map((request) => ({
                  id: request.id,
                  pairName: request.pair.name,
                  busyDate: request.busyDate.toISOString(),
                  queueOrder: request.queueOrder,
                })),
              }
            : null
        }
      />
    </WorkspaceShell>
  );
}
