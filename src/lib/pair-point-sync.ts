import type { Prisma, PrismaClient } from "@prisma/client";

type PairPointSyncClient = Prisma.TransactionClient | PrismaClient;

export function uniquePairIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export async function syncPairTotals(client: PairPointSyncClient, pairIds?: string[]) {
  const normalizedPairIds = pairIds ? uniquePairIds(pairIds) : undefined;

  if (normalizedPairIds && normalizedPairIds.length === 0) {
    return;
  }

  const now = new Date();
  const pairs = await client.pair.findMany({
    where: normalizedPairIds ? { id: { in: normalizedPairIds } } : undefined,
    select: {
      id: true,
      totalPoints: true,
      assignments: {
        where: {
          service: {
            endsAt: {
              lte: now,
            },
          },
        },
        select: {
          service: {
            select: {
              points: true,
            },
          },
        },
      },
      pointTxs: {
        select: {
          delta: true,
        },
      },
    },
  });

  for (const pair of pairs) {
    const earnedServicePoints = pair.assignments.reduce((sum, assignment) => sum + Number(assignment.service.points), 0);
    const manualAdjustments = pair.pointTxs.reduce((sum, pointTx) => sum + Number(pointTx.delta), 0);
    const nextTotal = Number((earnedServicePoints + manualAdjustments).toFixed(2));

    if (Number(pair.totalPoints) === nextTotal) {
      continue;
    }

    await client.pair.update({
      where: { id: pair.id },
      data: { totalPoints: nextTotal },
    });
  }
}
