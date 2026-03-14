import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";

const allowedLevels = new Set(["LEVEL_1", "LEVEL_2", "LEVEL_3"]);

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { name, level } = await req.json();
    const pairName = String(name ?? "").trim();
    const pairLevel = String(level ?? "LEVEL_1").trim();

    if (!pairName) return Response.json({ error: "Tên cặp không được để trống" }, { status: 400 });
    if (!allowedLevels.has(pairLevel)) return Response.json({ error: "Cấp cặp không hợp lệ" }, { status: 400 });

    const existing = await prisma.pair.findFirst({ where: { name: pairName } });
    if (existing) return Response.json({ error: "Tên cặp đã tồn tại" }, { status: 400 });

    await prisma.pair.create({ data: { name: pairName, level: pairLevel as "LEVEL_1" | "LEVEL_2" | "LEVEL_3" } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể tạo cặp" }, { status: 500 });
  }
}
