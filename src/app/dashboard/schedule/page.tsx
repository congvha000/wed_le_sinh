export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import { getUserPageData } from "@/lib/user-page-data";
import { getServicePeriodFromDate, getServicePeriodLabel } from "@/config/service-time-slots";

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
            {data.pair.assignments.map((item) => {
              const period = getServicePeriodFromDate(new Date(item.service.startsAt));
              return (
                <div key={item.id} className="list-card list-card-column-mobile" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{item.service.title}</div>
                    <div className="list-subtitle">
                      {getServicePeriodLabel(period)} · {new Date(item.service.startsAt).toLocaleString("vi-VN")}
                    </div>
                    <div className="list-meta">
                      Điểm buổi lễ: {Number(item.service.points)} · Kiểu lễ: {item.service.type === "FOUR_PEOPLE" ? "Lễ 4 người" : "Lễ thường"}
                    </div>
                  </div>
                  <span className="badge badge-muted">Đã phân công</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
