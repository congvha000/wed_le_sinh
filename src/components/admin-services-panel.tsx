"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  SERVICE_PERIOD_OPTIONS,
  SERVICE_TIME_SLOTS,
  buildServiceTitle,
  combineDateAndTime,
  formatDateInputValue,
  formatTime,
  getServicePeriodFromDate,
  getServicePeriodLabel,
  type ServicePeriod,
} from "@/config/service-time-slots";

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

type ServiceItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  points: number;
  startsAt: string;
  endsAt: string;
  assignments: {
    id: string;
    pairId: string;
    pairName: string;
    role: string;
  }[];
};

type Props = {
  nextWeekStart: string;
  services: ServiceItem[];
  pairs: PairItem[];
};

function getPairLevelLabel(level: string) {
  return level.replace("LEVEL_", "LV");
}

function getServiceTypeLabel(type: string) {
  switch (type) {
    case "FOUR_PEOPLE":
      return "Lễ 4 người";
    case "SOLEMN":
      return "Lễ trọng";
    case "ADORATION":
      return "Chầu Thánh Thể";
    default:
      return "Lễ thường";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "CANDLE":
      return "Nến";
    case "INCENSE":
      return "Hương";
    default:
      return "Chung";
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function calculateAutoPoint(serviceDate: string, servicePeriod: ServicePeriod, customTime: string) {
  if (!serviceDate) return "1";
  const fallbackTime = SERVICE_TIME_SLOTS[servicePeriod].defaultTime;
  const start = combineDateAndTime(serviceDate, customTime.trim() || fallbackTime);
  const day = start.getDay();
  const hour = start.getHours();

  if ((day === 6 && hour >= 12) || (day === 0 && hour < 12)) {
    return "1.2";
  }

  return "1";
}

function getServiceRequiredPairCount(service: ServiceItem) {
  return service.type === "FOUR_PEOPLE" ? 2 : 1;
}

function isServiceFullyAssigned(service: ServiceItem) {
  return service.assignments.length >= getServiceRequiredPairCount(service);
}

function getFormStateFromService(service: ServiceItem) {
  const start = new Date(service.startsAt);
  const servicePeriod = getServicePeriodFromDate(start);
  const resolvedTime = formatTime(start);
  const customTime = resolvedTime === SERVICE_TIME_SLOTS[servicePeriod].defaultTime ? "" : resolvedTime;

  return {
    serviceDate: formatDateInputValue(start),
    servicePeriod,
    customTime,
    serviceType: service.type,
    servicePoints: String(service.points),
  };
}

export default function AdminServicesPanel({ nextWeekStart, services, pairs }: Props) {
  const router = useRouter();
  const defaultDate = formatDateInputValue(new Date(nextWeekStart));
  const [serviceDate, setServiceDate] = useState(defaultDate);
  const [servicePeriod, setServicePeriod] = useState<ServicePeriod>("MORNING");
  const [customTime, setCustomTime] = useState("");
  const [serviceType, setServiceType] = useState("REGULAR");
  const [servicePoints, setServicePoints] = useState(calculateAutoPoint(defaultDate, "MORNING", ""));
  const [editingServiceId, setEditingServiceId] = useState("");
  const [assignServiceId, setAssignServiceId] = useState("");
  const [assignPairId, setAssignPairId] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });

  const groupedServices = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    for (const service of services) {
      const dayKey = new Date(service.startsAt).toLocaleDateString("vi-VN");
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(service);
    }
    return Array.from(map.entries());
  }, [services]);

  const assignableServices = useMemo(
    () => services.filter((service) => !isServiceFullyAssigned(service)),
    [services],
  );

  const editingService = useMemo(
    () => services.find((service) => service.id === editingServiceId) ?? null,
    [editingServiceId, services],
  );

  const resolvedPreviewTime = customTime.trim() || SERVICE_TIME_SLOTS[servicePeriod].defaultTime;
  const autoTitle = buildServiceTitle(serviceDate, servicePeriod, customTime);
  const isEditing = Boolean(editingServiceId);

  function resetServiceForm() {
    setEditingServiceId("");
    setServiceDate(defaultDate);
    setServicePeriod("MORNING");
    setCustomTime("");
    setServiceType("REGULAR");
    setServicePoints(calculateAutoPoint(defaultDate, "MORNING", ""));
  }

  function startEditing(service: ServiceItem) {
    const formState = getFormStateFromService(service);
    setEditingServiceId(service.id);
    setServiceDate(formState.serviceDate);
    setServicePeriod(formState.servicePeriod);
    setCustomTime(formState.customTime);
    setServiceType(formState.serviceType);
    setServicePoints(formState.servicePoints);
    setMessage({ type: "", text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  async function handleSubmitService() {
    try {
      if (!serviceDate) {
        throw new Error("Bạn cần chọn ngày lễ.");
      }

      setMessage({ type: "", text: "" });

      const payload = {
        serviceDate,
        servicePeriod,
        customTime: customTime.trim() || null,
        type: serviceType,
        points: Number(servicePoints),
      };

      if (isEditing && editingServiceId) {
        setLoading("update-service");
        const data = await postJson("/api/admin/services/update", {
          serviceId: editingServiceId,
          ...payload,
        });
        const text = data?.resetAssignments
          ? `Đã cập nhật buổi lễ. Hệ thống đã gỡ ${data.removedAssignments} lượt gán cũ để tránh trùng lịch sai.`
          : "Đã cập nhật buổi lễ.";
        toast.success(text);
        setMessage({ type: "success", text });
        resetServiceForm();
        router.refresh();
        return;
      }

      setLoading("create-service");
      await postJson("/api/admin/services/create", payload);
      toast.success("Đã tạo buổi lễ.");
      setMessage({ type: "success", text: "Đã tạo buổi lễ. Danh sách bên phải sẽ cập nhật ngay." });
      setCustomTime("");
      setServicePoints(calculateAutoPoint(serviceDate, servicePeriod, ""));
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : isEditing ? "Không thể cập nhật buổi lễ." : "Không thể tạo buổi lễ.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleDeleteService(service: ServiceItem) {
    const hasAssignments = service.assignments.length > 0;
    const confirmMessage = hasAssignments
      ? `Buổi lễ "${service.title}" đang có ${service.assignments.length} lượt gán. Xóa buổi này sẽ gỡ luôn các cặp đã gán và cập nhật lại điểm. Bạn vẫn muốn xóa?`
      : `Bạn có chắc muốn xóa buổi lễ "${service.title}" không?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(`delete-service-${service.id}`);
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/services/delete", { serviceId: service.id });
      if (editingServiceId === service.id) {
        resetServiceForm();
      }
      if (assignServiceId === service.id) {
        setAssignServiceId("");
      }
      toast.success("Đã xóa buổi lễ.");
      setMessage({ type: "success", text: "Đã xóa buổi lễ và đồng bộ lại điểm liên quan." });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể xóa buổi lễ.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleAssignService() {
    try {
      if (!assignServiceId || !assignPairId) {
        throw new Error("Chọn buổi lễ và cặp cần gán.");
      }

      setLoading("assign-service");
      setMessage({ type: "", text: "" });
      await postJson("/api/admin/services/assign", {
        serviceId: assignServiceId,
        pairId: assignPairId,
      });
      toast.success("Đã gán cặp vào buổi lễ.");
      setMessage({ type: "success", text: "Đã gán cặp vào buổi lễ." });
      setAssignServiceId("");
      setAssignPairId("");
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể gán cặp vào buổi lễ.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  async function handleAutoAssign() {
    try {
      setLoading("auto-assign");
      setMessage({ type: "", text: "" });
      const data = await postJson("/api/admin/services/auto-assign", {
        weekStart: nextWeekStart,
      });
      const text = data?.summary?.message ?? "Đã tự xếp lịch.";
      toast.success(text);
      setMessage({ type: "success", text });
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không thể tự xếp lịch.";
      toast.error(text);
      setMessage({ type: "error", text });
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="dashboard-grid two-col-layout">
      <section className="card section-pad stack-md">
        <div className="section-heading">
          <div>
            <div className="section-kicker">Buổi lễ tuần sau</div>
            <h2 style={{ margin: "8px 0 0" }}>{isEditing ? "Chỉnh sửa buổi lễ" : "Tạo lịch theo ngày và khung lễ"}</h2>
          </div>
          {isEditing ? <span className="badge badge-warning">Đang chỉnh sửa</span> : null}
        </div>

        {editingService?.assignments.length ? (
          <div className="note-box">
            Buổi lễ này đang có <strong>{editingService.assignments.length}</strong> lượt gán.
            <br />Nếu bạn đổi ngày, giờ hoặc loại lễ, hệ thống sẽ tự gỡ các lượt gán cũ để tránh trùng lịch sai. Nếu bạn chỉ sửa điểm thì các cặp đã gán vẫn được giữ nguyên.
          </div>
        ) : null}

        <div className="dashboard-grid form-two-col">
          <div>
            <label className="field-label">Ngày lễ</label>
            <input
              className="input"
              type="date"
              value={serviceDate}
              onChange={(event) => {
                const value = event.target.value;
                setServiceDate(value);
                setServicePoints(calculateAutoPoint(value, servicePeriod, customTime));
              }}
            />
          </div>

          <div>
            <label className="field-label">Khung lễ</label>
            <select
              className="input"
              value={servicePeriod}
              onChange={(event) => {
                const nextPeriod = event.target.value as ServicePeriod;
                setServicePeriod(nextPeriod);
                setServicePoints(calculateAutoPoint(serviceDate, nextPeriod, customTime));
              }}
            >
              {SERVICE_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dashboard-grid form-two-col">
          <div>
            <label className="field-label">Giờ cụ thể (có thể bỏ trống)</label>
            <input
              className="input"
              type="time"
              value={customTime}
              onChange={(event) => {
                const value = event.target.value;
                setCustomTime(value);
                setServicePoints(calculateAutoPoint(serviceDate, servicePeriod, value));
              }}
            />
          </div>

          <div>
            <label className="field-label">Loại buổi lễ</label>
            <select className="input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
              <option value="REGULAR">Lễ thường</option>
              <option value="SOLEMN">Lễ trọng</option>
              <option value="ADORATION">Chầu Thánh Thể</option>
              <option value="FOUR_PEOPLE">Lễ 4 người</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Điểm buổi lễ</label>
          <input
            className="input"
            type="number"
            step="0.1"
            value={servicePoints}
            onChange={(event) => setServicePoints(event.target.value)}
          />
        </div>

        <div className="note-box">
          Tiêu đề tự tạo: <strong>{autoTitle}</strong>
          <br />Giờ sẽ lưu: <strong>{resolvedPreviewTime}</strong>
          <br />Giờ mặc định hiện tại của {getServicePeriodLabel(servicePeriod).toLowerCase()} là <strong>{SERVICE_TIME_SLOTS[servicePeriod].defaultTime}</strong>
        </div>

        <div className="button-row">
          <button
            className="button-primary"
            type="button"
            onClick={handleSubmitService}
            disabled={loading === "create-service" || loading === "update-service"}
          >
            {isEditing
              ? loading === "update-service"
                ? "Đang lưu..."
                : "Lưu chỉnh sửa"
              : loading === "create-service"
                ? "Đang tạo..."
                : "Tạo buổi lễ"}
          </button>

          <button className="button-secondary" type="button" onClick={handleAutoAssign} disabled={loading === "auto-assign"}>
            {loading === "auto-assign" ? "Đang xếp..." : "Tự xếp lịch"}
          </button>

          {isEditing ? (
            <button className="button-secondary" type="button" onClick={resetServiceForm} disabled={loading === "update-service"}>
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>

        <div className="line-separator" />

        <div>
          <div className="section-kicker">Phân công thủ công</div>
          <h3 style={{ margin: "8px 0 12px" }}>Gán cặp vào buổi lễ</h3>
        </div>

        <select className="input" value={assignServiceId} onChange={(event) => setAssignServiceId(event.target.value)}>
          <option value="">Chọn buổi lễ còn thiếu cặp</option>
          {assignableServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title} - {formatDateTime(service.startsAt)}
            </option>
          ))}
        </select>

        <select className="input" value={assignPairId} onChange={(event) => setAssignPairId(event.target.value)}>
          <option value="">Chọn cặp</option>
          {pairs
            .filter((pair) => pair.active && pair.members.length >= 2)
            .map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.name} - {getPairLevelLabel(pair.level)} - {pair.totalPoints} điểm
              </option>
            ))}
        </select>

        <button className="button-primary" type="button" onClick={handleAssignService} disabled={loading === "assign-service"}>
          {loading === "assign-service" ? "Đang gán..." : "Gán vào buổi lễ"}
        </button>

        {message.text ? (
          <div className={message.type === "error" ? "form-error" : "form-success"}>{message.text}</div>
        ) : null}
      </section>

      <section className="card section-pad stack-md">
        <div>
          <div className="section-kicker">Danh sách buổi lễ</div>
          <h2 style={{ margin: "8px 0 0" }}>Buổi lễ đã tạo</h2>
        </div>

        {services.length === 0 ? (
          <div className="empty-state">Tuần sau hiện chưa có buổi lễ nào.</div>
        ) : (
          <div className="stack-sm">
            {groupedServices.map(([day, items]) => (
              <div key={day} className="card card-soft section-pad stack-sm">
                <div>
                  <div className="list-title">{day}</div>
                  <div className="list-meta">{items.length} buổi lễ</div>
                </div>

                {items.map((service) => {
                  const serviceDate = new Date(service.startsAt);
                  const period = getServicePeriodFromDate(serviceDate);
                  const requiredPairs = getServiceRequiredPairCount(service);
                  const missingPairs = Math.max(0, requiredPairs - service.assignments.length);

                  return (
                    <div key={service.id} className="list-card" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="list-title">{service.title}</div>
                        <div className="list-subtitle">
                          {getServicePeriodLabel(period)} · {formatDateTime(service.startsAt)}
                        </div>
                        <div className="list-meta">
                          {getServiceTypeLabel(service.type)} · {service.points} điểm · {service.status}
                          {missingPairs === 0 ? " · Đã đủ cặp" : ` · Còn thiếu ${missingPairs} cặp`}
                        </div>
                        <div className="list-meta" style={{ marginTop: 6 }}>
                          {service.assignments.length === 0
                            ? "Chưa có cặp nào được gán"
                            : `Đã gán: ${service.assignments
                                .map((assignment) => `${assignment.pairName} (${getRoleLabel(assignment.role)})`)
                                .join(" · ")}`}
                        </div>
                      </div>

                      <div className="button-row" style={{ minWidth: 240, justifyContent: "flex-end" }}>
                        {editingServiceId === service.id ? <span className="badge badge-warning">Đang chỉnh sửa</span> : null}
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() => startEditing(service)}
                          disabled={Boolean(loading)}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="button-danger"
                          type="button"
                          onClick={() => handleDeleteService(service)}
                          disabled={loading === `delete-service-${service.id}`}
                        >
                          {loading === `delete-service-${service.id}` ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
