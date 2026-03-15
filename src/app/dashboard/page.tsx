export const dynamic = "force-dynamic";

import Link from "next/link";
import WorkspaceShell from "@/components/workspace-shell";
import { getUserPageData } from "@/lib/user-page-data";

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

export default async function DashboardOverviewPage() {
  const data = await getUserPageData();

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Khu vực thành viên"
      title={`Xin chào ${data.ctx.user.name || data.ctx.user.email}`}
      metaLabel="Cặp hiện tại"
      metaValue={data.pair?.name || "Chưa có cặp"}
    >
      <section className="metric-grid stats-grid">
        <StatCard label="Cấp cặp" value={data.pair?.level?.replace("LEVEL_", "LV") || "--"} note="Cấp hiện tại" accent="accent-blue" />
        <StatCard label="Điểm hiện tại" value={data.pair ? Number(data.pair.totalPoints) : 0} note="Điểm tích lũy" accent="accent-green" />
        <StatCard label="Lịch sắp tới" value={data.pair?.assignments.length || 0} note="Buổi đã phân công" accent="accent-purple" />
        <StatCard label="Ngày bận tuần sau" value={`${data.pairBusyDaysCount}/2`} note="Số ngày bận của cả cặp" accent="accent-yellow" />
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Truy cập nhanh</div>
          <h2 style={{ margin: "8px 0 0" }}>Các trang thành viên</h2>
        </div>

        <div className="quick-link-grid">
          <Link href="/dashboard/schedule" className="quick-link-card">
            <div className="list-title">Lịch của tôi</div>
            <div className="list-subtitle">Các buổi đã được phân công.</div>
          </Link>
          <Link href="/dashboard/busy-days" className="quick-link-card">
            <div className="list-title">Ngày bận</div>
            <div className="list-subtitle">Mỗi người chọn 1 ngày bận.</div>
          </Link>
          <Link href="/dashboard/stats" className="quick-link-card">
            <div className="list-title">Thống kê điểm</div>
            <div className="list-subtitle">Điểm theo tháng của cặp.</div>
          </Link>
          <Link href="/dashboard/profile" className="quick-link-card">
            <div className="list-title">Thông tin</div>
            <div className="list-subtitle">Thông tin cá nhân và cặp.</div>
          </Link>
          <Link href="/dashboard/account" className="quick-link-card">
            <div className="list-title">Tài khoản</div>
            <div className="list-subtitle">Đổi mật khẩu.</div>
          </Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
