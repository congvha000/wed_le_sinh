import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/get-user-context";
import { addMonths, formatMonthLabel, getMonthKey, getNextWeekStart, startOfMonth } from "@/lib/date-utils";

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

export async function getUserPageData() {
  const ctx = await requireUserContext();
  const nextWeekStart = getNextWeekStart();
  const rollingStart = addMonths(startOfMonth(new Date()), -11);
  const rollingEnd = addMonths(startOfMonth(new Date()), 1);

  const [pairMember, busyWindow] = await Promise.all([
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
                    gte: new Date(),
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
              orderBy: {
                busyDate: "asc",
              },
            },
          },
        },
      },
    }),
    prisma.busyWindow.findUnique({
      where: { weekStart: nextWeekStart },
    }),
  ]);

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

  const monthlyStats = frames.map((item) => ({
    label: item.label,
    points: item.points,
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
  };
}
