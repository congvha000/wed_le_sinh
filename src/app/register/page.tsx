"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Đăng ký thất bại");
      return;
    }

    setMessage("Tạo tài khoản thành công. Vui lòng đăng nhập để hoàn tất hồ sơ.");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="page-shell auth-shell">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-mark">LS</div>
            <div>
              <div className="brand-title">Quản lý lễ sinh</div>
              <div className="brand-subtitle">Tạo tài khoản mới</div>
            </div>
          </div>

          <div className="stack-sm">
            <h1 className="auth-title">Tạo tài khoản</h1>
            <p className="auth-note">Admin cần mở cổng đăng ký trước khi tạo tài khoản.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label">Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete="new-password"
            />
          </div>

          {message ? (
            <p className={message.startsWith("Tạo tài khoản thành công") ? "form-success" : "form-error"}>
              {message}
            </p>
          ) : null}

          <button className="button-primary" disabled={loading} type="submit">
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </div>
      </div>
    </main>
  );
}
