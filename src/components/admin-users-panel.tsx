"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

type Props = {
  pendingUsers: PendingUser[];
  allUsers: UserItem[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminUsersPanel({ pendingUsers, allUsers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Thao tác thất bại");
    return data;
  }

  async function handleApproveUser(userId: string) {
    try {
      setLoading(`approve-${userId}`);
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/users/approve", { userId });
      toast.success("Đã duyệt tài khoản.");
      setMessage({ type: "success", text: "Đã duyệt tài khoản thành công." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể duyệt tài khoản.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
      setLoading(`delete-${userId}`);
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/users/delete", { userId });
      toast.success("Đã xóa tài khoản.");
      setMessage({ type: "success", text: "Đã xóa tài khoản thành công." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể xóa tài khoản.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="dashboard-grid two-col-layout">
      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Thành viên chờ duyệt</div>
          <h2 style={{ margin: "8px 0 0" }}>Duyệt tài khoản mới</h2>
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
                  <div className="list-meta">
                    SĐT: {user.phone || "Chưa cập nhật"} · Hồ sơ: {user.profileCompleted ? "Đã đủ" : "Chưa đủ"}
                    {" · "}Tạo lúc: {formatDateTime(user.createdAt)}
                  </div>
                </div>

                <button
                  className="button-primary"
                  type="button"
                  onClick={() => handleApproveUser(user.id)}
                  disabled={loading === `approve-${user.id}`}
                >
                  {loading === `approve-${user.id}` ? "Đang duyệt..." : "Duyệt"}
                </button>
              </div>
            ))}
          </div>
        )}

        {message.text ? (
          <div className={message.type === "error" ? "form-error" : "form-success"}>{message.text}</div>
        ) : null}
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Tất cả thành viên</div>
          <h2 style={{ margin: "8px 0 0" }}>Danh sách tài khoản</h2>
        </div>

        {allUsers.length === 0 ? (
          <div className="empty-state">Chưa có tài khoản thành viên nào.</div>
        ) : (
          <div className="stack-sm">
            {allUsers.map((user) => (
              <div key={user.id} className="list-card list-card-column-mobile" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="list-title">{user.name || "(Chưa có tên)"}</div>
                  <div className="list-subtitle">{user.email}</div>
                  <div className="list-meta">
                    Trạng thái: {user.approved ? "Đã duyệt" : "Chưa duyệt"} · Hồ sơ: {user.profileCompleted ? "Đã đủ" : "Chưa đủ"}
                    {" · "}Cặp: {user.pairName || "Chưa có"}
                  </div>
                </div>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => handleDeleteUser(user.id)}
                  disabled={loading === `delete-${user.id}`}
                >
                  {loading === `delete-${user.id}` ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
