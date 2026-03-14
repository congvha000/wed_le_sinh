"use client";

import { useState } from "react";

type Props = {
  endpoint?: string;
  title?: string;
  description?: string;
};

type StatusState = {
  type: "" | "error" | "success";
  message: string;
};

export default function AccountSecurityForm({
  endpoint = "/api/user/change-password",
  title = "Đổi mật khẩu",
  description = "Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn.",
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ type: "error", message: "Vui lòng nhập đầy đủ các trường." });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: "error", message: "Mật khẩu mới cần có ít nhất 6 ký tự." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Xác nhận mật khẩu mới chưa khớp." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Không thể đổi mật khẩu." });
        return;
      }

      setStatus({ type: "success", message: "Đổi mật khẩu thành công." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setStatus({ type: "error", message: "Có lỗi xảy ra, vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card section-pad stack-md">
      <div>
        <div className="section-kicker">Bảo mật</div>
        <h2 style={{ margin: "8px 0 0" }}>{title}</h2>
        <p className="muted" style={{ marginTop: 10 }}>
          {description}
        </p>
      </div>

      <form className="stack-sm" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Mật khẩu hiện tại</label>
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="dashboard-grid form-two-col">
          <div>
            <label className="field-label">Mật khẩu mới</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="field-label">Xác nhận mật khẩu mới</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="note-box">
          Mẹo: dùng mật khẩu ít nhất 6 ký tự và không trùng mật khẩu cũ để an toàn hơn.
        </div>

        {status.message ? (
          <div className={status.type === "error" ? "form-error" : "form-success"}>{status.message}</div>
        ) : null}

        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
