"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PendingUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  profileCompleted: boolean;
  createdAt: string;
};

type UserItem = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  approved: boolean;
  profileCompleted: boolean;
  pairName: string | null;
};

type SimpleUser = {
  id: string;
  email: string;
  name: string | null;
};

type PairItem = {
  id: string;
  name: string;
  level: string;
  active: boolean;
  totalPoints: number;
  members: {
    id: string;
    name: string | null;
    email: string;
    isLeader: boolean;
  }[];
};

type ServiceItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  points: number;
  startsAt: string;
  endsAt: string;
  assignments: {
    id: string;
    pairId: string;
    pairName: string;
    role: string;
  }[];
};

type BusyWindowItem = {
  isOpen: boolean;
  opensAt: string;
  closesAt: string | null;
  maxPairsPerDay: number;
  requests: {
    id: string;
    pairName: string;
    busyDate: string;
    queueOrder: number;
  }[];
} | null;

type MonthlyStat = {
  label: string;
  totalPoints: number;
  totalServices: number;
  activePairs: number;
};

type TopPair = {
  name: string;
  points: number;
  services: number;
};

type AdminPanelProps = {
  nextWeekStart: string;
  stats: {
    totalUsers: number;
    pendingUsers: number;
    unpairedUsers: number;
    totalPairs: number;
    totalServices: number;
    assignedServices: number;
    busyRegistrations: number;
  };
  monthlyStats: MonthlyStat[];
  topPairsThisMonth: TopPair[];
  pendingUsers: PendingUser[];
  allUsers: UserItem[];
  unpairedUsers: SimpleUser[];
  pairs: PairItem[];
  services: ServiceItem[];
  busyWindow: BusyWindowItem;
};

type FlashState = {
  error: string;
  success: string;
  loading: string;
};

const initialFlash: FlashState = {
  error: "",
  success: "",
  loading: "",
};

function getPairLevelLabel(level: string) {
  return level.replace("LEVEL_", "LV");
}

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

