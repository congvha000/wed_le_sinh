import { addDays, parseDateOnly } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { scheduleAckSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const authResult = await requireDbUser("USER");
  if (authResult.error) return authResult.error;

  try {
    const parsed = scheduleAckSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const weekStart = parseDateOnly(parsed.data.weekStart);
    if (Number.isNaN(weekStart.getTime())) {
      return Response.json({ error: "Tuần xác nhận không hợp lệ" }, { status: 400 });
    }

    const weekEnd = addDays(weekStart, 7);

    const pairMember = await prisma.pairMember.findFirst({
      where: {
        userId: authResult.user.id,
      },
      select: {
        pairId: true,
      },
    });

    if (!pairMember) {
      return Response.json({ error: "Bạn chưa được ghép cặp để xác nhận lịch" }, { status: 400 });
    }

    const hasSchedule = await prisma.assignment.findFirst({
      where: {
        pairId: pairMember.pairId,
        service: {
          startsAt: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!hasSchedule) {
      return Response.json({ error: "Tuần này bạn chưa có lịch để xác nhận" }, { status: 400 });
    }

    const ack = await prisma.scheduleAck.upsert({
      where: {
        userId_weekStart: {
          userId: authResult.user.id,
          weekStart,
        },
      },
      update: {
        createdAt: new Date(),
      },
      create: {
        userId: authResult.user.id,
        weekStart,
      },
      select: {
        createdAt: true,
      },
    });

    return Response.json({
      ok: true,
      acknowledgedAt: ack.createdAt.toISOString(),
    });
  } catch {
    return Response.json({ error: "Không thể xác nhận đã xem lịch" }, { status: 500 });
  }
}
