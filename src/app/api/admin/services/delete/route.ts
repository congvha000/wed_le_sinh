import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { deleteServiceSchema } from "@/lib/validators";
import { syncPairTotals, uniquePairIds } from "@/lib/pair-point-sync";
import { invalidateScheduleAcksForPairs, resolveScheduleWeekStart } from "@/lib/schedule-ack";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const parsed = deleteServiceSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json({ error: "Payload không hợp lệ" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: parsed.data.serviceId },
      select: {
        id: true,
        startsAt: true,
        assignments: {
          select: {
            pairId: true,
          },
        },
      },
    });

    if (!service) {
      return Response.json({ error: "Không tìm thấy buổi lễ" }, { status: 404 });
    }

    const affectedPairIds = uniquePairIds(service.assignments.map((assignment) => assignment.pairId));
    const weekStart = resolveScheduleWeekStart(service.startsAt);

    await prisma.$transaction(async (tx) => {
      await tx.service.delete({
        where: { id: service.id },
      });

      await invalidateScheduleAcksForPairs(tx, affectedPairIds, weekStart);
      await syncPairTotals(tx, affectedPairIds);
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể xóa buổi lễ" }, { status: 500 });
  }
}
