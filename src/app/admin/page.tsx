export const dynamic = "force-dynamic";

import Link from "next/link";
import WorkspaceShell from "@/components/workspace-shell";
import { getAdminPageData } from "@/lib/admin-page-data";

function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string | number;
  note: string;
  accent: "accent-blue" | "accent-green" | "accent-yellow" | "accent-purple";
}) {
  return (
    <div className={`metric-card ${accent}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const data = await getAdminPageData();
  const coveragePercent =
    data.stats.totalServices === 0 ? 0 : Math.round((data.stats.assignedServices / data.stats.totalServices) * 100);

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Khu vực quản trị"
      title="Tổng quan điều phối"
      metaLabel="Quản trị viên"
      metaValue={data.ctx.user.name || data.ctx.user.email}
    >
      <section className="metric-grid stats-grid">
        <StatCard label="Tổng thành viên" value={data.stats.totalUsers} note="Thành viên thường" accent="accent-blue" />
        <StatCard label="Chờ duyệt" value={data.stats.pendingUsers} note="Tài khoản mới" accent="accent-yellow" />
        <StatCard label="Tổng cặp" value={data.stats.totalPairs} note="Cặp hiện có" accent="accent-green" />
        <StatCard label="Lịch tuần sau" value={data.stats.totalServices} note="Buổi lễ đã tạo" accent="accent-purple" />
      </section>

      <section className="card section-pad stack-md">
        <div className="section-heading">
          <div>
            <div className="section-kicker">Tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Tiến độ phân công</h2>
          </div>
          <span className={`badge ${data.busyWindow?.isOpen ? "badge-success" : "badge-muted"}`}>
            {data.busyWindow?.isOpen ? "Đang mở ngày bận" : "Ngày bận đang đóng"}
          </span>
        </div>

        <div className="progress-shell">
          <div className="progress-bar" style={{ width: `${coveragePercent}%` }} />
        </div>
        <div className="list-meta">
          Đã gán {data.stats.assignedServices}/{data.stats.totalServices} buổi lễ · mức phủ {coveragePercent}%.
        </div>
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Truy cập nhanh</div>
          <h2 style={{ margin: "8px 0 0" }}>Các trang quản trị</h2>
        </div>

        <div className="quick-link-grid">
          <Link href="/admin/stats" className="quick-link-card">
            <div className="list-title">Thống kê điểm</div>
            <div className="list-subtitle">Điểm theo tháng và top cặp.</div>
          </Link>
          <Link href="/admin/users" className="quick-link-card">
            <div className="list-title">Thành viên</div>
            <div className="list-subtitle">Duyệt và quản lý tài khoản.</div>
          </Link>
          <Link href="/admin/pairs" className="quick-link-card">
            <div className="list-title">Cặp lễ sinh</div>
            <div className="list-subtitle">Tạo cặp và ghép thành viên.</div>
          </Link>
          <Link href="/admin/busy-days" className="quick-link-card">
            <div className="list-title">Ngày bận</div>
            <div className="list-subtitle">Mở đăng ký và xem danh sách.</div>
          </Link>
          <Link href="/admin/services" className="quick-link-card">
            <div className="list-title">Xếp lịch</div>
            <div className="list-subtitle">Tạo, sửa và phân công buổi lễ.</div>
          </Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