function getRoleLabel(role: string) {
  switch (role) {
    case "CANDLE":
      return "Nến";
    case "INCENSE":
      return "Hương";
    default:
      return "Chung";
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function getAutoPoint(startsAtValue: string) {
  if (!startsAtValue) return "1";
  const date = new Date(startsAtValue);
  const day = date.getDay();
  const hour = date.getHours();

  if ((day === 6 && hour >= 12) || (day === 0 && hour < 12)) {
    return "1.2";
  }

  return "1";
}

function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: number | string;
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

export default function AdminPanel({
  nextWeekStart,
  stats,
  monthlyStats,
  topPairsThisMonth,
  pendingUsers,
  allUsers,
  unpairedUsers,
  pairs,
  services,
  busyWindow,
}: AdminPanelProps) {
  const router = useRouter();
  const [flash, setFlash] = useState(initialFlash);

  const [pairName, setPairName] = useState("");
  const [pairLevel, setPairLevel] = useState("LEVEL_1");
  const [pairId, setPairId] = useState("");
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");

  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceType, setServiceType] = useState("REGULAR");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [servicePoints, setServicePoints] = useState("1");

  const [assignServiceId, setAssignServiceId] = useState("");
  const [assignPairId, setAssignPairId] = useState("");

  const groupedServices = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();

    for (const service of services) {
      const dayKey = new Date(service.startsAt).toLocaleDateString("vi-VN");
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(service);
    }

    return Array.from(map.entries());
  }, [services]);

  const groupedBusyRequests = useMemo(() => {
    const map = new Map<string, NonNullable<BusyWindowItem>["requests"]>();

    for (const request of busyWindow?.requests ?? []) {
      const dayKey = new Date(request.busyDate).toLocaleDateString("vi-VN");
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(request);
    }

    return Array.from(map.entries());
  }, [busyWindow]);

  const maxMonthPoints = Math.max(1, ...monthlyStats.map((item) => item.totalPoints));
  const coveragePercent =
    stats.totalServices === 0 ? 0 : Math.round((stats.assignedServices / stats.totalServices) * 100);

  function setLoading(key: string) {
    setFlash({ error: "", success: "", loading: key });
  }

  function setError(message: string) {
    setFlash({ error: message, success: "", loading: "" });
  }

  function setSuccess(message: string) {
    setFlash({ error: "", success: message, loading: "" });
  }

  async function postJson(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Thao tác thất bại");
    }

    return data;
  }

  async function handleApproveUser(userId: string) {
    try {
      setLoading(`approve-${userId}`);
      await postJson("/api/admin/users/approve", { userId });
      setSuccess("Đã duyệt tài khoản.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể duyệt tài khoản.");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
      setLoading(`delete-${userId}`);
      await postJson("/api/admin/users/delete", { userId });
      setSuccess("Đã xóa tài khoản.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể xóa tài khoản.");
    }
  }

  async function handleCreatePair() {
    try {
      if (!pairName.trim()) {
        setError("Nhập tên cặp.");
        return;
      }

      setLoading("create-pair");
      await postJson("/api/admin/pairs/create", {
        name: pairName.trim(),
        level: pairLevel,
      });

      setPairName("");
      setPairLevel("LEVEL_1");
      setSuccess("Đã tạo cặp mới.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tạo cặp.");
    }
  }

  async function handleAssignMembers() {
    try {
      if (!pairId || !userA || !userB || userA === userB) {
        setError("Chọn đủ 1 cặp và 2 thành viên khác nhau.");
        return;
      }

      setLoading("assign-members");
      await postJson("/api/admin/pairs/assign-members", {
        pairId,
        userIds: [userA, userB],
      });

      setUserA("");
      setUserB("");
      setSuccess("Đã gán 2 thành viên vào cặp.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể gán thành viên vào cặp.");
    }
  }

  async function handleCreateService() {
    try {
      if (!serviceTitle.trim() || !startsAt || !endsAt) {
        setError("Nhập đủ tên lễ, giờ bắt đầu và giờ kết thúc.");
        return;
      }

      setLoading("create-service");
      await postJson("/api/admin/services/create", {
        title: serviceTitle.trim(),
        type: serviceType,
        startsAt,
        endsAt,
        points: Number(servicePoints),
      });

      setServiceTitle("");
      setStartsAt("");
      setEndsAt("");
      setServicePoints("1");
      setSuccess("Đã tạo lịch lễ.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tạo lịch lễ.");
    }
  }

  async function handleAssignService() {
    try {
      if (!assignServiceId || !assignPairId) {
        setError("Chọn buổi lễ và cặp cần gán.");
        return;
      }

      setLoading("assign-service");
      await postJson("/api/admin/services/assign", {
        serviceId: assignServiceId,
        pairId: assignPairId,
      });

      setSuccess("Đã gán cặp vào buổi lễ.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể gán cặp vào buổi lễ.");
    }
  }

  async function handleOpenBusyWindow() {
    try {
      setLoading("open-busy-window");
      await postJson("/api/admin/busy-window/open", {
        weekStart: nextWeekStart,
      });
      setSuccess("Đã mở đăng ký ngày bận tuần sau.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể mở đăng ký ngày bận.");
    }
  }

  async function handleCloseBusyWindow() {
    try {
      setLoading("close-busy-window");
      await postJson("/api/admin/busy-window/close", {
        weekStart: nextWeekStart,
      });
      setSuccess("Đã khóa đăng ký ngày bận tuần sau.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể khóa đăng ký ngày bận.");
    }
  }

  async function handleAutoAssign() {
    try {
      setLoading("auto-assign");
      const data = await postJson("/api/admin/services/auto-assign", {
        weekStart: nextWeekStart,
      });
      setSuccess(data?.summary?.message ?? "Đã tự xếp lịch.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tự xếp lịch.");
    }
  }

  return (
    <div className="stack-lg">
      <section className="metric-grid stats-grid">
        <StatCard label="Tổng thành viên" value={stats.totalUsers} note="Tất cả thành viên thường đang có trong hệ thống." accent="accent-blue" />
        <StatCard label="Chờ duyệt" value={stats.pendingUsers} note="Các tài khoản cần admin xác nhận trước khi dùng." accent="accent-yellow" />
        <StatCard label="Chưa có cặp" value={stats.unpairedUsers} note="Thành viên đã duyệt nhưng chưa được ghép cặp." accent="accent-purple" />
        <StatCard label="Tổng cặp" value={stats.totalPairs} note="Số cặp hiện có để phân lịch và đăng ký ngày bận." accent="accent-green" />
        <StatCard label="Lịch tuần sau" value={stats.totalServices} note="Tổng số buổi lễ đã nhập cho tuần mục tiêu." accent="accent-blue" />
        <StatCard label="Đã gán" value={`${stats.assignedServices}/${stats.totalServices}`} note="Mức độ phủ lịch hiện tại của tuần sau." accent="accent-green" />
        <StatCard label="Ngày bận đã đăng ký" value={stats.busyRegistrations} note="Tổng lượt đăng ký ngày bận của các cặp." accent="accent-yellow" />
      </section>

      <section className="card section-pad stack-md">
        <div className="section-heading">
          <div>
            <div className="section-kicker">Mức sẵn sàng tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Tình trạng điều phối hiện tại</h2>
          </div>

          <span className={`badge ${busyWindow?.isOpen ? "badge-success" : "badge-muted"}`}>
            {busyWindow?.isOpen ? "Đang mở đăng ký ngày bận" : "Đăng ký ngày bận đang đóng"}
          </span>
        </div>

        <div className="progress-shell">
          <div className="progress-bar" style={{ width: `${coveragePercent}%` }} />
        </div>

        <div className="list-meta">Đã gán {stats.assignedServices}/{stats.totalServices} buổi lễ · mức phủ {coveragePercent}%.</div>

        {flash.error ? <div className="form-error">{flash.error}</div> : null}
        {flash.success ? <div className="form-success">{flash.success}</div> : null}
      </section>

      <section id="thong-ke" className="dashboard-grid section-anchor two-col-layout">
        <div className="card section-pad stack-md">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Thống kê điểm</div>
              <h2 style={{ margin: "8px 0 0" }}>Điểm theo tháng</h2>
            </div>
            <span className="badge badge-muted">12 tháng gần nhất</span>
          </div>

          <div className="chart-shell">
            <div className="chart-grid">
              {monthlyStats.map((item) => {
                const height = Math.max(8, (item.totalPoints / maxMonthPoints) * 100);

                return (
                  <div key={item.label} className="chart-column">
                    <div className="chart-value">{item.totalPoints}</div>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: `${height}%` }} />
                    </div>
                    <div className="chart-label">{item.label}</div>
                    <div className="chart-subtitle">{item.totalServices} buổi · {item.activePairs} cặp</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="note-box">Điểm tháng được tính từ các buổi đã gán. Nhờ vậy bạn có thể nhìn nhanh tháng nào đang dồn lịch nhiều để điều phối cân bằng hơn.</div>
        </div>

        <div className="card section-pad stack-md">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Xếp hạng tháng này</div>
              <h2 style={{ margin: "8px 0 0" }}>Top cặp có điểm cao</h2>
            </div>
          </div>

          {topPairsThisMonth.length === 0 ? (
            <div className="empty-state">Tháng này chưa có dữ liệu điểm.</div>
          ) : (
            <div className="stack-sm">
              {topPairsThisMonth.map((pair, index) => (
                <div key={`${pair.name}-${index}`} className="list-card">
                  <div>
                    <div className="list-title">#{index + 1} · {pair.name}</div>
                    <div className="list-subtitle">{pair.points} điểm · {pair.services} buổi</div>
                  </div>
                  <span className="badge badge-success">{pair.points} điểm</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="thanh-vien" className="dashboard-grid section-anchor two-col-layout">
        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Thành viên</div>
            <h2 style={{ margin: "8px 0 0" }}>Duyệt tài khoản chờ</h2>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="empty-state">Hiện không có tài khoản nào chờ duyệt.</div>
          ) : (
            <div className="stack-sm">
              {pendingUsers.map((user) => (
                <div key={user.id} className="list-card list-card-column-mobile" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{user.name || "(Chưa có tên)"}</div>
                    <div className="list-subtitle">{user.email}</div>
                    <div className="list-meta">SĐT: {user.phone || "Chưa cập nhật"} · Hồ sơ: {user.profileCompleted ? "Đã đủ" : "Chưa đủ"} · Tạo lúc: {formatDateTime(user.createdAt)}</div>
                  </div>

                  <button className="button-primary" type="button" onClick={() => handleApproveUser(user.id)} disabled={flash.loading === `approve-${user.id}`}>
                    {flash.loading === `approve-${user.id}` ? "Đang duyệt..." : "Duyệt"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Thành viên</div>
            <h2 style={{ margin: "8px 0 0" }}>Danh sách tài khoản</h2>
          </div>

          <div className="stack-sm">
            {allUsers.length === 0 ? (
              <div className="empty-state">Chưa có tài khoản thành viên nào.</div>
            ) : (
              allUsers.map((user) => (
                <div key={user.id} className="list-card list-card-column-mobile" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{user.name || "(Chưa có tên)"}</div>
                    <div className="list-subtitle">{user.email}</div>
                    <div className="list-meta">Trạng thái: {user.approved ? "Đã duyệt" : "Chưa duyệt"} · Hồ sơ: {user.profileCompleted ? "Đã đủ" : "Chưa đủ"} · Cặp: {user.pairName || "Chưa có"}</div>
                  </div>

                  <button className="button-secondary" type="button" onClick={() => handleDeleteUser(user.id)} disabled={flash.loading === `delete-${user.id}`}>
                    {flash.loading === `delete-${user.id}` ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="cap-le-sinh" className="dashboard-grid section-anchor two-col-layout">
        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Cặp lễ sinh</div>
            <h2 style={{ margin: "8px 0 0" }}>Tạo cặp và ghép thành viên</h2>
          </div>

          <input className="input" value={pairName} onChange={(e) => setPairName(e.target.value)} placeholder="Tên cặp, ví dụ: Cặp 1" />

          <select className="input" value={pairLevel} onChange={(e) => setPairLevel(e.target.value)}>
            <option value="LEVEL_1">LV1</option>
            <option value="LEVEL_2">LV2</option>
            <option value="LEVEL_3">LV3</option>
          </select>

          <button className="button-primary" type="button" onClick={handleCreatePair} disabled={flash.loading === "create-pair"}>
            {flash.loading === "create-pair" ? "Đang tạo..." : "Tạo cặp"}
          </button>

          <div className="line-separator" />

          <div>
            <div className="section-kicker">Gán thành viên</div>
            <h3 style={{ margin: "8px 0 12px" }}>Ghép 2 thành viên vào cặp</h3>
          </div>

          <select className="input" value={pairId} onChange={(e) => setPairId(e.target.value)}>
            <option value="">Chọn cặp</option>
            {pairs.map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.name} - {getPairLevelLabel(pair.level)}
              </option>
            ))}
          </select>

          <select className="input" value={userA} onChange={(e) => setUserA(e.target.value)}>
            <option value="">Chọn thành viên 1</option>
            {unpairedUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {(user.name || user.email) + " - " + user.email}
              </option>
            ))}
          </select>

          <select className="input" value={userB} onChange={(e) => setUserB(e.target.value)}>
            <option value="">Chọn thành viên 2</option>
            {unpairedUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {(user.name || user.email) + " - " + user.email}
              </option>
            ))}
          </select>

          <button className="button-primary" type="button" onClick={handleAssignMembers} disabled={flash.loading === "assign-members"}>
            {flash.loading === "assign-members" ? "Đang gán..." : "Gán vào cặp"}
          </button>
        </div>

        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Cặp lễ sinh</div>
            <h2 style={{ margin: "8px 0 0" }}>Danh sách cặp hiện có</h2>
          </div>

          {pairs.length === 0 ? (
            <div className="empty-state">Chưa có cặp nào được tạo.</div>
          ) : (
            <div className="stack-sm">
              {pairs.map((pair) => (
                <div key={pair.id} className="list-card" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="list-title">{pair.name} - {getPairLevelLabel(pair.level)}</div>
                    <div className="list-subtitle">Điểm: {pair.totalPoints} · {pair.active ? "Đang hoạt động" : "Đã khóa"}</div>
                    <div className="list-meta">{pair.members.length === 0 ? "Chưa có thành viên" : pair.members.map((member) => `${member.name || member.email}${member.isLeader ? " (Trưởng)" : ""}`).join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="ngay-ban" className="dashboard-grid section-anchor two-col-layout">
        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Ngày bận tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Mở và khóa đăng ký</h2>
          </div>

          <div className="note-box">
            Quy định:
            <br />- Mỗi cặp chỉ được đăng ký tối đa 2 ngày bận
            <br />- Mỗi ngày chỉ tối đa 3 cặp bận
            <br />- Ai đăng ký trước được giữ chỗ trước
          </div>

          <div className="list-card">
            <div>
              <div className="list-title">Tuần mục tiêu</div>
              <div className="list-subtitle">Bắt đầu từ {new Date(nextWeekStart).toLocaleDateString("vi-VN")}</div>
            </div>
          </div>

          <div className="dashboard-grid form-two-col">
            <button className="button-primary" type="button" onClick={handleOpenBusyWindow} disabled={flash.loading === "open-busy-window"}>
              {flash.loading === "open-busy-window" ? "Đang mở..." : "Mở đăng ký"}
            </button>

            <button className="button-secondary" type="button" onClick={handleCloseBusyWindow} disabled={flash.loading === "close-busy-window"}>
              {flash.loading === "close-busy-window" ? "Đang khóa..." : "Khóa đăng ký"}
            </button>
          </div>
        </div>

        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Ngày bận tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Danh sách đã đăng ký</h2>
          </div>

          {!busyWindow ? (
            <div className="empty-state">Tuần sau chưa mở đăng ký ngày bận.</div>
          ) : busyWindow.requests.length === 0 ? (
            <div className="empty-state">Hiện chưa có cặp nào đăng ký ngày bận.</div>
          ) : (
            <div className="stack-sm">
              <div className="list-card">
                <div>
                  <div className="list-title">Trạng thái: {busyWindow.isOpen ? "Đang mở" : "Đã khóa"}</div>
                  <div className="list-subtitle">Mỗi ngày tối đa {busyWindow.maxPairsPerDay} cặp bận</div>
                  <div className="list-meta">Mở lúc {formatDateTime(busyWindow.opensAt)}{busyWindow.closesAt ? ` · Khóa lúc ${formatDateTime(busyWindow.closesAt)}` : ""}</div>
                </div>
              </div>

              {groupedBusyRequests.map(([day, items]) => (
                <div key={day} className="card card-soft section-pad stack-sm">
                  <div>
                    <div className="list-title">{day}</div>
                    <div className="list-meta">{items.length} cặp đăng ký</div>
                  </div>

                  {items.map((item) => (
                    <div key={item.id} className="list-card">
                      <div>
                        <div className="list-title">{item.pairName}</div>
                        <div className="list-subtitle">Thứ tự đăng ký: {item.queueOrder}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="xep-lich" className="dashboard-grid section-anchor two-col-layout">
        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Xếp lịch tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Quản lý buổi lễ</h2>
          </div>

          <div className="note-box">
            Quy ước:
            <br />- Lễ thường: nhận 1 cặp
            <br />- Lễ 4 người: nhận 2 cặp, dùng vai trò Nến và Hương
            <br />- Tự xếp ưu tiên cặp ít điểm hơn, tránh trùng giờ và tránh ngày bận
          </div>

          <input className="input" value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} placeholder="Tên buổi lễ" />

          <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="REGULAR">Lễ thường</option>
            <option value="SOLEMN">Lễ trọng</option>
            <option value="ADORATION">Chầu Thánh Thể</option>
            <option value="FOUR_PEOPLE">Lễ 4 người</option>
          </select>

          <input className="input" type="datetime-local" value={startsAt} onChange={(e) => { const value = e.target.value; setStartsAt(value); setServicePoints(getAutoPoint(value)); }} />

          <input className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />

          <input className="input" type="number" step="0.1" value={servicePoints} onChange={(e) => setServicePoints(e.target.value)} placeholder="Điểm buổi lễ" />

          <div className="dashboard-grid form-two-col">
            <button className="button-primary" type="button" onClick={handleCreateService} disabled={flash.loading === "create-service"}>
              {flash.loading === "create-service" ? "Đang tạo..." : "Tạo buổi lễ"}
            </button>

            <button className="button-secondary" type="button" onClick={handleAutoAssign} disabled={flash.loading === "auto-assign"}>
              {flash.loading === "auto-assign" ? "Đang xếp..." : "Tự xếp lịch"}
            </button>
          </div>

          <div className="line-separator" />

          <div>
            <div className="section-kicker">Gán tay khi cần</div>
            <h3 style={{ margin: "8px 0 12px" }}>Gán cặp vào buổi lễ</h3>
          </div>

          <select className="input" value={assignServiceId} onChange={(e) => setAssignServiceId(e.target.value)}>
            <option value="">Chọn buổi lễ</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title} - {formatDateTime(service.startsAt)}
              </option>
            ))}
          </select>

          <select className="input" value={assignPairId} onChange={(e) => setAssignPairId(e.target.value)}>
            <option value="">Chọn cặp</option>
            {pairs.filter((pair) => pair.active && pair.members.length >= 2).map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.name} - {getPairLevelLabel(pair.level)} - {pair.totalPoints} điểm
              </option>
            ))}
          </select>

          <button className="button-primary" type="button" onClick={handleAssignService} disabled={flash.loading === "assign-service"}>
            {flash.loading === "assign-service" ? "Đang gán..." : "Gán vào buổi lễ"}
          </button>
        </div>

        <div className="card section-pad stack-md">
          <div>
            <div className="section-kicker">Lịch tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>Danh sách buổi lễ</h2>
          </div>

          {services.length === 0 ? (
            <div className="empty-state">Tuần sau hiện chưa có buổi lễ nào.</div>
          ) : (
            <div className="stack-sm">
              {groupedServices.map(([day, items]) => (
                <div key={day} className="card card-soft section-pad stack-sm">
                  <div>
                    <div className="list-title">{day}</div>
                    <div className="list-meta">{items.length} buổi lễ</div>
                  </div>

                  {items.map((service) => (
                    <div key={service.id} className="list-card" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="list-title">{service.title}</div>
                        <div className="list-subtitle">{formatDateTime(service.startsAt)} - {formatDateTime(service.endsAt)}</div>
                        <div className="list-meta">{getServiceTypeLabel(service.type)} · {service.points} điểm · {service.status}</div>
                        <div className="list-meta" style={{ marginTop: 6 }}>
                          {service.assignments.length === 0 ? "Chưa có cặp nào được gán" : `Đã gán: ${service.assignments.map((assignment) => `${assignment.pairName} (${getRoleLabel(assignment.role)})`).join(" · ")}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
