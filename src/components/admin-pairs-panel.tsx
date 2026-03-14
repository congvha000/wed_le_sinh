"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SimpleUser = {
  id: string;
  email: string;
  name: string | null;
};

type PairItem = {
  id: string;
  name: string;
  level: string;
  active: boolean;
  totalPoints: number;
  members: {
    id: string;
    name: string | null;
    email: string;
    isLeader: boolean;
  }[];
};

type Props = {
  pairs: PairItem[];
  unpairedUsers: SimpleUser[];
};

function getPairLevelLabel(level: string) {
  return level.replace("LEVEL_", "LV");
}

export default function AdminPairsPanel({ pairs, unpairedUsers }: Props) {
  const router = useRouter();
  const [pairName, setPairName] = useState("");
  const [pairLevel, setPairLevel] = useState("LEVEL_1");
  const [pairId, setPairId] = useState("");
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });

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

  async function handleCreatePair() {
    try {
      if (!pairName.trim()) {
        throw new Error("Nhập tên cặp.");
      }

      setLoading("create-pair");
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/pairs/create", {
        name: pairName.trim(),
        level: pairLevel,
      });
      toast.success("Đã tạo cặp mới.");
      setPairName("");
      setPairLevel("LEVEL_1");
      setMessage({ type: "success", text: "Đã tạo cặp mới." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể tạo cặp.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleAssignMembers() {
    try {
      if (!pairId || !userA || !userB || userA === userB) {
        throw new Error("Chọn đủ 1 cặp và 2 thành viên khác nhau.");
      }

      setLoading("assign-members");
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/pairs/assign-members", {
        pairId,
        userIds: [userA, userB],
      });
      toast.success("Đã gán 2 thành viên vào cặp.");
      setUserA("");
      setUserB("");
      setMessage({ type: "success", text: "Đã gán 2 thành viên vào cặp." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể gán thành viên vào cặp.";
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
          <div className="section-kicker">Cặp lễ sinh</div>
          <h2 style={{ margin: "8px 0 0" }}>Tạo cặp và ghép thành viên</h2>
        </div>

        <input
          className="input"
          value={pairName}
          onChange={(event) => setPairName(event.target.value)}
          placeholder="Tên cặp, ví dụ: Cặp 1"
        />

        <select className="input" value={pairLevel} onChange={(event) => setPairLevel(event.target.value)}>
          <option value="LEVEL_1">LV1</option>
          <option value="LEVEL_2">LV2</option>
          <option value="LEVEL_3">LV3</option>
        </select>

        <button className="button-primary" type="button" onClick={handleCreatePair} disabled={loading === "create-pair"}>
          {loading === "create-pair" ? "Đang tạo..." : "Tạo cặp"}
        </button>

        <div className="line-separator" />

        <div>
          <div className="section-kicker">Gán thành viên</div>
          <h3 style={{ margin: "8px 0 12px" }}>Ghép 2 thành viên vào cặp</h3>
        </div>

        <select className="input" value={pairId} onChange={(event) => setPairId(event.target.value)}>
          <option value="">Chọn cặp</option>
          {pairs.map((pair) => (
            <option key={pair.id} value={pair.id}>
              {pair.name} - {getPairLevelLabel(pair.level)}
            </option>
          ))}
        </select>

        <select className="input" value={userA} onChange={(event) => setUserA(event.target.value)}>
          <option value="">Chọn thành viên 1</option>
          {unpairedUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {(user.name || user.email) + " - " + user.email}
            </option>
          ))}
        </select>

        <select className="input" value={userB} onChange={(event) => setUserB(event.target.value)}>
          <option value="">Chọn thành viên 2</option>
          {unpairedUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {(user.name || user.email) + " - " + user.email}
            </option>
          ))}
        </select>

        <button
          className="button-primary"
          type="button"
          onClick={handleAssignMembers}
          disabled={loading === "assign-members"}
        >
          {loading === "assign-members" ? "Đang gán..." : "Gán vào cặp"}
        </button>

        {message.text ? (
          <div className={message.type === "error" ? "form-error" : "form-success"}>{message.text}</div>
        ) : null}
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Danh sách cặp</div>
          <h2 style={{ margin: "8px 0 0" }}>Các cặp hiện có</h2>
        </div>

        {pairs.length === 0 ? (
          <div className="empty-state">Chưa có cặp nào được tạo.</div>
        ) : (
          <div className="stack-sm">
            {pairs.map((pair) => (
              <div key={pair.id} className="list-card" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="list-title">
                    {pair.name} - {getPairLevelLabel(pair.level)}
                  </div>
                  <div className="list-subtitle">
                    Điểm: {pair.totalPoints} · {pair.active ? "Đang hoạt động" : "Đã khóa"}
                  </div>
                  <div className="list-meta">
                    {pair.members.length === 0
                      ? "Chưa có thành viên"
                      : pair.members
                          .map((member) => `${member.name || member.email}${member.isLeader ? " (Trưởng)" : ""}`)
                          .join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
