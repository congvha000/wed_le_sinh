"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

type Props = {
  selectedWeek: "current" | "next";
  targetWeekStart: string;
  busyWindow: BusyWindowItem;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminBusyDaysPanel({ selectedWeek, targetWeekStart, busyWindow }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });

  const weekLabel = selectedWeek === "current" ? "tuần này" : "tuần sau";

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

  async function handleOpenBusyWindow() {
    try {
      setLoading("open-busy-window");
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/busy-window/open", { weekStart: targetWeekStart });
      toast.success(`Đã mở đăng ký ngày bận ${weekLabel}.`);
      setMessage({ type: "success", text: `Đã mở đăng ký ngày bận ${weekLabel}.` });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể mở đăng ký ngày bận.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleCloseBusyWindow() {
    try {
      setLoading("close-busy-window");
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/busy-window/close", { weekStart: targetWeekStart });
      toast.success(`Đã khóa đăng ký ngày bận ${weekLabel}.`);
      setMessage({ type: "success", text: `Đã khóa đăng ký ngày bận ${weekLabel}.` });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể khóa đăng ký ngày bận.";
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
          <div className="section-kicker">Ngày bận linh hoạt theo tuần</div>
          <h2 style={{ margin: "8px 0 0" }}>Mở và khóa đăng ký</h2>
        </div>

        <div className="dashboard-grid form-two-col">
          <Link href="/admin/busy-days?week=current" className={selectedWeek === "current" ? "button-primary" : "button-secondary"}>
            Tuần này
          </Link>
          <Link href="/admin/busy-days?week=next" className={selectedWeek === "next" ? "button-primary" : "button-secondary"}>
            Tuần sau
          </Link>
        </div>

        <div className="note-box">
          Quy định:
          <br />- Mỗi cặp chỉ được đăng ký tối đa 2 ngày bận
          <br />- Mỗi ngày chỉ tối đa 3 cặp bận
          <br />- Ai đăng ký trước được giữ chỗ trước
        </div>

        <div className="list-card">
          <div>
            <div className="list-title">Tuần mục tiêu: {weekLabel}</div>
            <div className="list-subtitle">Bắt đầu từ {new Date(targetWeekStart).toLocaleDateString("vi-VN")}</div>
          </div>
        </div>

        <div className="dashboard-grid form-two-col">
          <button className="button-primary" type="button" onClick={handleOpenBusyWindow} disabled={loading === "open-busy-window"}>
            {loading === "open-busy-window" ? "Đang mở..." : `Mở đăng ký ${weekLabel}`}
          </button>

          <button className="button-secondary" type="button" onClick={handleCloseBusyWindow} disabled={loading === "close-busy-window"}>
            {loading === "close-busy-window" ? "Đang khóa..." : `Khóa đăng ký ${weekLabel}`}
          </button>
        </div>

        {message.text ? <div className={message.type === "error" ? "form-error" : "form-success"}>{message.text}</div> : null}
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Danh sách đã đăng ký</div>
          <h2 style={{ margin: "8px 0 0" }}>Các cặp đã báo ngày bận {weekLabel}</h2>
        </div>

        {!busyWindow ? (
          <div className="empty-state">{selectedWeek === "current" ? "Tuần này" : "Tuần sau"} chưa mở đăng ký ngày bận.</div>
        ) : busyWindow.requests.length === 0 ? (
          <div className="empty-state">Hiện chưa có cặp nào đăng ký ngày bận.</div>
        ) : (
          <div className="stack-sm">
            <div className="list-card">
              <div>
                <div className="list-title">Trạng thái: {busyWindow.isOpen ? "Đang mở" : "Đã khóa"}</div>
                <div className="list-subtitle">Mỗi ngày tối đa {busyWindow.maxPairsPerDay} cặp bận</div>
                <div className="list-meta">
                  Mở lúc {formatDateTime(busyWindow.opensAt)}
                  {busyWindow.closesAt ? ` · Khóa lúc ${formatDateTime(busyWindow.closesAt)}` : ""}
                </div>
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
      </section>
    </div>
  );
}
