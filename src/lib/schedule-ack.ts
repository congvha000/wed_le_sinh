import type { Prisma, PrismaClient } from "@prisma/client";
import { getCurrentWeekStart } from "@/lib/date-utils";

export type ScheduleAckClient = Prisma.TransactionClient | PrismaClient;

export function resolveScheduleWeekStart(value: Date | string) {
  return getCurrentWeekStart(value instanceof Date ? value : new Date(value));
}

export async function invalidateScheduleAcksForWeek(client: ScheduleAckClient, weekStart: Date) {
  await client.scheduleAck.deleteMany({
    where: {
      weekStart,
    },
  });
}

export async function invalidateScheduleAcksForPairs(
  client: ScheduleAckClient,
  pairIds: Array<string | null | undefined>,
  weekStart: Date,
) {
  const normalizedPairIds = Array.from(new Set(pairIds.filter((value): value is string => Boolean(value))));

  if (normalizedPairIds.length === 0) {
    return;
  }

  const pairMembers = await client.pairMember.findMany({
    where: {
      pairId: {
        in: normalizedPairIds,
      },
    },
    select: {
      userId: true,
    },
  });

  const userIds = Array.from(new Set(pairMembers.map((item) => item.userId)));

  if (userIds.length === 0) {
    return;
  }

  await client.scheduleAck.deleteMany({
    where: {
      weekStart,
      userId: {
        in: userIds,
      },
    },
  });
}
