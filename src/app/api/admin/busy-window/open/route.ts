import { prisma } from "@/lib/prisma";
import { parseWeekStart, requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { weekStart } = await req.json();
    if (!weekStart) return Response.json({ error: "Thiếu weekStart" }, { status: 400 });

    const start = parseWeekStart(weekStart);

    await prisma.busyWindow.upsert({
      where: { weekStart: start },
      update: {
        isOpen: true,
        closesAt: null,
        opensAt: new Date(),
      },
      create: {
        weekStart: start,
        opensAt: new Date(),
        isOpen: true,
        maxPairsPerDay: 3,
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể mở đăng ký ngày bận" }, { status: 500 });
  }
}
