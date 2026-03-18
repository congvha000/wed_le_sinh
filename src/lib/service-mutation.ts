import type { ServiceType } from "@prisma/client";
import { buildServiceTitle, resolveServiceDateTime, type ServicePeriod } from "@/config/service-time-slots";

const allowedTypes = new Set<ServiceType>(["REGULAR", "SOLEMN", "FOUR_PEOPLE", "ADORATION"]);
const allowedPeriods = new Set<ServicePeriod>(["MORNING", "AFTERNOON", "EXTRA", "ADORATION"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export type ParsedServiceMutation = {
  title: string;
  type: ServiceType;
  startsAt: Date;
  endsAt: Date;
  points: number;
  status: "PUBLISHED";
  isSundayAM: boolean;
  isSaturdayPM: boolean;
  serviceDate: string;
  servicePeriod: ServicePeriod;
  customTime: string | null;
};

export function parseServiceMutationPayload(raw: unknown): { ok: true; data: ParsedServiceMutation } | { ok: false; error: string } {
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const serviceDate = String(payload.serviceDate ?? "").trim();
  const servicePeriod = String(payload.servicePeriod ?? "MORNING").trim() as ServicePeriod;
  const requestedType = String(payload.type ?? "REGULAR").trim() as ServiceType;
  const points = Number(payload.points ?? 1);
  const customTime = typeof payload.customTime === "string" ? payload.customTime.trim() : "";

  if (!serviceDate) {
    return { ok: false, error: "Ngày lễ không được để trống" };
  }

  if (!datePattern.test(serviceDate)) {
    return { ok: false, error: "Ngày lễ không hợp lệ" };
  }

  if (!allowedPeriods.has(servicePeriod)) {
    return { ok: false, error: "Khung lễ không hợp lệ" };
  }

  if (!allowedTypes.has(requestedType)) {
    return { ok: false, error: "Loại buổi lễ không hợp lệ" };
  }

  if (customTime && !timePattern.test(customTime)) {
    return { ok: false, error: "Giờ cụ thể không hợp lệ" };
  }

  if (!Number.isFinite(points) || points <= 0) {
    return { ok: false, error: "Điểm buổi lễ không hợp lệ" };
  }

  const type = servicePeriod === "ADORATION" ? "ADORATION" : requestedType;

  const { startsAt, endsAt } = resolveServiceDateTime({
    serviceDate,
    servicePeriod,
    customTime: customTime || null,
  });

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { ok: false, error: "Thời gian buổi lễ không hợp lệ" };
  }

  const day = startsAt.getDay();
  const hour = startsAt.getHours();

  return {
    ok: true,
    data: {
      title: buildServiceTitle(serviceDate, servicePeriod, customTime || null),
      type,
      startsAt,
      endsAt,
      points: Number(points.toFixed(2)),
      status: "PUBLISHED",
      isSundayAM: day === 0 && hour < 12,
      isSaturdayPM: day === 6 && hour >= 12,
      serviceDate,
      servicePeriod,
      customTime: customTime || null,
    },
  };
}
