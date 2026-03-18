const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnlyString(value: string) {
  return DATE_ONLY_PATTERN.test(value.trim());
}

export function padNumber(value: number) {
  return `${value}`.padStart(2, "0");
}

export function parseDateOnly(value: string) {
  const normalized = value.trim();
  if (!isDateOnlyString(normalized)) {
    return new Date(Number.NaN);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0));
}

export function normalizeUtcDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const normalized = value.trim();
  if (isDateOnlyString(normalized)) {
    return parseDateOnly(normalized);
  }

  return new Date(normalized);
}

export function startOfUtcDay(value: string | Date) {
  const date = normalizeUtcDate(value);
  if (Number.isNaN(date.getTime())) {
    return date;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function combineUtcDateAndTime(dateValue: string, timeValue: string) {
  const date = parseDateOnly(dateValue);
  if (Number.isNaN(date.getTime())) {
    return date;
  }

  const [hour, minute] = timeValue.split(":").map(Number);
  date.setUTCHours(hour || 0, minute || 0, 0, 0);
  return date;
}

export function formatDateInputValue(date: string | Date = new Date()) {
  const normalized = normalizeUtcDate(date);
  if (Number.isNaN(normalized.getTime())) {
    return "";
  }

  return `${normalized.getUTCFullYear()}-${padNumber(normalized.getUTCMonth() + 1)}-${padNumber(normalized.getUTCDate())}`;
}

export function formatDateLabel(date: string | Date) {
  const normalized = normalizeUtcDate(date);
  if (Number.isNaN(normalized.getTime())) {
    return typeof date === "string" ? date : "";
  }

  return `${padNumber(normalized.getUTCDate())}/${padNumber(normalized.getUTCMonth() + 1)}/${normalized.getUTCFullYear()}`;
}

export function formatWeekdayDateLabel(date: string | Date) {
  const normalized = normalizeUtcDate(date);
  if (Number.isNaN(normalized.getTime())) {
    return typeof date === "string" ? date : "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(normalized);
}

export function formatTimeValue(date: string | Date) {
  const normalized = normalizeUtcDate(date);
  if (Number.isNaN(normalized.getTime())) {
    return "";
  }

  return `${padNumber(normalized.getUTCHours())}:${padNumber(normalized.getUTCMinutes())}`;
}

export function addDays(date: string | Date, amount: number) {
  const next = normalizeUtcDate(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function getCurrentWeekStart(base = new Date()) {
  const now = normalizeUtcDate(base);
  const currentDay = now.getUTCDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = startOfUtcDay(now);
  currentMonday.setUTCDate(currentMonday.getUTCDate() + diffToMonday);
  return currentMonday;
}

export function getNextWeekStart(base = new Date()) {
  return addDays(getCurrentWeekStart(base), 7);
}

export function getNextWeekEnd(start: Date) {
  return addDays(start, 7);
}

export function startOfMonth(date: Date) {
  const next = normalizeUtcDate(date);
  next.setUTCDate(1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = normalizeUtcDate(date);
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next;
}

export function getMonthKey(date: Date) {
  const normalized = normalizeUtcDate(date);
  return `${normalized.getUTCFullYear()}-${padNumber(normalized.getUTCMonth() + 1)}`;
}

export function formatMonthLabel(date: Date) {
  const normalized = normalizeUtcDate(date);
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(normalized);
}
