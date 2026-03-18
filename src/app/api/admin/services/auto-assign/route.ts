import { AssignmentRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { overlaps, parseWeekStart, requireDbUser, sameDate } from "@/lib/api-access";
import { addDays } from "@/lib/date-utils";
import { syncPairTotals, uniquePairIds } from "@/lib/pair-point-sync";

type PairLite = {
  id: string;
  name: string;
  level: string;
  totalPoints: number;
};

type ServiceLite = {
  id: string;
  title: string;
  type: string;
  points: number;
  startsAt: Date;
  endsAt: Date;
  existingAssignments: { pairId: string; role: string }[];
};

type ScheduledSlot = {
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
};

function canServeFourPeople(levels: string[]) {
  const sorted = [...levels].sort();
  const joined = sorted.join("|");
  return joined === "LEVEL_2|LEVEL_3" || joined === "LEVEL_3|LEVEL_3";
}

function getRequiredPairCount(type: string) {
  return type === "FOUR_PEOPLE" ? 2 : 1;
}

function scorePair(
  pair: PairLite,
  runtimePoints: Map<string, number>,
  scheduledByPairId: Map<string, ScheduledSlot[]>,
  service: ServiceLite,
) {
  const scheduled = scheduledByPairId.get(pair.id) ?? [];
  const sameDayCount = scheduled.filter((slot) => sameDate(slot.startsAt, service.startsAt)).length;
  const weeklyCount = scheduled.length;
  const basePoints = runtimePoints.get(pair.id) ?? pair.totalPoints;
  const priorityBonus = service.points >= 1.2 ? 0.4 : 0;

  return basePoints * 6 + weeklyCount * 3.5 + sameDayCount * 12 - priorityBonus;
}

function scoreCombo(
  a: PairLite,
  b: PairLite,
  runtimePoints: Map<string, number>,
  scheduledByPairId: Map<string, ScheduledSlot[]>,
  service: ServiceLite,
) {
  const pointGap = Math.abs((runtimePoints.get(a.id) ?? a.totalPoints) - (runtimePoints.get(b.id) ?? b.totalPoints));
  return scorePair(a, runtimePoints, scheduledByPairId, service) + scorePair(b, runtimePoints, scheduledByPairId, service) + pointGap * 0.8;
}

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { weekStart } = await req.json();

    if (!weekStart) {
      return Response.json({ error: "Thiếu weekStart" }, { status: 400 });
    }

    const start = parseWeekStart(weekStart);
    const end = addDays(start, 7);

    const [servicesRaw, pairsRaw, busyWindow] = await Promise.all([
      prisma.service.findMany({
        where: { startsAt: { gte: start, lt: end } },
        orderBy: { startsAt: "asc" },
        include: { assignments: true },
      }),
      prisma.pair.findMany({ where: { active: true }, include: { members: true } }),
      prisma.busyWindow.findUnique({ where: { weekStart: start }, include: { requests: true } }),
    ]);

    if (servicesRaw.length === 0) {
      return Response.json({ ok: true, summary: { assignedServices: 0, totalServices: 0, unassignedServices: [], message: "Tuần này chưa có buổi lễ nào để tự xếp." } });
    }

    const validPairs: PairLite[] = pairsRaw
      .filter((pair) => pair.members.length >= 2)
      .map((pair) => ({ id: pair.id, name: pair.name, level: String(pair.level), totalPoints: Number(pair.totalPoints) }));

    const busyByPairId = new Map<string, Date[]>();
    for (const request of busyWindow?.requests ?? []) {
      const items = busyByPairId.get(request.pairId) ?? [];
      items.push(new Date(request.busyDate));
      busyByPairId.set(request.pairId, items);
    }

    const services: ServiceLite[] = servicesRaw
      .map((service) => ({
        id: service.id,
        title: service.title,
        type: String(service.type),
        points: Number(service.points),
        startsAt: service.startsAt,
        endsAt: service.endsAt,
        existingAssignments: service.assignments.map((assignment) => ({ pairId: assignment.pairId, role: String(assignment.role) })),
      }))
      .sort((a, b) => {
        const requiredDiff = getRequiredPairCount(b.type) - getRequiredPairCount(a.type);
        if (requiredDiff !== 0) return requiredDiff;
        if (b.points !== a.points) return b.points - a.points;
        return a.startsAt.getTime() - b.startsAt.getTime();
      });

    const weekPointsAlreadyApplied = new Map<string, number>();
    for (const service of services) {
      for (const assignment of service.existingAssignments) {
        weekPointsAlreadyApplied.set(assignment.pairId, (weekPointsAlreadyApplied.get(assignment.pairId) ?? 0) + service.points);
      }
    }

    const runtimePoints = new Map<string, number>();
    for (const pair of validPairs) {
      runtimePoints.set(pair.id, pair.totalPoints - (weekPointsAlreadyApplied.get(pair.id) ?? 0));
    }

    const scheduledByPairId = new Map<string, ScheduledSlot[]>();
    const assignmentCreates: { serviceId: string; pairId: string; role: AssignmentRole }[] = [];
    const unassignedServices: { title: string; startsAt: string }[] = [];

    for (const service of services) {
      const candidates = validPairs.filter((pair) => {
        const busyDates = busyByPairId.get(pair.id) ?? [];
        if (busyDates.some((busyDate) => sameDate(busyDate, service.startsAt))) return false;
        const existingSlots = scheduledByPairId.get(pair.id) ?? [];
        if (existingSlots.some((slot) => overlaps(slot.startsAt, slot.endsAt, service.startsAt, service.endsAt))) return false;
        return true;
      });

      if (getRequiredPairCount(service.type) === 1) {
        const eligible = [...candidates].sort((a, b) => {
          const scoreDiff = scorePair(a, runtimePoints, scheduledByPairId, service) - scorePair(b, runtimePoints, scheduledByPairId, service);
          if (scoreDiff !== 0) return scoreDiff;
          return a.name.localeCompare(b.name, "vi");
        });

        const selected = eligible[0];
        if (!selected) {
          unassignedServices.push({ title: service.title, startsAt: service.startsAt.toISOString() });
          continue;
        }

        assignmentCreates.push({ serviceId: service.id, pairId: selected.id, role: AssignmentRole.GENERAL });
        runtimePoints.set(selected.id, (runtimePoints.get(selected.id) ?? 0) + service.points);
        const slots = scheduledByPairId.get(selected.id) ?? [];
        slots.push({ serviceId: service.id, startsAt: service.startsAt, endsAt: service.endsAt });
        scheduledByPairId.set(selected.id, slots);
        continue;
      }

      const eligible = candidates.filter((pair) => ["LEVEL_2", "LEVEL_3"].includes(pair.level));
      let bestCombo: [PairLite, PairLite] | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let i = 0; i < eligible.length; i += 1) {
        for (let j = i + 1; j < eligible.length; j += 1) {
          const first = eligible[i];
          const second = eligible[j];
          if (!canServeFourPeople([first.level, second.level])) continue;
          const comboScore = scoreCombo(first, second, runtimePoints, scheduledByPairId, service);
          if (comboScore < bestScore) {
            bestScore = comboScore;
            bestCombo = [first, second];
          }
        }
      }

      if (!bestCombo) {
        unassignedServices.push({ title: service.title, startsAt: service.startsAt.toISOString() });
        continue;
      }

      const roles = [AssignmentRole.CANDLE, AssignmentRole.INCENSE] as const;
      bestCombo.forEach((selected, index) => {
        assignmentCreates.push({ serviceId: service.id, pairId: selected.id, role: roles[index] });
        runtimePoints.set(selected.id, (runtimePoints.get(selected.id) ?? 0) + service.points);
        const slots = scheduledByPairId.get(selected.id) ?? [];
        slots.push({ serviceId: service.id, startsAt: service.startsAt, endsAt: service.endsAt });
        scheduledByPairId.set(selected.id, slots);
      });
    }

    const affectedPairIds = uniquePairIds([
      ...servicesRaw.flatMap((service) => service.assignments.map((assignment) => assignment.pairId)),
      ...assignmentCreates.map((assignment) => assignment.pairId),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { serviceId: { in: services.map((service) => service.id) } } });
      if (assignmentCreates.length > 0) {
        await tx.assignment.createMany({ data: assignmentCreates });
      }
      await syncPairTotals(tx, affectedPairIds);
    });

    const assignedServices = services.filter((service) => {
      const assignedCount = assignmentCreates.filter((assignment) => assignment.serviceId === service.id).length;
      return assignedCount >= getRequiredPairCount(service.type);
    }).length;

    const message = unassignedServices.length === 0 ? `Đã tự xếp ${assignedServices}/${services.length} buổi lễ.` : `Đã tự xếp ${assignedServices}/${services.length} buổi lễ. Còn ${unassignedServices.length} buổi cần gán tay.`;

    return Response.json({ ok: true, summary: { assignedServices, totalServices: services.length, unassignedServices, message } });
  } catch {
    return Response.json({ error: "Không thể tự xếp lịch" }, { status: 500 });
  }
}
