import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireDbUser(role?: "ADMIN" | "USER") {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return {
      error: Response.json({ error: "Bạn chưa đăng nhập" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    return {
      error: Response.json({ error: "Tài khoản không hợp lệ" }, { status: 401 }),
    };
  }

  if (role && user.role !== role) {
    return {
      error: Response.json({ error: "Bạn không có quyền thực hiện thao tác này" }, { status: 403 }),
    };
  }

  return { user };
}

export function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseWeekStart(input: string | Date) {
  return startOfDay(new Date(input));
}

export function sameDate(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
