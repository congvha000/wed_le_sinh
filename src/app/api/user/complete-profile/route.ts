import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeProfileSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = completeProfileSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        profileCompleted: true,
      },
    });

    return Response.json({ ok: true, user });
  } catch {
    return Response.json(
      { error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}