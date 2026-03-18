import { BusyRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseWeekStart, requireDbUser, sameDate, startOfDay } from "@/lib/api-access";
import { addDays, formatDateLabel } from "@/lib/date-utils";

export async function POST(req: Request) {
  const authResult = await requireDbUser("USER");
  if (authResult.error) return authResult.error;

  try {
    const { pairId, weekStart, date } = await req.json();
    const normalizedPairId = String(pairId ?? "").trim();
    const normalizedDate = String(date ?? "").trim();

    if (!normalizedPairId || !weekStart) {
      return Response.json({ error: "Thiếu thông tin cặp hoặc tuần đăng ký" }, { status: 400 });
    }

    const weekStartDate = parseWeekStart(weekStart);
    const weekEndDate = addDays(weekStartDate, 7);

    const selectedDate = normalizedDate ? startOfDay(normalizedDate) : null;
    if (selectedDate && Number.isNaN(selectedDate.getTime())) {
      return Response.json({ error: "Ngày đăng ký không hợp lệ" }, { status: 400 });
    }
    if (selectedDate && (selectedDate < weekStartDate || selectedDate >= weekEndDate)) {
      return Response.json({ error: "Ngày bận phải nằm trong tuần mục tiêu" }, { status: 400 });
    }

    const [pairMember, busyWindow] = await Promise.all([
      prisma.pairMember.findFirst({ where: { userId: authResult.user.id, pairId: normalizedPairId } }),
      prisma.busyWindow.findUnique({ where: { weekStart: weekStartDate } }),
    ]);

    if (!pairMember) return Response.json({ error: "Bạn không thuộc cặp này" }, { status: 403 });
    if (!busyWindow || !busyWindow.isOpen) {
      return Response.json({ error: "Đăng ký ngày bận hiện không mở" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.busyDayRequest.deleteMany({
        where: {
          busyWindowId: busyWindow.id,
          pairId: normalizedPairId,
          userId: null,
        } as any,
      });

      const pairRequests = (await tx.busyDayRequest.findMany({
        where: {
          busyWindowId: busyWindow.id,
          pairId: normalizedPairId,
        },
        orderBy: [{ busyDate: "asc" }, { queueOrder: "asc" }],
      })) as Array<any>;

      const currentRequest = pairRequests.find((item) => item.userId === authResult.user.id) ?? null;
      const partnerRequest = pairRequests.find((item) => item.userId && item.userId !== authResult.user.id) ?? null;

      if (!selectedDate) {
        if (currentRequest) {
          await tx.busyDayRequest.delete({ where: { id: currentRequest.id } });
        }
        return;
      }

      if (partnerRequest && sameDate(partnerRequest.busyDate, selectedDate)) {
        throw new Error("Người cùng cặp đã chọn ngày này. Mỗi người cần chọn 1 ngày khác nhau.");
      }

      if (currentRequest && sameDate(currentRequest.busyDate, selectedDate)) {
        return;
      }

      if (currentRequest) {
        await tx.busyDayRequest.delete({ where: { id: currentRequest.id } });
      }

      const existingForDay = await tx.busyDayRequest.findMany({
        where: { busyWindowId: busyWindow.id },
        orderBy: { queueOrder: "asc" },
      });
      const sameDayItems = existingForDay.filter((item) => sameDate(item.busyDate, selectedDate));

      if (sameDayItems.length >= busyWindow.maxPairsPerDay) {
        throw new Error(`Ngày ${formatDateLabel(selectedDate)} đã đủ ${busyWindow.maxPairsPerDay} cặp bận`);
      }

      const nextQueueOrder = sameDayItems.reduce((max, item) => Math.max(max, item.queueOrder), 0) + 1;

      await tx.busyDayRequest.create({
        data: {
          busyWindowId: busyWindow.id,
          pairId: normalizedPairId,
          userId: authResult.user.id,
          busyDate: selectedDate,
          queueOrder: nextQueueOrder,
          status: BusyRequestStatus.APPROVED,
        } as any,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể lưu ngày bận" }, { status: 400 });
  }
}
