"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  weekStart: string;
  acknowledgedAt: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function ScheduleAckButton({ weekStart, acknowledgedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAck() {
    try {
      setLoading(true);
      const res = await fetch("/api/user/schedule/ack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weekStart }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Không thể xác nhận đã xem lịch");
      }

      toast.success("Đã xác nhận đã xem lịch tuần này.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận đã xem lịch");
    } finally {
      setLoading(false);
    }
  }

  if (acknowledgedAt) {
    return (
      <div style={{ textAlign: "right" }}>
        <span className="badge badge-success">Đã xác nhận</span>
        <div className="list-meta" style={{ marginTop: 6 }}>
          Lúc {formatDateTime(acknowledgedAt)}
        </div>
      </div>
    );
  }

  return (
    <button className="button-primary" type="button" onClick={handleAck} disabled={loading}>
      {loading ? "Đang xác nhận..." : "Tôi đã xem lịch tuần này"}
    </button>
  );
}
