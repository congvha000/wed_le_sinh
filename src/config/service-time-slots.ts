export type ServicePeriod = "MORNING" | "AFTERNOON" | "EXTRA";

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
};

export const SERVICE_PERIOD_OPTIONS: Array<{ value: ServicePeriod; label: string }> = [
  { value: "MORNING", label: "Lễ sáng" },
  { value: "AFTERNOON", label: "Lễ chiều" },
  { value: "EXTRA", label: "Lễ ngoài giờ" },
];

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

export function combineDateAndTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  const date = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
  return date;
}

export function resolveServiceDateTime(input: {
  serviceDate: string;
  servicePeriod: ServicePeriod;
  customTime?: string | null;
}) {
  const slot = SERVICE_TIME_SLOTS[input.servicePeriod];
  const timeValue = input.customTime?.trim() || slot.defaultTime;
  const startsAt = combineDateAndTime(input.serviceDate, timeValue);
  const endsAt = new Date(startsAt);
  endsAt.setMinutes(endsAt.getMinutes() + slot.durationMinutes);

  return {
    startsAt,
    endsAt,
    resolvedTime: timeValue,
    slot,
  };
}

export function getServicePeriodFromDate(date: Date): ServicePeriod {
  const hour = date.getHours();
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EXTRA";
}

export function getServicePeriodLabel(period: ServicePeriod) {
  return SERVICE_TIME_SLOTS[period].label;
}

export function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildServiceTitle(serviceDate: string, servicePeriod: ServicePeriod, customTime?: string | null) {
  const label = getServicePeriodLabel(servicePeriod);
  const timePart = customTime?.trim() ? ` - ${customTime.trim()}` : "";
  return `${label}${timePart}`;
}
