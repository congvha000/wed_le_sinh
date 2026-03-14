export function getNextWeekStart(base = new Date()) {
  const now = new Date(base);
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? 1 : 8 - currentDay;
  const nextMonday = new Date(now);
  nextMonday.setHours(0, 0, 0, 0);
  nextMonday.setDate(now.getDate() + diffToMonday);
  return nextMonday;
}

export function getNextWeekEnd(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
}

export function startOfMonth(date: Date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });
}
