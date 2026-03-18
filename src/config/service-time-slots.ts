import { combineUtcDateAndTime, formatDateInputValue, formatTimeValue } from "@/lib/date-utils";

export type ServicePeriod = "MORNING" | "AFTERNOON" | "EXTRA" | "ADORATION";

export const SERVICE_TIME_SLOTS: Record<
  ServicePeriod,
  {
    label: string;
    defaultTime: string;
    durationMinutes: number;
    description: string;
  }
> = {
  MORNING: {
    label: "Lễ sáng",
    defaultTime: "05:00",
    durationMinutes: 60,
    description: "Khung giờ mặc định cho lễ sáng.",
  },
  AFTERNOON: {
    label: "Lễ chiều",
    defaultTime: "17:30",
    durationMinutes: 60,
    description: "Khung giờ mặc định cho lễ chiều.",
  },
  EXTRA: {
    label: "Lễ ngoài giờ",
    defaultTime: "19:00",
    durationMinutes: 60,
    description: "Khung giờ mặc định cho lễ ngoài giờ.",
  },
  ADORATION: {
    label: "Chầu Thánh Thể",
    defaultTime: "19:00",
    durationMinutes: 60,
    description: "Khung giờ mặc định cho chầu Thánh Thể.",
  },
};

export const SERVICE_PERIOD_OPTIONS: Array<{ value: ServicePeriod; label: string }> = [
  { value: "MORNING", label: "Lễ sáng" },
  { value: "AFTERNOON", label: "Lễ chiều" },
  { value: "EXTRA", label: "Lễ ngoài giờ" },
  { value: "ADORATION", label: "Chầu Thánh Thể" },
];

export function combineDateAndTime(dateValue: string, timeValue: string) {
  return combineUtcDateAndTime(dateValue, timeValue);
}

export function resolveServiceDateTime(input: {
  serviceDate: string;
  servicePeriod: ServicePeriod;
  customTime?: string | null;
}) {
  const slot = SERVICE_TIME_SLOTS[input.servicePeriod];
  const timeValue = input.customTime?.trim() || slot.defaultTime;
  const startsAt = combineUtcDateAndTime(input.serviceDate, timeValue);
  const endsAt = new Date(startsAt);
  endsAt.setUTCMinutes(endsAt.getUTCMinutes() + slot.durationMinutes);

  return {
    startsAt,
    endsAt,
    resolvedTime: timeValue,
    slot,
  };
}

export function getServicePeriodFromDate(date: Date, serviceType?: string): ServicePeriod {
  if (serviceType === "ADORATION") {
    return "ADORATION";
  }

  const hour = date.getUTCHours();
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EXTRA";
}

export function getServicePeriodLabel(period: ServicePeriod) {
  return SERVICE_TIME_SLOTS[period].label;
}

export function formatTime(date: Date) {
  return formatTimeValue(date);
}

export { formatDateInputValue };

export function buildServiceTitle(serviceDate: string, servicePeriod: ServicePeriod, customTime?: string | null) {
  void serviceDate;
  const label = getServicePeriodLabel(servicePeriod);
  const timePart = customTime?.trim() ? ` - ${customTime.trim()}` : "";
  return `${label}${timePart}`;
}
