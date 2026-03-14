import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { userId } = await req.json();
    if (!userId) return Response.json({ error: "Thiếu userId" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user || user.role !== "USER") {
      return Response.json({ error: "Không tìm thấy thành viên" }, { status: 404 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { approved: true } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể duyệt tài khoản" }, { status: 500 });
  }
}
