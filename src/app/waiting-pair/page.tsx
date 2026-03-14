export default function WaitingPairPage() {
  return (
    <main
      className="page-shell"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 560, padding: 28 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>Đang chờ xếp cặp</h1>
        <p style={{ color: "#cbd5e1", marginTop: 12, lineHeight: 1.7 }}>
          Bạn đã được admin duyệt, nhưng hiện chưa được xếp vào cặp lễ sinh.
          Vui lòng chờ admin ghép cặp để bắt đầu nhận lịch phục vụ.
        </p>
      </div>
    </main>
  );
}