import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/get-user-context";
import { addMonths, formatMonthLabel, getCurrentWeekStart, getMonthKey, getNextWeekEnd, getNextWeekStart, startOfMonth } from "@/lib/date-utils";

const pairSelect = {
  id: true,
  name: true,
  level: true,
  active: true,
  totalPoints: true,
  createdAt: true,
  members: {
    select: {
      isLeader: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

const serviceSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  points: true,
  startsAt: true,
  endsAt: true,
  assignments: {
    select: {
      id: true,
      pairId: true,
      role: true,
      createdAt: true,
      pair: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} as const;

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  approved: true,
  profileCompleted: true,
  createdAt: true,
  pairMembers: {
    select: {
      pair: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

async function getServicesForNextWeek(nextWeekStart: Date) {
  return prisma.service.findMany({
    where: {
      startsAt: {
        gte: nextWeekStart,
        lt: getNextWeekEnd(nextWeekStart),
      },
    },
    orderBy: { startsAt: "asc" },
    select: serviceSelect,
  });
}

async function getPairsForAdmin() {
  return prisma.pair.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: pairSelect,
  });
}

async function getUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
}

async function getBusyWindowForWeek(weekStart: Date) {
  return prisma.busyWindow.findUnique({
    where: { weekStart },
    include: {
      requests: {
        select: {
          id: true,
          pairId: true,
          busyDate: true,
          queueOrder: true,
          pair: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ busyDate: "asc" }, { queueOrder: "asc" }],
      },
    },
  });
}

export async function requireAdminContext() {
  const ctx = await getUserContext();

  if (!ctx.user) {
    redirect("/login");
  }

  if (ctx.user.role !== "ADMIN") {
    redirect(ctx.nextPath);
  }

  return ctx;
}

export async function getAdminServicesPageData() {
  const ctx = await requireAdminContext();
  const nextWeekStart = getNextWeekStart();

  const [services, pairs] = await Promise.all([getServicesForNextWeek(nextWeekStart), getPairsForAdmin()]);

  return {
    ctx,
    nextWeekStart,
    services,
    pairs,
  };
}

export async function getAdminBusyDaysPageData(weekMode: "current" | "next" = "next") {
  const ctx = await requireAdminContext();
  const targetWeekStart = weekMode === "current" ? getCurrentWeekStart() : getNextWeekStart();
  const busyWindow = await getBusyWindowForWeek(targetWeekStart);

  return {
    ctx,
    weekMode,
    targetWeekStart,
    busyWindow,
    stats: {
      busyRegistrations: busyWindow?.requests.length ?? 0,
    },
  };
}

export async function getAdminPairsPageData() {
  const ctx = await requireAdminContext();
  const [pairs, users] = await Promise.all([getPairsForAdmin(), getUsersForAdmin()]);

  const normalUsers = users.filter((user) => user.role === "USER");
  const unpairedUsers = normalUsers.filter((user) => user.approved && user.pairMembers.length === 0);

  return {
    ctx,
    pairs,
    unpairedUsers,
  };
}

export async function getAdminUsersPageData() {
  const ctx = await requireAdminContext();
  const users = await getUsersForAdmin();
  const normalUsers = users.filter((user) => user.role === "USER");
  const pendingUsers = normalUsers.filter((user) => !user.approved);

  return {
    ctx,
    pendingUsers,
    normalUsers,
  };
}

export async function getAdminPageData() {
  const ctx = await requireAdminContext();
  const nextWeekStart = getNextWeekStart();
  const monthStart = startOfMonth(new Date());
  const rollingStart = addMonths(monthStart, -11);
  const rollingEnd = addMonths(monthStart, 1);

  const [users, pairs, services, busyWindow, monthlyAssignments] = await Promise.all([
    getUsersForAdmin(),
    getPairsForAdmin(),
    getServicesForNextWeek(nextWeekStart),
    getBusyWindowForWeek(nextWeekStart),
    prisma.assignment.findMany({
      where: {
        service: {
          startsAt: {
            gte: rollingStart,
            lt: rollingEnd,
          },
        },
      },
      include: {
        pair: true,
        service: {
          select: {
            startsAt: true,
            points: true,
          },
        },
      },
    }),
  ]);

  const frames = Array.from({ length: 12 }).map((_, index) => {
    const date = addMonths(rollingStart, index);
    return {
      key: getMonthKey(date),
      label: formatMonthLabel(date),
      totalPoints: 0,
      totalServices: 0,
      activePairs: 0,
    };
  });

  const frameMap = new Map(frames.map((item) => [item.key, item]));
  const activePairsByMonth = new Map<string, Set<string>>();
  const topPairsMap = new Map<string, { name: string; points: number; services: number }>();
  const nextMonthStart = addMonths(monthStart, 1);

  for (const assignment of monthlyAssignments) {
    const key = getMonthKey(assignment.service.startsAt);
    const frame = frameMap.get(key);
    if (!frame) continue;
    frame.totalPoints += Number(assignment.service.points);
    frame.totalServices += 1;

    const pairSet = activePairsByMonth.get(key) ?? new Set<string>();
    pairSet.add(assignment.pairId);
    activePairsByMonth.set(key, pairSet);

    const pairStats = topPairsMap.get(assignment.pairId) ?? {
      name: assignment.pair.name,
      points: 0,
      services: 0,
    };
    pairStats.points += Number(assignment.service.points);
    pairStats.services += 1;
    topPairsMap.set(assignment.pairId, pairStats);
  }

  for (const frame of frames) {
    frame.activePairs = activePairsByMonth.get(frame.key)?.size ?? 0;
  }

  const monthlyStats = frames.map((frame) => ({
    label: frame.label,
    totalPoints: frame.totalPoints,
    totalServices: frame.totalServices,
    activePairs: frame.activePairs,
  }));

  const currentMonthLabel = formatMonthLabel(new Date());
  const currentMonthStats = monthlyStats.find((item) => item.label === currentMonthLabel) ?? {
    label: currentMonthLabel,
    totalPoints: 0,
    totalServices: 0,
    activePairs: 0,
  };

  const currentMonthTopPair = Array.from(topPairsMap.values()).reduce<{ name: string; points: number; services: number } | null>(
    (best, pair) => {
      if (!best) return pair;
      return pair.points > best.points ? pair : best;
    },
    null,
  );

  const upcomingAssignments = services.flatMap((service) =>
    service.assignments.map((assignment) => ({
      id: assignment.id,
      pairName: assignment.pair.name,
      role: assignment.role,
      serviceTitle: service.title,
      serviceType: service.type,
      startsAt: service.startsAt,
    })),
  );

  return {
    ctx,
    stats: {
      totalUsers: users.filter((user) => user.role === "USER").length,
      activePairs: pairs.filter((pair) => pair.active).length,
      servicesNextWeek: services.length,
      busyRegistrations: busyWindow?.requests.length ?? 0,
      currentMonthPoints: currentMonthStats.totalPoints,
      currentMonthServices: currentMonthStats.totalServices,
      topPairName: currentMonthTopPair?.name ?? "Chưa có cặp",
      topPairPoints: currentMonthTopPair?.points ?? 0,
    },
    monthlyStats,
    upcomingAssignments,
  };
}
