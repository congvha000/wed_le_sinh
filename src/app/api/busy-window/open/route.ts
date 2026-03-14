import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { weekStart } = await req.json();

    if (!weekStart) {
      return Response.json({ error: "Thiếu weekStart" }, { status: 400 });
    }

    const start = new Date(weekStart);

    await prisma.busyWindow.upsert({
      where: { weekStart: start },
      update: {
        isOpen: true,
        opensAt: new Date(),
        closesAt: null,
        maxPairsPerDay: 3,
      },
      create: {
        weekStart: start,
        isOpen: true,
        opensAt: new Date(),
        maxPairsPerDay: 3,
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể mở đăng ký ngày bận" }, { status: 500 });
  }
}
