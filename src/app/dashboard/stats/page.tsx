export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import { getUserPageData } from "@/lib/user-page-data";

export default async function DashboardStatsPage() {
  const data = await getUserPageData();
  const maxMonthPoints = Math.max(1, ...data.monthlyStats.map((item) => item.points));

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Thống kê điểm"
      title="Điểm theo tháng của cặp"
      metaLabel="Cặp hiện tại"
      metaValue={data.pair?.name || "Chưa có cặp"}
    >
      <section className="metric-grid stats-grid">
        <div className="metric-card accent-blue">
          <div className="metric-label">Điểm tháng này</div>
          <div className="metric-value">{data.currentMonthPoints}</div>
          <div className="metric-note">Tổng điểm từ các buổi thuộc tháng hiện tại.</div>
        </div>
        <div className="metric-card accent-green">
          <div className="metric-label">Tháng cao nhất</div>
          <div className="metric-value">{data.bestMonth.points}</div>
          <div className="metric-note">{data.bestMonth.label}</div>
        </div>
        <div className="metric-card accent-purple">
          <div className="metric-label">Tổng lượt phục vụ</div>
          <div className="metric-value">{data.monthlyAssignments.length}</div>
          <div className="metric-note">Trong 12 tháng gần nhất.</div>
        </div>
      </section>

      <section className="card section-pad stack-md">
        <div className="section-heading">
          <div>
            <div className="section-kicker">Biểu đồ điểm</div>
            <h2 style={{ margin: "8px 0 0" }}>Điểm theo tháng</h2>
          </div>
          <span className="badge badge-muted">12 tháng gần nhất</span>
        </div>

        {data.pair ? (
          <div className="chart-shell">
            <div className="chart-grid">
              {data.monthlyStats.map((item) => {
                const height = Math.max(8, (item.points / maxMonthPoints) * 100);
                return (
                  <div key={item.label} className="chart-column">
                    <div className="chart-value">{item.points}</div>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: `${height}%` }} />
                    </div>
                    <div className="chart-label">{item.label}</div>
                    <div className="chart-subtitle">{item.services} buổi</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">Bạn chưa có cặp nên chưa có thống kê điểm theo tháng.</div>
        )}
      </section>
    </WorkspaceShell>
  );
}
