export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import { getAdminPageData } from "@/lib/admin-page-data";

export default async function AdminStatsPage() {
  const data = await getAdminPageData();
  const maxMonthPoints = Math.max(1, ...data.monthlyStats.map((item) => item.totalPoints));

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Thống kê điểm"
      title="Điểm và xếp hạng theo tháng"
      metaLabel="Quản trị viên"
      metaValue={data.ctx.user.name || data.ctx.user.email}
    >
      <div className="dashboard-grid two-col-layout">
        <section className="card section-pad stack-md">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Thống kê điểm</div>
              <h2 style={{ margin: "8px 0 0" }}>Điểm theo tháng</h2>
            </div>
            <span className="badge badge-muted">12 tháng gần nhất</span>
          </div>

          <div className="chart-shell">
            <div className="chart-grid">
              {data.monthlyStats.map((item) => {
                const height = Math.max(8, (item.totalPoints / maxMonthPoints) * 100);
                return (
                  <div key={item.label} className="chart-column">
                    <div className="chart-value">{item.totalPoints}</div>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: `${height}%` }} />
                    </div>
                    <div className="chart-label">{item.label}</div>
                    <div className="chart-subtitle">
                      {item.totalServices} buổi · {item.activePairs} cặp
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Xếp hạng tháng này</div>
            <h2 style={{ margin: "8px 0 0" }}>Top cặp có điểm cao</h2>
          </div>

          {data.topPairsThisMonth.length === 0 ? (
            <div className="empty-state">Tháng này chưa có dữ liệu điểm.</div>
          ) : (
            <div className="stack-sm">
              {data.topPairsThisMonth.map((pair, index) => (
                <div key={`${pair.name}-${index}`} className="list-card">
                  <div>
                    <div className="list-title">#{index + 1} · {pair.name}</div>
                    <div className="list-subtitle">
                      {pair.points} điểm · {pair.services} buổi
                    </div>
                  </div>
                  <span className="badge badge-success">{pair.points} điểm</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
