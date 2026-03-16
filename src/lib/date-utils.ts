export function getCurrentWeekStart(base = new Date()) {
  const now = new Date(base);
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = new Date(now);
  currentMonday.setHours(0, 0, 0, 0);
  currentMonday.setDate(now.getDate() + diffToMonday);
  return currentMonday;
}

export function getNextWeekStart(base = new Date()) {
  const currentWeekStart = getCurrentWeekStart(base);
  const nextMonday = new Date(currentWeekStart);
  nextMonday.setDate(currentWeekStart.getDate() + 7);
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
