import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { parseServiceMutationPayload } from "@/lib/service-mutation";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const parsed = parseServiceMutationPayload(await req.json());

    if (parsed.ok === false) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const { title, type, startsAt, endsAt, points, status, isSundayAM, isSaturdayPM } = parsed.data;

    await prisma.service.create({
      data: {
        title,
        type,
        startsAt,
        endsAt,
        points,
        status,
        isSundayAM,
        isSaturdayPM,
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể tạo buổi lễ" }, { status: 500 });
  }
}
