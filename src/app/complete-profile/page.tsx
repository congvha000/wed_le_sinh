"use client";

import { FormEvent, useState } from "react";

export default function CompleteProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/user/complete-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, phone }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Không thể cập nhật hồ sơ");
      return;
    }

    setMessage("Cập nhật hồ sơ thành công");

    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }

  return (
    <main
      className="page-shell"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 520, padding: 28 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Hoàn tất hồ sơ</h1>
        <p style={{ color: "#cbd5e1" }}>
          Vui lòng nhập họ tên và số điện thoại trước khi tiếp tục dùng hệ thống.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8 }}>Họ và tên</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8 }}>Số điện thoại</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
            />
          </div>

          {message ? <p style={{ color: "#cbd5e1", margin: 0 }}>{message}</p> : null}

          <button className="button-primary" disabled={loading} type="submit">
            {loading ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </form>
      </div>
    </main>
  );
}