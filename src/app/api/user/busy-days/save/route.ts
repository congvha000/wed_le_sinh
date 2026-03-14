import { BusyRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseWeekStart, requireDbUser, sameDate, startOfDay } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser("USER");
  if (authResult.error) return authResult.error;

  try {
    const { pairId, weekStart, dates } = await req.json();
    const normalizedPairId = String(pairId ?? "").trim();
    const normalizedDates = Array.isArray(dates) ? Array.from(new Set(dates.map((item) => String(item)))) : [];

    if (!normalizedPairId || !weekStart) return Response.json({ error: "Thiếu thông tin cặp hoặc tuần đăng ký" }, { status: 400 });
    if (normalizedDates.length > 2) return Response.json({ error: "Mỗi cặp chỉ được đăng ký tối đa 2 ngày bận" }, { status: 400 });

    const weekStartDate = parseWeekStart(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);

    const [pairMember, busyWindow] = await Promise.all([
      prisma.pairMember.findFirst({ where: { userId: authResult.user.id, pairId: normalizedPairId } }),
      prisma.busyWindow.findUnique({ where: { weekStart: weekStartDate } }),
    ]);

    if (!pairMember) return Response.json({ error: "Bạn không thuộc cặp này" }, { status: 403 });
    if (!busyWindow || !busyWindow.isOpen) return Response.json({ error: "Đăng ký ngày bận hiện không mở" }, { status: 400 });

    const parsedDates = normalizedDates.map((item) => startOfDay(new Date(item)));
    if (parsedDates.some((date) => Number.isNaN(date.getTime()))) return Response.json({ error: "Có ngày đăng ký không hợp lệ" }, { status: 400 });
    if (parsedDates.some((date) => date < weekStartDate || date >= weekEndDate)) return Response.json({ error: "Ngày bận phải nằm trong tuần mục tiêu" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.busyDayRequest.deleteMany({ where: { busyWindowId: busyWindow.id, pairId: normalizedPairId } });

      for (const date of parsedDates.sort((a, b) => a.getTime() - b.getTime())) {
        const existingForDay = await tx.busyDayRequest.findMany({ where: { busyWindowId: busyWindow.id }, orderBy: { queueOrder: "asc" } });
        const sameDayItems = existingForDay.filter((item) => sameDate(item.busyDate, date));
        if (sameDayItems.length >= busyWindow.maxPairsPerDay) {
          throw new Error(`Ngày ${date.toLocaleDateString("vi-VN")} đã đủ số cặp bận`);
        }

        await tx.busyDayRequest.create({
          data: {
            busyWindowId: busyWindow.id,
            pairId: normalizedPairId,
            busyDate: date,
            queueOrder: sameDayItems.length + 1,
            status: BusyRequestStatus.APPROVED,
          },
        });
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể lưu ngày bận" }, { status: 400 });
  }
}
