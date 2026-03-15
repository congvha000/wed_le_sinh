"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BusyRegistrationPanelProps = {
  pairId: string | null;
  pairName: string | null;
  partnerName: string | null;
  nextWeekStart: string;
  windowOpen: boolean;
  selectedDate: string | null;
  partnerDate: string | null;
  legacyBusyDates: string[];
};

type StatusState = {
  type: "" | "error" | "success";
  message: string;
};

export default function BusyRegistrationPanel({
  pairId,
  pairName,
  partnerName,
  nextWeekStart,
  windowOpen,
  selectedDate,
  partnerDate,
  legacyBusyDates,
}: BusyRegistrationPanelProps) {
  const router = useRouter();
  const [selectedBusyDate, setSelectedBusyDate] = useState<string>(selectedDate ? toInputDate(new Date(selectedDate)) : "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const partnerBusyDate = partnerDate ? toInputDate(new Date(partnerDate)) : "";
  const legacyBusyDateSet = useMemo(
    () => new Set(legacyBusyDates.map((date) => toInputDate(new Date(date)))),
    [legacyBusyDates],
  );

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
    setSelectedBusyDate((prev) => (prev === value ? "" : value));
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

    if (selectedBusyDate && partnerBusyDate && selectedBusyDate === partnerBusyDate) {
      setStatus({
        type: "error",
        message: "Người cùng cặp đã chọn ngày này rồi. Mỗi người cần chọn 1 ngày khác nhau.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/user/busy-days/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, weekStart: nextWeekStart, date: selectedBusyDate || null }),
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

  const pairBusyCount = Number(Boolean(selectedBusyDate)) + Number(Boolean(partnerBusyDate));

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
          <span>Ngày của bạn</span>
          <strong>{selectedBusyDate ? formatInputDate(selectedBusyDate) : "Chưa chọn"}</strong>
        </div>
        <div className="info-row">
          <span>Người cùng cặp</span>
          <strong>{partnerName || "Chưa có"}</strong>
        </div>
        <div className="info-row">
          <span>Ngày người cùng cặp chọn</span>
          <strong>{partnerBusyDate ? formatInputDate(partnerBusyDate) : "Chưa chọn"}</strong>
        </div>
        <div className="info-row">
          <span>Tổng ngày bận của cặp</span>
          <strong>{pairBusyCount}/2</strong>
        </div>
      </div>

      {!pairId ? (
        <div className="empty-state">Bạn chưa được gán vào cặp nên chưa thể đăng ký ngày bận.</div>
      ) : (
        <div className="date-choice-grid">
          {weekDates.map((item) => {
            const checked = selectedBusyDate === item.value;
            const partnerChecked = partnerBusyDate === item.value;
            const isLegacyMarked = legacyBusyDateSet.has(item.value);

            return (
              <button
                key={item.value}
                type="button"
                className={`date-choice ${checked ? "is-selected" : ""}`}
                onClick={() => toggleDate(item.value)}
                disabled={!windowOpen || (partnerChecked && !checked)}
              >
                <span className="date-choice-weekday">{item.weekday}</span>
                <span className="date-choice-day">{item.day}</span>
                <span className="date-choice-label">{item.fullLabel}</span>
                <span className={`inline-badge ${checked ? "inline-badge-active" : ""}`}>
                  {checked ? "Ngày của bạn" : partnerChecked ? "Người cùng cặp đã chọn" : "Chọn ngày"}
                </span>
                {!checked && !partnerChecked && isLegacyMarked ? (
                  <span className="list-meta">Có dữ liệu cũ của cặp</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="note-box">
        Mỗi người trong cặp được chọn tối đa 1 ngày bận.
        <br />Hai người chọn 2 ngày khác nhau thì cặp sẽ có đủ 2 ngày bận trong tuần.
        <br />Mỗi ngày chỉ tối đa 3 cặp được giữ chỗ, ai lưu trước sẽ được trước.
      </div>

      {legacyBusyDates.length > 0 ? (
        <div className="form-error">
          Cặp của bạn đang còn dữ liệu ngày bận kiểu cũ từ phiên bản trước. Khi bạn bấm lưu, dữ liệu cũ của cặp trong tuần này sẽ được xóa để chuyển sang cách đăng ký mới.
        </div>
      ) : null}

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

function formatInputDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}
