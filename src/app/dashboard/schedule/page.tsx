export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import {
  SERVICE_TIME_SLOTS,
  formatTime,
  getServicePeriodFromDate,
  getServicePeriodLabel,
} from "@/config/service-time-slots";
import { formatDateLabel } from "@/lib/date-utils";
import { getUserPageData } from "@/lib/user-page-data";

function getServiceTypeLabel(type: string) {
  switch (type) {
    case "FOUR_PEOPLE":
      return "Lễ 4 người";
    case "SOLEMN":
      return "Lễ trọng";
    case "ADORATION":
      return "Chầu Thánh Thể";
    default:
      return "Lễ thường";
  }
}

function normalizeServiceTitle(title: string, startsAt: string, type: string) {
  const start = new Date(startsAt);
  const period = getServicePeriodFromDate(start, type);
  const periodLabel = getServicePeriodLabel(period);
  const defaultSlotTitle = `${periodLabel} - ${SERVICE_TIME_SLOTS[period].defaultTime}`;
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    const resolvedTime = formatTime(start);
    return resolvedTime === SERVICE_TIME_SLOTS[period].defaultTime ? periodLabel : `${periodLabel} - ${resolvedTime}`;
  }

  return trimmedTitle === defaultSlotTitle ? periodLabel : trimmedTitle;
}

export default async function DashboardSchedulePage() {
  const data = await getUserPageData();

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Lịch của tôi"
      title="Các buổi đã được phân công"
      metaLabel="Cặp hiện tại"
      metaValue={data.pair?.name || "Chưa có cặp"}
    >
      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Lịch của tôi</div>
          <h2 style={{ margin: "8px 0 0" }}>Các buổi sắp tới</h2>
        </div>

        {!data.pair || data.pair.assignments.length === 0 ? (
          <div className="empty-state">Hiện chưa có lịch phục vụ sắp tới.</div>
        ) : (
          <div className="stack-sm">
            {data.pair.assignments.map((item) => (
              <div key={item.id} className="list-card list-card-column-mobile" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="list-title">{normalizeServiceTitle(item.service.title, item.service.startsAt.toISOString(), item.service.type)}</div>
                  <div className="list-subtitle">Ngày {formatDateLabel(item.service.startsAt.toISOString())}</div>
                  <div className="list-meta">
                    Điểm buổi lễ: {Number(item.service.points)} · Kiểu lễ: {getServiceTypeLabel(item.service.type)}
                  </div>
                </div>
                <span className="badge badge-muted">Đã phân công</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
