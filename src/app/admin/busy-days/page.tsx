export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AdminBusyDaysPanel from "@/components/admin-busy-days-panel";
import { getAdminBusyDaysPageData } from "@/lib/admin-page-data";
import { formatDateInputValue } from "@/lib/date-utils";

type AdminBusyDaysPageProps = {
  searchParams?: Promise<{
    week?: string;
  }>;
};

export default async function AdminBusyDaysPage({ searchParams }: AdminBusyDaysPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedWeek = resolvedSearchParams.week === "current" ? "current" : "next";
  const data = await getAdminBusyDaysPageData(selectedWeek);
  const weekLabel = selectedWeek === "current" ? "tuần này" : "tuần sau";

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Ngày bận"
      title={`Đăng ký ngày bận ${weekLabel}`}
      metaLabel="Lượt đăng ký"
      metaValue={`${data.stats.busyRegistrations}`}
    >
      <AdminBusyDaysPanel
        selectedWeek={selectedWeek}
        targetWeekStart={formatDateInputValue(data.targetWeekStart)}
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
                  busyDate: formatDateInputValue(request.busyDate),
                  queueOrder: request.queueOrder,
                })),
              }
            : null
        }
      />
    </WorkspaceShell>
  );
}
