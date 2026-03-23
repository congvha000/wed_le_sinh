import { prisma } from "@/lib/prisma";
import { overlaps, requireDbUser, sameDate } from "@/lib/api-access";
import { syncPairTotals } from "@/lib/pair-point-sync";
import { invalidateScheduleAcksForPairs, resolveScheduleWeekStart } from "@/lib/schedule-ack";
import { swapAssignmentsSchema } from "@/lib/validators";

type PairSnapshot = {
  id: string;
  name: string;
  level: string;
  active: boolean;
  memberCount: number;
};

type AssignmentSnapshot = {
  id: string;
  pairId: string;
  role: string;
  pair: PairSnapshot;
  service: {
    id: string;
    title: string;
    type: string;
    startsAt: Date;
    endsAt: Date;
    assignments: {
      id: string;
      pairId: string;
      role: string;
      pair: {
        id: string;
        level: string;
      };
    }[];
  };
};

function canServeFourPeople(levels: string[]) {
  const sorted = [...levels].sort();
  const joined = sorted.join("|");
  return joined === "LEVEL_2|LEVEL_3" || joined === "LEVEL_3|LEVEL_3";
}

function isPairEligibleForService(serviceType: string, pair: PairSnapshot) {
  if (!pair.active || pair.memberCount < 2) {
    return false;
  }

  if (serviceType === "ADORATION") {
    return pair.level === "LEVEL_3";
  }

  if (serviceType === "FOUR_PEOPLE") {
    return pair.level === "LEVEL_2" || pair.level === "LEVEL_3";
  }

  return true;
}

function validateServiceAfterSwap(
  service: AssignmentSnapshot["service"],
  replacedAssignmentId: string,
  incomingPair: PairSnapshot,
) {
  if (!isPairEligibleForService(service.type, incomingPair)) {
    if (service.type === "ADORATION") {
      return "Chầu Thánh Thể chỉ nhận cặp LV3";
    }

    if (service.type === "FOUR_PEOPLE") {
      return "Lễ 4 người chỉ nhận cặp LV2 hoặc LV3";
    }

    return "Cặp được đổi không đủ điều kiện cho buổi lễ này";
  }

  const nextAssignments = service.assignments.map((assignment) =>
    assignment.id === replacedAssignmentId
      ? {
          ...assignment,
          pairId: incomingPair.id,
          pair: {
            id: incomingPair.id,
            level: incomingPair.level,
          },
        }
      : assignment,
  );

  const pairIds = nextAssignments.map((assignment) => assignment.pairId);
  if (new Set(pairIds).size !== pairIds.length) {
    return "Sau khi đổi, buổi lễ sẽ bị trùng cặp phục vụ";
  }

  if (service.type === "FOUR_PEOPLE") {
    const levels = nextAssignments.map((assignment) => String(assignment.pair.level));
    if (levels.some((level) => !["LEVEL_2", "LEVEL_3"].includes(level))) {
      return "Lễ 4 người chỉ nhận cặp LV2 hoặc LV3";
    }
    if (levels.length === 2 && !canServeFourPeople(levels)) {
      return "Tổ hợp 2 cặp sau khi đổi không hợp lệ cho lễ 4 người";
    }
  }

  return null;
}

