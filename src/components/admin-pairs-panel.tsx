"use client";

import { useMemo, useState } from "react";
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
  const [editingPairId, setEditingPairId] = useState("");
  const [editPairName, setEditPairName] = useState("");
  const [editPairLevel, setEditPairLevel] = useState("LEVEL_1");
  const [pointDelta, setPointDelta] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });

  const pairsWithoutMembers = useMemo(() => pairs.filter((pair) => pair.members.length === 0), [pairs]);

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
      setPairId("");
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

  async function handleUnassignMembers(targetPairId: string) {
    try {
      setLoading(`unassign-${targetPairId}`);
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/pairs/unassign-members", {
        pairId: targetPairId,
      });
      toast.success("Đã tách cặp. Bạn có thể gán lại thành viên khác.");
      setMessage({ type: "success", text: "Đã tách cặp. Bạn có thể gán lại thành viên khác." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể tách cặp.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  function beginEditPair(pair: PairItem) {
    setEditingPairId(pair.id);
    setEditPairName(pair.name);
    setEditPairLevel(pair.level);
    setPointDelta("");
    setPointReason("");
    setMessage({ type: "", text: "" });
  }

  function cancelEditPair() {
    setEditingPairId("");
    setEditPairName("");
    setEditPairLevel("LEVEL_1");
    setPointDelta("");
    setPointReason("");
  }

  async function handleUpdatePair() {
    try {
      if (!editingPairId) {
        throw new Error("Chưa chọn cặp cần chỉnh sửa.");
      }

      const payload: Record<string, unknown> = {
        pairId: editingPairId,
        name: editPairName.trim(),
        level: editPairLevel,
      };

      if (pointDelta.trim()) {
        const parsedDelta = Number(pointDelta);
        if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
          throw new Error("Điểm điều chỉnh phải là số khác 0.");
        }
        payload.pointDelta = parsedDelta;
        if (pointReason.trim()) {
          payload.reason = pointReason.trim();
        }
      }

      setLoading(`update-${editingPairId}`);
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/pairs/update", payload);
      toast.success("Đã cập nhật cặp.");
      setMessage({ type: "success", text: "Đã cập nhật tên cặp / cấp cặp / điểm thủ công." });
      cancelEditPair();
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể cập nhật cặp.";
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

        <div className="note-box">
          Admin có thể đổi tên cặp, đổi cấp cặp và cộng/trừ điểm thủ công cho từng cặp ngay ở danh sách bên phải.
          <br />Điểm lịch phục vụ chỉ tự cộng sau khi ngày/buổi đó đã trôi qua.
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
          <option value="">Chọn cặp đang trống</option>
          {pairsWithoutMembers.map((pair) => (
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
            {pairs.map((pair) => {
              const loadingKey = `unassign-${pair.id}`;
              const updateLoadingKey = `update-${pair.id}`;
              const isEditing = editingPairId === pair.id;

              return (
                <div key={pair.id} className="list-card list-card-column-mobile" style={{ alignItems: "stretch" }}>
                  <div style={{ flex: 1 }}>
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

                    {isEditing ? (
                      <div className="stack-sm" style={{ marginTop: 12 }}>
                        <div className="dashboard-grid form-two-col">
                          <div>
                            <label className="field-label">Đổi tên cặp</label>
                            <input
                              className="input"
                              value={editPairName}
                              onChange={(event) => setEditPairName(event.target.value)}
                              placeholder="Tên cặp mới"
                            />
                          </div>
                          <div>
                            <label className="field-label">Cấp cặp</label>
                            <select className="input" value={editPairLevel} onChange={(event) => setEditPairLevel(event.target.value)}>
                              <option value="LEVEL_1">LV1</option>
                              <option value="LEVEL_2">LV2</option>
                              <option value="LEVEL_3">LV3</option>
                            </select>
                          </div>
                        </div>

                        <div className="dashboard-grid form-two-col">
                          <div>
                            <label className="field-label">Cộng / trừ điểm</label>
                            <input
                              className="input"
                              type="number"
                              step="0.1"
                              value={pointDelta}
                              onChange={(event) => setPointDelta(event.target.value)}
                              placeholder="Ví dụ: -1 hoặc 0.5"
                            />
                          </div>
                          <div>
                            <label className="field-label">Lý do điều chỉnh</label>
                            <input
                              className="input"
                              value={pointReason}
                              onChange={(event) => setPointReason(event.target.value)}
                              placeholder="Ví dụ: Bỏ giúp lễ, hỗ trợ thêm..."
                            />
                          </div>
                        </div>

                        <div className="button-row">
                          <button
                            className="button-primary"
                            type="button"
                            onClick={handleUpdatePair}
                            disabled={loading === updateLoadingKey}
                          >
                            {loading === updateLoadingKey ? "Đang lưu..." : "Lưu chỉnh sửa"}
                          </button>
                          <button className="button-secondary" type="button" onClick={cancelEditPair} disabled={loading === updateLoadingKey}>
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="button-row" style={{ justifyContent: "flex-end" }}>
                    {!isEditing ? (
                      <button className="button-secondary" type="button" onClick={() => beginEditPair(pair)} disabled={Boolean(loading)}>
                        Chỉnh sửa
                      </button>
                    ) : null}

                    {pair.members.length > 0 ? (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => handleUnassignMembers(pair.id)}
                        disabled={loading === loadingKey || Boolean(isEditing)}
                      >
                        {loading === loadingKey ? "Đang tách..." : "Tách cặp"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
