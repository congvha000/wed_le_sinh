import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { updatePairSchema } from "@/lib/validators";
import { syncPairTotals } from "@/lib/pair-point-sync";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const parsed = updatePairSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const pair = await prisma.pair.findUnique({
      where: { id: parsed.data.pairId },
      select: { id: true },
    });

    if (!pair) {
      return Response.json({ error: "Không tìm thấy cặp" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.level) {
        await tx.pair.update({
          where: { id: pair.id },
          data: { level: parsed.data.level },
        });
      }

      if (typeof parsed.data.pointDelta === "number") {
        await tx.pointTransaction.create({
          data: {
            pairId: pair.id,
            delta: parsed.data.pointDelta,
            reason: parsed.data.reason || "Điều chỉnh thủ công bởi admin",
          },
        });
      }

      await syncPairTotals(tx, [pair.id]);

      return tx.pair.findUnique({
        where: { id: pair.id },
      });
    });

    return Response.json({ ok: true, pair: updated });
  } catch {
    return Response.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
