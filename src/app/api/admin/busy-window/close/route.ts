import { prisma } from "@/lib/prisma";
import { parseWeekStart, requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { weekStart } = await req.json();
    if (!weekStart) return Response.json({ error: "Thiếu weekStart" }, { status: 400 });

    const start = parseWeekStart(weekStart);
    const existing = await prisma.busyWindow.findUnique({ where: { weekStart: start } });

    if (!existing) return Response.json({ error: "Tuần này chưa được mở đăng ký ngày bận" }, { status: 404 });

    await prisma.busyWindow.update({
      where: { weekStart: start },
      data: {
        isOpen: false,
        closesAt: new Date(),
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể khóa đăng ký ngày bận" }, { status: 500 });
  }
}
