export default function PendingApprovalPage() {
  return (
    <main
      className="page-shell"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 560, padding: 28 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Đang chờ duyệt</h1>
        <p style={{ color: "#cbd5e1", marginTop: 12, lineHeight: 1.7 }}>
          Tài khoản của bạn đã hoàn tất hồ sơ nhưng vẫn đang chờ admin duyệt.
          Sau khi được duyệt, bạn sẽ có thể dùng tiếp các chức năng của hệ thống.
        </p>
      </div>
    </main>
  );
}