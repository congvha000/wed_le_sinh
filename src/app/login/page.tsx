"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        redirectTo: "/",
      });

      if (typeof result === "string") {
        router.replace(result || "/");
        router.refresh();
        return;
      }

      if (!result || result.error) {
        setMessage("Sai tài khoản hoặc mật khẩu");
        return;
      }

      router.replace(result.url || "/");
      router.refresh();
    } catch {
      setMessage("Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-shell">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-mark">LS</div>
            <div>
              <div className="brand-title">Quản lý lễ sinh</div>
              <div className="brand-subtitle">Đăng nhập hệ thống</div>
            </div>
          </div>

          <h1 className="auth-title">Đăng nhập</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="field-label">Tài khoản hoặc email</label>
            <input
              className="input"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="field-label">Mật khẩu</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {message ? <div className="form-error">{message}</div> : null}

          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản? <Link href="/register">Tạo tài khoản</Link>
        </div>
      </div>
    </main>
  );
}
