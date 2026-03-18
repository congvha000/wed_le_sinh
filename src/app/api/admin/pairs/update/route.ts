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

    const nextName = parsed.data.name?.trim();
    const nextLevel = parsed.data.level;
    const pointDelta = typeof parsed.data.pointDelta === "number" && parsed.data.pointDelta !== 0 ? parsed.data.pointDelta : undefined;
    const reason = parsed.data.reason?.trim();

    if (!nextName && !nextLevel && typeof pointDelta !== "number") {
      return Response.json({ error: "Bạn chưa thay đổi dữ liệu nào" }, { status: 400 });
    }

    const pair = await prisma.pair.findUnique({
      where: { id: parsed.data.pairId },
      select: { id: true, name: true, level: true },
    });

    if (!pair) {
      return Response.json({ error: "Không tìm thấy cặp" }, { status: 404 });
    }

    if (nextName && nextName !== pair.name) {
      const existing = await prisma.pair.findFirst({
        where: {
          name: nextName,
          id: { not: pair.id },
        },
        select: { id: true },
      });

      if (existing) {
        return Response.json({ error: "Tên cặp đã tồn tại" }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (nextName || nextLevel) {
        await tx.pair.update({
          where: { id: pair.id },
          data: {
            ...(nextName ? { name: nextName } : {}),
            ...(nextLevel ? { level: nextLevel } : {}),
          },
        });
      }

      if (typeof pointDelta === "number") {
        await tx.pointTransaction.create({
          data: {
            pairId: pair.id,
            delta: pointDelta,
            reason: reason || "Điều chỉnh thủ công bởi admin",
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
