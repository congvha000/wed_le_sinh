import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { parseServiceMutationPayload } from "@/lib/service-mutation";
import { syncPairTotals, uniquePairIds } from "@/lib/pair-point-sync";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const payload = await req.json();
    const serviceId = String(payload?.serviceId ?? "").trim();

    if (!serviceId) {
      return Response.json({ error: "Thiếu serviceId" }, { status: 400 });
    }

    const parsed = parseServiceMutationPayload(payload);
    if (parsed.ok === false) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        type: true,
        startsAt: true,
        endsAt: true,
        points: true,
        assignments: {
          select: {
            id: true,
            pairId: true,
          },
        },
      },
    });

    if (!service) {
      return Response.json({ error: "Không tìm thấy buổi lễ" }, { status: 404 });
    }

    const { title, type, startsAt, endsAt, points, status, isSundayAM, isSaturdayPM } = parsed.data;
    const structureChanged =
      String(service.type) !== String(type) ||
      service.startsAt.getTime() !== startsAt.getTime() ||
      service.endsAt.getTime() !== endsAt.getTime();
    const pointsChanged = Number(service.points) !== Number(points);
    const affectedPairIds = uniquePairIds(service.assignments.map((assignment) => assignment.pairId));

    await prisma.$transaction(async (tx) => {
      if (structureChanged && service.assignments.length > 0) {
        await tx.assignment.deleteMany({ where: { serviceId: service.id } });
      }

      await tx.service.update({
        where: { id: service.id },
        data: {
          title,
          type,
          startsAt,
          endsAt,
          points,
          status,
          isSundayAM,
          isSaturdayPM,
        },
      });

      if (affectedPairIds.length > 0 && (structureChanged || pointsChanged)) {
        await syncPairTotals(tx, affectedPairIds);
      }
    });

    return Response.json({
      ok: true,
      resetAssignments: structureChanged && service.assignments.length > 0,
      removedAssignments: structureChanged ? service.assignments.length : 0,
    });
  } catch {
    return Response.json({ error: "Không thể cập nhật buổi lễ" }, { status: 500 });
  }
}
