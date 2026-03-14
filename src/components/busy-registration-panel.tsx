"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BusyRegistrationPanelProps = {
  pairId: string | null;
  pairName: string | null;
  nextWeekStart: string;
  windowOpen: boolean;
  registeredDates: string[];
};

type StatusState = {
  type: "" | "error" | "success";
  message: string;
};

export default function BusyRegistrationPanel({
  pairId,
  pairName,
  nextWeekStart,
  windowOpen,
  registeredDates,
}: BusyRegistrationPanelProps) {
  const router = useRouter();
  const [selectedDates, setSelectedDates] = useState<string[]>(
    registeredDates.map((date) => toInputDate(new Date(date))),
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const weekDates = useMemo(() => {
    const start = new Date(nextWeekStart);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return {
        fullLabel: date.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        weekday: date.toLocaleDateString("vi-VN", { weekday: "short" }),
        day: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        value: toInputDate(date),
      };
    });
  }, [nextWeekStart]);

  function toggleDate(value: string) {
    setStatus({ type: "", message: "" });

    setSelectedDates((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

      if (prev.length >= 2) {
        setStatus({ type: "error", message: "Mỗi cặp chỉ được chọn tối đa 2 ngày bận." });
        return prev;
      }

      return [...prev, value].sort();
    });
  }

  async function handleSave() {
    if (!pairId) {
      setStatus({ type: "error", message: "Bạn chưa được gán vào cặp nên chưa thể đăng ký." });
      return;
    }

    if (!windowOpen) {
      setStatus({ type: "error", message: "Admin chưa mở hoặc đã khóa đăng ký ngày bận." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/user/busy-days/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, weekStart: nextWeekStart, dates: selectedDates }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "error", message: data?.error || "Không thể lưu ngày bận." });
        return;
      }

      setStatus({ type: "success", message: "Đã lưu ngày bận tuần sau." });
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "Không thể lưu ngày bận, vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card section-pad stack-md">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Ngày bận tuần sau</div>
          <h2 style={{ margin: "8px 0 0" }}>Đăng ký ngày bận</h2>
        </div>

        <span className={`badge ${windowOpen ? "badge-success" : "badge-muted"}`}>
          {windowOpen ? "Đang mở đăng ký" : "Đã khóa đăng ký"}
        </span>
      </div>

      <div className="info-list compact-info-list">
        <div className="info-row">
          <span>Cặp hiện tại</span>
          <strong>{pairName || "Chưa có cặp"}</strong>
        </div>
        <div className="info-row">
          <span>Số ngày được chọn</span>
          <strong>{selectedDates.length}/2</strong>
        </div>
        <div className="info-row">
          <span>Nguyên tắc</span>
          <strong>Tối đa 2 ngày bận mỗi cặp</strong>
        </div>
      </div>

      {!pairId ? (
        <div className="empty-state">Bạn chưa được gán vào cặp nên chưa thể đăng ký ngày bận.</div>
      ) : (
        <div className="date-choice-grid">
          {weekDates.map((item) => {
            const checked = selectedDates.includes(item.value);

            return (
              <button
                key={item.value}
                type="button"
                className={`date-choice ${checked ? "is-selected" : ""}`}
                onClick={() => toggleDate(item.value)}
                disabled={!windowOpen}
              >
                <span className="date-choice-weekday">{item.weekday}</span>
                <span className="date-choice-day">{item.day}</span>
                <span className="date-choice-label">{item.fullLabel}</span>
                <span className={`inline-badge ${checked ? "inline-badge-active" : ""}`}>
                  {checked ? "Đã chọn" : "Chọn ngày"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="note-box">
        Nếu không đăng ký ngày nào, hệ thống sẽ hiểu là cặp của bạn có thể phục vụ toàn bộ tuần sau.
      </div>

      {status.message ? (
        <div className={status.type === "error" ? "form-error" : "form-success"}>{status.message}</div>
      ) : null}

      <div className="button-row">
        <button
          className="button-primary"
          type="button"
          onClick={handleSave}
          disabled={loading || !pairId || !windowOpen}
        >
          {loading ? "Đang lưu..." : "Lưu ngày bận"}
        </button>
      </div>
    </section>
  );
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
