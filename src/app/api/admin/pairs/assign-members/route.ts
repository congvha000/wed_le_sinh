import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { pairId, userIds } = await req.json();
    const normalizedUserIds = Array.isArray(userIds) ? Array.from(new Set(userIds.map((item) => String(item)))) : [];

    if (!pairId || normalizedUserIds.length !== 2) {
      return Response.json({ error: "Cần chọn đúng 1 cặp và 2 thành viên" }, { status: 400 });
    }

    const pair = await prisma.pair.findUnique({ where: { id: String(pairId) }, include: { members: true } });
    if (!pair) return Response.json({ error: "Không tìm thấy cặp" }, { status: 404 });
    if (pair.members.length > 0) {
      return Response.json({ error: "Cặp này đã có thành viên, vui lòng tạo cặp mới hoặc dọn cặp trước" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: normalizedUserIds }, role: "USER", approved: true },
      include: { pairMembers: true },
    });

    if (users.length !== 2) {
      return Response.json({ error: "Một trong hai thành viên không hợp lệ hoặc chưa được duyệt" }, { status: 400 });
    }

    if (users.some((user) => user.pairMembers.length > 0)) {
      return Response.json({ error: "Có thành viên đã thuộc một cặp khác" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.pairMember.create({ data: { pairId: pair.id, userId: normalizedUserIds[0], isLeader: true } }),
      prisma.pairMember.create({ data: { pairId: pair.id, userId: normalizedUserIds[1], isLeader: false } }),
    ]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể gán thành viên vào cặp" }, { status: 500 });
  }
}
