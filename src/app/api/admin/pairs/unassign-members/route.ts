import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { pairId } = await req.json();
    const normalizedPairId = String(pairId ?? "").trim();

    if (!normalizedPairId) {
      return Response.json({ error: "Thiếu pairId" }, { status: 400 });
    }

    const pair = await prisma.pair.findUnique({
      where: { id: normalizedPairId },
      include: {
        members: true,
        assignments: {
          where: {
            service: {
              startsAt: {
                gte: new Date(),
              },
            },
          },
        },
      },
    });

    if (!pair) {
      return Response.json({ error: "Không tìm thấy cặp" }, { status: 404 });
    }

    if (pair.members.length === 0) {
      return Response.json({ error: "Cặp này hiện chưa có thành viên để tách" }, { status: 400 });
    }

    if (pair.assignments.length > 0) {
      return Response.json(
        { error: "Cặp này đang có lịch sắp tới. Vui lòng gỡ lịch trước khi tách cặp." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.busyDayRequest.deleteMany({ where: { pairId: normalizedPairId } }),
      prisma.pairMember.deleteMany({ where: { pairId: normalizedPairId } }),
    ]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể tách cặp" }, { status: 500 });
  }
}