function validatePairAvailability(
  pairId: string,
  currentService: AssignmentSnapshot["service"],
  targetService: AssignmentSnapshot["service"],
  busyDates: Date[],
  existingAssignments: { service: { startsAt: Date; endsAt: Date } }[],
) {
  const movingToAnotherDate = !sameDate(currentService.startsAt, targetService.startsAt);
  if (movingToAnotherDate && busyDates.some((busyDate) => sameDate(busyDate, targetService.startsAt))) {
    return "Cặp được đổi đã đăng ký bận trong ngày của buổi lễ mới";
  }

  const hasOverlap = existingAssignments.some((assignment) =>
    overlaps(
      assignment.service.startsAt,
      assignment.service.endsAt,
      targetService.startsAt,
      targetService.endsAt,
    ),
  );

  if (hasOverlap) {
    return "Cặp được đổi đang có buổi lễ khác trùng giờ với lịch mới";
  }

  void pairId;
  return null;
}

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const parsed = swapAssignmentsSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const assignmentIds = [parsed.data.firstAssignmentId, parsed.data.secondAssignmentId];

    const assignmentsRaw = await prisma.assignment.findMany({
      where: {
        id: {
          in: assignmentIds,
        },
      },
      select: {
        id: true,
        pairId: true,
        role: true,
        pair: {
          select: {
            id: true,
            name: true,
            level: true,
            active: true,
            members: {
              select: {
                id: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            type: true,
            startsAt: true,
            endsAt: true,
            assignments: {
              select: {
                id: true,
                pairId: true,
                role: true,
                pair: {
                  select: {
                    id: true,
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const assignments: AssignmentSnapshot[] = assignmentsRaw.map((item) => ({
      id: item.id,
      pairId: item.pairId,
      role: String(item.role),
      pair: {
        id: item.pair.id,
        name: item.pair.name,
        level: String(item.pair.level),
        active: item.pair.active,
        memberCount: item.pair.members.length,
      },
      service: {
        id: item.service.id,
        title: item.service.title,
        type: String(item.service.type),
        startsAt: item.service.startsAt,
        endsAt: item.service.endsAt,
        assignments: item.service.assignments.map((assignment) => ({
          id: assignment.id,
          pairId: assignment.pairId,
          role: String(assignment.role),
          pair: {
            id: assignment.pair.id,
            level: String(assignment.pair.level),
          },
        })),
      },
    }));

    if (assignments.length !== 2) {
      return Response.json({ error: "Không tìm thấy đủ 2 lượt gán để đổi" }, { status: 404 });
    }

    const [firstAssignment, secondAssignment] = assignmentIds.map((id) => assignments.find((item) => item.id === id)!);

    if (firstAssignment.service.id === secondAssignment.service.id) {
      return Response.json({ error: "Vui lòng chọn 2 buổi lễ khác nhau để đổi cặp" }, { status: 400 });
    }

    if (firstAssignment.pairId === secondAssignment.pairId) {
      return Response.json({ error: "Hai lượt gán đang cùng một cặp nên không cần đổi" }, { status: 400 });
    }

    const now = new Date();
    if (firstAssignment.service.startsAt <= now || secondAssignment.service.startsAt <= now) {
      return Response.json({ error: "Chỉ được đổi cặp cho các buổi lễ chưa bắt đầu" }, { status: 400 });
    }

    const [busyRequests, relatedAssignments] = await Promise.all([
      prisma.busyDayRequest.findMany({
        where: {
          pairId: {
            in: [firstAssignment.pairId, secondAssignment.pairId],
          },
        },
        select: {
          pairId: true,
          busyDate: true,
        },
      }),
      prisma.assignment.findMany({
        where: {
          pairId: {
            in: [firstAssignment.pairId, secondAssignment.pairId],
          },
          id: {
            notIn: [firstAssignment.id, secondAssignment.id],
          },
        },
        select: {
          pairId: true,
          service: {
            select: {
              startsAt: true,
              endsAt: true,
            },
          },
        },
      }),
    ]);

    const busyByPairId = new Map<string, Date[]>();
    for (const item of busyRequests) {
      const entries = busyByPairId.get(item.pairId) ?? [];
      entries.push(item.busyDate);
      busyByPairId.set(item.pairId, entries);
    }

    const assignmentsByPairId = new Map<string, { service: { startsAt: Date; endsAt: Date } }[]>();
    for (const item of relatedAssignments) {
      const entries = assignmentsByPairId.get(item.pairId) ?? [];
      entries.push(item);
      assignmentsByPairId.set(item.pairId, entries);
    }

    const firstServiceError = validateServiceAfterSwap(
      firstAssignment.service,
      firstAssignment.id,
      secondAssignment.pair,
    );
    if (firstServiceError) {
      return Response.json({ error: firstServiceError }, { status: 400 });
    }

    const secondServiceError = validateServiceAfterSwap(
      secondAssignment.service,
      secondAssignment.id,
      firstAssignment.pair,
    );
    if (secondServiceError) {
      return Response.json({ error: secondServiceError }, { status: 400 });
    }

    const firstPairAvailabilityError = validatePairAvailability(
      firstAssignment.pairId,
      firstAssignment.service,
      secondAssignment.service,
      busyByPairId.get(firstAssignment.pairId) ?? [],
      assignmentsByPairId.get(firstAssignment.pairId) ?? [],
    );
    if (firstPairAvailabilityError) {
      return Response.json({ error: `${firstAssignment.pair.name}: ${firstPairAvailabilityError}` }, { status: 400 });
    }

    const secondPairAvailabilityError = validatePairAvailability(
      secondAssignment.pairId,
      secondAssignment.service,
      firstAssignment.service,
      busyByPairId.get(secondAssignment.pairId) ?? [],
      assignmentsByPairId.get(secondAssignment.pairId) ?? [],
    );
    if (secondPairAvailabilityError) {
      return Response.json({ error: `${secondAssignment.pair.name}: ${secondPairAvailabilityError}` }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: firstAssignment.id },
        data: { pairId: secondAssignment.pairId },
      });

      await tx.assignment.update({
        where: { id: secondAssignment.id },
        data: { pairId: firstAssignment.pairId },
      });

      const firstWeekStart = resolveScheduleWeekStart(firstAssignment.service.startsAt);
      const secondWeekStart = resolveScheduleWeekStart(secondAssignment.service.startsAt);

      await invalidateScheduleAcksForPairs(tx, [firstAssignment.pairId, secondAssignment.pairId], firstWeekStart);
      if (firstWeekStart.getTime() !== secondWeekStart.getTime()) {
        await invalidateScheduleAcksForPairs(tx, [firstAssignment.pairId, secondAssignment.pairId], secondWeekStart);
      }

      await syncPairTotals(tx, [firstAssignment.pairId, secondAssignment.pairId]);
    });

    return Response.json({
      ok: true,
      summary: {
        firstPairName: firstAssignment.pair.name,
        secondPairName: secondAssignment.pair.name,
      },
    });
  } catch {
    return Response.json({ error: "Không thể đổi cặp giữa hai buổi lễ" }, { status: 500 });
  }
}
