export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import { getUserPageData } from "@/lib/user-page-data";

export default async function DashboardProfilePage() {
  const data = await getUserPageData();

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Thông tin"
      title="Thông tin thành viên và cặp"
      metaLabel="Cặp hiện tại"
      metaValue={data.pair?.name || "Chưa có cặp"}
    >
      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Thông tin cơ bản</div>
          <h2 style={{ margin: "8px 0 0" }}>Hồ sơ của bạn</h2>
        </div>

        <div className="dashboard-grid form-two-col">
          <div className="list-card">
            <div>
              <div className="list-title">Họ tên</div>
              <div className="list-subtitle">{data.ctx.user.name || "Chưa cập nhật"}</div>
            </div>
          </div>
          <div className="list-card">
            <div>
              <div className="list-title">Email</div>
              <div className="list-subtitle">{data.ctx.user.email}</div>
            </div>
          </div>
          <div className="list-card">
            <div>
              <div className="list-title">Số điện thoại</div>
              <div className="list-subtitle">{data.ctx.user.phone || "Chưa cập nhật"}</div>
            </div>
          </div>
          <div className="list-card">
            <div>
              <div className="list-title">Cặp hiện tại</div>
              <div className="list-subtitle">{data.pair?.name || "Chưa có cặp"}</div>
            </div>
          </div>
          <div className="list-card">
            <div>
              <div className="list-title">Thành viên trong cặp</div>
              <div className="list-subtitle">{data.partnerNames}</div>
            </div>
          </div>
          <div className="list-card">
            <div>
              <div className="list-title">Tổng điểm cặp</div>
              <div className="list-subtitle">{data.pair ? Number(data.pair.totalPoints) : 0}</div>
            </div>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
