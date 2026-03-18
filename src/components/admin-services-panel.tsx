"use client";

import Link from "next/link";
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
import { formatDateLabel, formatWeekdayDateLabel } from "@/lib/date-utils";

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
  selectedWeek: "current" | "next";
  targetWeekStart: string;
  services: ServiceItem[];
  pairs: PairItem[];
};

type ServiceDisplay = {
  dateKey: string;
  dateLabel: string;
  title: string;
  period: ServicePeriod;
  periodLabel: string;
  hasCustomTime: boolean;
  timeLabel: string;
  statusLabel: string;
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

function getServiceStatusLabel(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Đang hiển thị";
    case "LOCKED":
      return "Đã khóa";
    case "COMPLETED":
      return "Hoàn tất";
    case "DRAFT":
      return "Nháp";
    default:
      return status;
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

function calculateAutoPoint(serviceDate: string, servicePeriod: ServicePeriod, customTime: string) {
  if (!serviceDate) return "1";
  const fallbackTime = SERVICE_TIME_SLOTS[servicePeriod].defaultTime;
  const start = combineDateAndTime(serviceDate, customTime.trim() || fallbackTime);
  const day = start.getUTCDay();
  const hour = start.getUTCHours();

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

function isPairEligibleForService(service: ServiceItem | null, pair: PairItem) {
  if (!pair.active || pair.members.length < 2) {
    return false;
  }

  if (!service) {
    return true;
  }

  if (service.type === "ADORATION") {
    return pair.level === "LEVEL_3";
  }

  if (service.type === "FOUR_PEOPLE") {
    return pair.level === "LEVEL_2" || pair.level === "LEVEL_3";
  }

  return true;
}

function getServiceAssignmentRule(service: ServiceItem | null) {
  if (!service) {
    return "Chọn buổi lễ để hệ thống lọc đúng các cặp đủ điều kiện.";
  }

  if (service.type === "ADORATION") {
    return "Chầu Thánh Thể chỉ nhận cặp LV3.";
  }

  if (service.type === "FOUR_PEOPLE") {
    return "Lễ 4 người nhận 2 cặp và chỉ cho phép tổ hợp LV2 + LV3 hoặc LV3 + LV3.";
  }

  return "Buổi lễ này nhận 1 cặp đủ 2 thành viên.";
}

function buildServiceDisplay(service: ServiceItem): ServiceDisplay {
  const start = new Date(service.startsAt);
  const period = getServicePeriodFromDate(start, service.type);
  const timeLabel = formatTime(start);
  const hasCustomTime = timeLabel !== SERVICE_TIME_SLOTS[period].defaultTime;
  const dateKey = formatDateInputValue(start);
  const dateLabel = formatDateLabel(start);

  const rawTitle = service.title?.trim();
  const defaultSlotTitle = `${getServicePeriodLabel(period)} - ${SERVICE_TIME_SLOTS[period].defaultTime}`;
  const normalizedTitle = !rawTitle
    ? buildServiceTitle(dateKey, period, hasCustomTime ? timeLabel : null)
    : rawTitle === defaultSlotTitle
      ? getServicePeriodLabel(period)
      : rawTitle;

  return {
    dateKey,
    dateLabel,
    title: normalizedTitle,
    period,
    periodLabel: getServicePeriodLabel(period),
    hasCustomTime,
    timeLabel,
    statusLabel: getServiceStatusLabel(service.status),
  };
}

function getFormStateFromService(service: ServiceItem) {
  const start = new Date(service.startsAt);
  const servicePeriod = getServicePeriodFromDate(start, service.type);
  const resolvedTime = formatTime(start);
  const customTime = resolvedTime === SERVICE_TIME_SLOTS[servicePeriod].defaultTime ? "" : resolvedTime;

  return {
    serviceDate: formatDateInputValue(start),
    servicePeriod,
    customTime,
    serviceType: service.type === "ADORATION" ? "REGULAR" : service.type,
    servicePoints: String(service.points),
  };
}

export default function AdminServicesPanel({ selectedWeek, targetWeekStart, services, pairs }: Props) {
  const router = useRouter();
  const weekLabel = selectedWeek === "current" ? "tuần này" : "tuần sau";
  const defaultDate = targetWeekStart;
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

  const serviceDisplayMap = useMemo(
    () => new Map(services.map((service) => [service.id, buildServiceDisplay(service)])),
    [services],
  );

  const groupedServices = useMemo(() => {
    const map = new Map<string, { label: string; items: ServiceItem[] }>();

    for (const service of services) {
      const display = serviceDisplayMap.get(service.id) ?? buildServiceDisplay(service);
      if (!map.has(display.dateKey)) {
        map.set(display.dateKey, { label: display.dateLabel, items: [] });
      }
      map.get(display.dateKey)!.items.push(service);
    }

    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [serviceDisplayMap, services]);

  const assignableServices = useMemo(
    () => services.filter((service) => !isServiceFullyAssigned(service)),
    [services],
  );

  const editingService = useMemo(
    () => services.find((service) => service.id === editingServiceId) ?? null,
    [editingServiceId, services],
  );

  const selectedAssignableService = useMemo(
    () => assignableServices.find((service) => service.id === assignServiceId) ?? null,
    [assignServiceId, assignableServices],
  );

  const eligiblePairsForSelectedService = useMemo(
    () => pairs.filter((pair) => isPairEligibleForService(selectedAssignableService, pair)),
    [pairs, selectedAssignableService],
  );

  const resolvedPreviewTime = customTime.trim() || SERVICE_TIME_SLOTS[servicePeriod].defaultTime;
  const autoTitle = buildServiceTitle(serviceDate, servicePeriod, customTime);
  const isEditing = Boolean(editingServiceId);
  const isAdorationPeriod = servicePeriod === "ADORATION";

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
      toast.success(`Đã tạo buổi lễ ${weekLabel}.`);
      setMessage({ type: "success", text: `Đã tạo buổi lễ ${weekLabel}. Danh sách bên phải sẽ cập nhật ngay.` });
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
    const display = serviceDisplayMap.get(service.id) ?? buildServiceDisplay(service);
    const hasAssignments = service.assignments.length > 0;
    const serviceLabel = display.title || service.title;
    const confirmMessage = hasAssignments
      ? `Buổi lễ "${serviceLabel}" đang có ${service.assignments.length} lượt gán. Xóa buổi này sẽ gỡ luôn các cặp đã gán và cập nhật lại điểm. Bạn vẫn muốn xóa?`
      : `Bạn có chắc muốn xóa buổi lễ "${serviceLabel}" không?`;

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
        setAssignPairId("");
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
        weekStart: targetWeekStart,
      });
      const text = data?.summary?.message ?? `Đã tự xếp lịch ${weekLabel}.`;
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
            <div className="section-kicker">Buổi lễ linh hoạt theo tuần</div>
            <h2 style={{ margin: "8px 0 0" }}>{isEditing ? "Chỉnh sửa buổi lễ" : "Tạo lịch theo ngày và khung lễ"}</h2>
          </div>
          {isEditing ? <span className="badge badge-warning">Đang chỉnh sửa</span> : null}
        </div>

        <div className="button-row">
          <Link
            href="/admin/services?week=current"
            className={selectedWeek === "current" ? "button-primary" : "button-secondary"}
          >
            Tuần này
          </Link>
          <Link
            href="/admin/services?week=next"
            className={selectedWeek === "next" ? "button-primary" : "button-secondary"}
          >
            Tuần sau
          </Link>
        </div>

        <div className="note-box">
          Bạn đang thao tác cho <strong>{weekLabel}</strong>.
          <br />Ngày mặc định sẽ bắt đầu từ <strong>{formatWeekdayDateLabel(defaultDate)}</strong>.
        </div>

        <div className="note-box">
          Khung lễ hiện có: <strong>Lễ sáng</strong>, <strong>Lễ chiều</strong>, <strong>Lễ ngoài giờ</strong> và <strong>Chầu Thánh Thể</strong>.
          <br />Điểm chỉ được cộng vào tổng của cặp sau khi buổi được xếp lịch đã trôi qua, không cộng ngay khi vừa phân công.
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
            <select
              className="input"
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
              disabled={isAdorationPeriod}
            >
              <option value="REGULAR">Lễ thường</option>
              <option value="SOLEMN">Lễ trọng</option>
              <option value="FOUR_PEOPLE">Lễ 4 người</option>
            </select>
            {isAdorationPeriod ? (
              <div className="list-meta" style={{ marginTop: 6 }}>
                Khi chọn khung <strong>Chầu Thánh Thể</strong>, hệ thống tự hiểu đây là buổi chầu và chỉ cho phép cặp <strong>LV3</strong> phục vụ.
              </div>
            ) : null}
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
          Tên hiển thị ngoài lịch: <strong>{autoTitle}</strong>
          <br />Giờ nội bộ để xếp lịch: <strong>{resolvedPreviewTime}</strong>
          <br />Nếu để trống giờ, danh sách chỉ hiện tên buổi lễ đã chọn, không lặp thêm thời gian.
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

        <select
          className="input"
          value={assignServiceId}
          onChange={(event) => {
            setAssignServiceId(event.target.value);
            setAssignPairId("");
          }}
        >
          <option value="">Chọn buổi lễ còn thiếu cặp</option>
          {assignableServices.map((service) => {
            const display = serviceDisplayMap.get(service.id) ?? buildServiceDisplay(service);
            return (
              <option key={service.id} value={service.id}>
                {display.dateLabel} · {display.title}
              </option>
            );
          })}
        </select>

        <div className="note-box">
          {getServiceAssignmentRule(selectedAssignableService)}
          {selectedAssignableService ? (
            <>
              <br />Hiện có <strong>{eligiblePairsForSelectedService.length}</strong> cặp hợp lệ cho buổi đã chọn.
            </>
          ) : null}
        </div>

        <select className="input" value={assignPairId} onChange={(event) => setAssignPairId(event.target.value)}>
          <option value="">Chọn cặp</option>
          {eligiblePairsForSelectedService.map((pair) => (
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
          <h2 style={{ margin: "8px 0 0" }}>Buổi lễ đã tạo {weekLabel}</h2>
        </div>

        {services.length === 0 ? (
          <div className="empty-state">{selectedWeek === "current" ? "Tuần này" : "Tuần sau"} hiện chưa có buổi lễ nào.</div>
        ) : (
          <div className="stack-sm">
            {groupedServices.map((group) => (
              <div key={group.key} className="card card-soft section-pad stack-sm">
                <div>
                  <div className="list-title">{group.label}</div>
                  <div className="list-meta">{group.items.length} buổi lễ</div>
                </div>

                {group.items.map((service) => {
                  const display = serviceDisplayMap.get(service.id) ?? buildServiceDisplay(service);
                  const requiredPairs = getServiceRequiredPairCount(service);
                  const missingPairs = Math.max(0, requiredPairs - service.assignments.length);

                  return (
                    <div key={service.id} className="list-card" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="list-title">{display.title}</div>
                        <div className="list-subtitle">Ngày {display.dateLabel}</div>
                        <div className="list-meta">
                          {getServiceTypeLabel(service.type)} · {service.points} điểm · {display.statusLabel}
                          {missingPairs === 0 ? " · Đã đủ cặp" : ` · Còn thiếu ${missingPairs} cặp`}
                        </div>
                        <div className="list-meta" style={{ marginTop: 6 }}>
                          {service.assignments.length === 0
                            ? "Chưa có cặp nào được gán"
                            : `Đã gán: ${service.assignments
                                .map((assignment) => `${assignment.pairName} (${getRoleLabel(assignment.role)})`)
                                .join(" · ")}`}
                        </div>
                        {service.type === "ADORATION" ? (
                          <div className="list-meta" style={{ marginTop: 6 }}>
                            Quy định: chỉ cặp <strong>LV3</strong> mới được phục vụ buổi chầu Thánh Thể.
                          </div>
                        ) : null}
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
