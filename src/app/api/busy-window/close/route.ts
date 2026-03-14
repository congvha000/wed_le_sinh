import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { weekStart } = await req.json();

    if (!weekStart) {
      return Response.json({ error: "Thiếu weekStart" }, { status: 400 });
    }

    const start = new Date(weekStart);

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
