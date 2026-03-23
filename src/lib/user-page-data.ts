import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/get-user-context";
import { syncPairTotals } from "@/lib/pair-point-sync";
import {
  addDays,
  addMonths,
  formatDateInputValue,
  formatMonthLabel,
  getCurrentWeekStart,
  getMonthKey,
  getNextWeekStart,
  startOfMonth,
} from "@/lib/date-utils";

export async function requireUserContext() {
  const ctx = await getUserContext();

  if (!ctx.user) {
    redirect("/login");
  }

  if (ctx.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (ctx.nextPath !== "/dashboard") {
    redirect(ctx.nextPath);
  }

  return ctx;
}

function toDateKey(date: Date) {
  return formatDateInputValue(date);
}

export async function getUserPageData() {
  const ctx = await requireUserContext();
  await syncPairTotals(prisma);

  const nextWeekStart = getNextWeekStart();
  const rollingStart = addMonths(startOfMonth(new Date()), -11);
  const rollingEnd = addMonths(startOfMonth(new Date()), 1);
  const now = new Date();

  const [pairMember, busyWindow, scheduleAcks] = (await Promise.all([
    prisma.pairMember.findFirst({
      where: { userId: ctx.user.id },
      include: {
        pair: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
            assignments: {
              where: {
                service: {
                  startsAt: {
                    gte: now,
                  },
                },
              },
              include: {
                service: true,
              },
              orderBy: {
                service: {
                  startsAt: "asc",
                },
              },
            },
            busyRequests: {
              where: {
                busyWindow: {
                  weekStart: nextWeekStart,
                },
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: [{ busyDate: "asc" }, { queueOrder: "asc" }],
            },
            pointTxs: {
              where: {
                createdAt: {
                  gte: rollingStart,
                  lt: rollingEnd,
                },
              },
              select: {
                id: true,
                delta: true,
                reason: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    } as any),
    prisma.busyWindow.findUnique({
      where: { weekStart: nextWeekStart },
    }),
    prisma.scheduleAck.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        weekStart: true,
        createdAt: true,
      },
    }),
  ])) as [any, any, Array<{ weekStart: Date; createdAt: Date }>];

  const pair = pairMember?.pair ?? null;

  const monthlyAssignments = pair
    ? await prisma.assignment.findMany({
        where: {
          pairId: pair.id,
          service: {
            startsAt: {
              gte: rollingStart,
              lt: rollingEnd,
            },
            endsAt: {
              lte: now,
            },
          },
        },
        include: {
          service: {
            select: {
              startsAt: true,
              points: true,
            },
          },
        },
      })
    : [];

  const frames = Array.from({ length: 12 }).map((_, index) => {
    const date = addMonths(rollingStart, index);
    return {
      key: getMonthKey(date),
      label: formatMonthLabel(date),
      points: 0,
      services: 0,
    };
  });

  const frameMap = new Map(frames.map((item) => [item.key, item]));
  for (const assignment of monthlyAssignments) {
    const key = getMonthKey(assignment.service.startsAt);
    const item = frameMap.get(key);
    if (!item) continue;
    item.points += Number(assignment.service.points);
    item.services += 1;
  }

  for (const pointTx of pair?.pointTxs ?? []) {
    const key = getMonthKey(pointTx.createdAt);
    const item = frameMap.get(key);
    if (!item) continue;
    item.points += Number(pointTx.delta);
  }

  const monthlyStats = frames.map((item) => ({
    label: item.label,
    points: Number(item.points.toFixed(2)),
    services: item.services,
  }));

  const currentMonthLabel = formatMonthLabel(new Date());
  const currentMonthPoints = monthlyStats.find((item) => item.label === currentMonthLabel)?.points ?? 0;
  const bestMonth = monthlyStats.reduce(
    (best, item) => (item.points > best.points ? item : best),
    { label: currentMonthLabel, points: 0, services: 0 },
  );

  const partnerNames =
    pair?.members.map((member) => member.user.name || member.user.email).join(" · ") ?? "Chưa có cặp";

  const partnerMember = pair?.members.find((member) => member.userId !== ctx.user.id) ?? null;
  const currentUserBusyRequest =
    pair?.busyRequests.find((item) => item.userId === ctx.user.id) ?? null;
  const partnerBusyRequest =
    pair?.busyRequests.find((item) => item.userId && item.userId !== ctx.user.id) ?? null;
  const legacyBusyRequests = pair?.busyRequests.filter((item) => !item.userId) ?? [];
  const pairBusyDaysCount = pair
    ? pair.busyRequests.reduce((set, item) => set.add(toDateKey(item.busyDate)), new Set<string>()).size
    : 0;

  const scheduleAckMap = new Map(
    scheduleAcks.map((item) => [formatDateInputValue(item.weekStart), item.createdAt] as const),
  );

  const scheduleWeeksMap = new Map<
    string,
    {
      weekStart: string;
      weekEnd: string;
      acknowledgedAt: string | null;
      assignments: typeof pair.assignments;
    }
  >();

  for (const assignment of pair?.assignments ?? []) {
    const weekStart = getCurrentWeekStart(assignment.service.startsAt);
    const weekStartKey = formatDateInputValue(weekStart);

    if (!scheduleWeeksMap.has(weekStartKey)) {
      scheduleWeeksMap.set(weekStartKey, {
        weekStart: weekStartKey,
        weekEnd: formatDateInputValue(addDays(weekStart, 6)),
        acknowledgedAt: scheduleAckMap.get(weekStartKey)?.toISOString() ?? null,
        assignments: [],
      });
    }

    scheduleWeeksMap.get(weekStartKey)!.assignments.push(assignment);
  }

  const scheduleWeeks = Array.from(scheduleWeeksMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );

  return {
    ctx,
    pair,
    busyWindow,
    nextWeekStart,
    monthlyStats,
    monthlyAssignments,
    currentMonthPoints,
    bestMonth,
    partnerNames,
    pairBusyDaysCount,
    currentUserBusyRequest,
    partnerBusyRequest,
    partnerName: partnerMember?.user.name || partnerMember?.user.email || null,
    legacyBusyDates: legacyBusyRequests.map((item) => item.busyDate),
    scheduleWeeks,
  };
}
