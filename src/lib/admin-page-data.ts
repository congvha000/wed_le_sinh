import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/get-user-context";
import { syncPairTotals } from "@/lib/pair-point-sync";
import {
  addMonths,
  formatMonthLabel,
  getCurrentWeekStart,
  getMonthKey,
  getNextWeekEnd,
  getNextWeekStart,
  startOfMonth,
} from "@/lib/date-utils";

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

async function getServicesForWeek(weekStart: Date) {
  return prisma.service.findMany({
    where: {
      startsAt: {
        gte: weekStart,
        lt: getNextWeekEnd(weekStart),
      },
    },
    orderBy: { startsAt: "asc" },
    select: serviceSelect,
  });
}

async function getPairsForAdmin() {
  await syncPairTotals(prisma);

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

export async function getAdminServicesPageData(weekMode: "current" | "next" = "next") {
  const ctx = await requireAdminContext();
  const targetWeekStart = weekMode === "current" ? getCurrentWeekStart() : getNextWeekStart();

  const [services, pairs] = await Promise.all([getServicesForWeek(targetWeekStart), getPairsForAdmin()]);

  return {
    ctx,
    weekMode,
    targetWeekStart,
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
  const now = new Date();

  const [users, pairs, services, busyWindow, monthlyAssignments, monthlyPointTxs] = await Promise.all([
    getUsersForAdmin(),
    getPairsForAdmin(),
    getServicesForWeek(nextWeekStart),
    getBusyWindowForWeek(nextWeekStart),
    prisma.assignment.findMany({
      where: {
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
        pair: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            startsAt: true,
            points: true,
          },
        },
      },
    }),
    prisma.pointTransaction.findMany({
      where: {
        createdAt: {
          gte: rollingStart,
          lt: rollingEnd,
        },
      },
      include: {
        pair: {
          select: {
            id: true,
            name: true,
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
    const entry = frameMap.get(key);
    const points = Number(assignment.service.points);

    if (entry) {
      entry.totalPoints += points;
      entry.totalServices += 1;
      const set = activePairsByMonth.get(key) ?? new Set<string>();
      set.add(assignment.pairId);
      activePairsByMonth.set(key, set);
    }

    if (assignment.service.startsAt >= monthStart && assignment.service.startsAt < nextMonthStart) {
      const current = topPairsMap.get(assignment.pairId) ?? {
        name: assignment.pair.name,
        points: 0,
        services: 0,
      };
      current.points += points;
      current.services += 1;
      topPairsMap.set(assignment.pairId, current);
    }
  }

  for (const pointTx of monthlyPointTxs) {
    const key = getMonthKey(pointTx.createdAt);
    const entry = frameMap.get(key);
    const delta = Number(pointTx.delta);

    if (entry) {
      entry.totalPoints += delta;
    }

    if (pointTx.createdAt >= monthStart && pointTx.createdAt < nextMonthStart) {
      const current = topPairsMap.get(pointTx.pairId) ?? {
        name: pointTx.pair.name,
        points: 0,
        services: 0,
      };
      current.points += delta;
      topPairsMap.set(pointTx.pairId, current);
    }
  }

  const monthlyStats = frames.map((item) => ({
    label: item.label,
    totalPoints: Number(item.totalPoints.toFixed(2)),
    totalServices: item.totalServices,
    activePairs: activePairsByMonth.get(item.key)?.size ?? 0,
  }));

  const topPairsThisMonth = Array.from(topPairsMap.values())
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.services !== a.services) return b.services - a.services;
      return a.name.localeCompare(b.name, "vi");
    })
    .slice(0, 6)
    .map((pair) => ({
      ...pair,
      points: Number(pair.points.toFixed(2)),
    }));

  const normalUsers = users.filter((user) => user.role === "USER");
  const pendingUsers = normalUsers.filter((user) => !user.approved);
  const unpairedUsers = normalUsers.filter((user) => user.approved && user.pairMembers.length === 0);
  const assignedServices = services.filter((service) => {
    const required = service.type === "FOUR_PEOPLE" ? 2 : 1;
    return service.assignments.length >= required;
  }).length;

  return {
    ctx,
    nextWeekStart,
    services,
    pairs,
    busyWindow,
    monthlyStats,
    topPairsThisMonth,
    normalUsers,
    pendingUsers,
    unpairedUsers,
    stats: {
      totalUsers: normalUsers.length,
      pendingUsers: pendingUsers.length,
      unpairedUsers: unpairedUsers.length,
      totalPairs: pairs.length,
      totalServices: services.length,
      assignedServices,
      busyRegistrations: busyWindow?.requests.length ?? 0,
    },
  };
}
