import { AssignmentRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser, overlaps, sameDate } from "@/lib/api-access";
import { syncPairTotals } from "@/lib/pair-point-sync";

function canServeFourPeople(levels: string[]) {
  const sorted = [...levels].sort();
  const joined = sorted.join("|");
  return joined === "LEVEL_2|LEVEL_3" || joined === "LEVEL_3|LEVEL_3";
}

function isEligibleForAdoration(level: string) {
  return level === "LEVEL_3";
}

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const { serviceId, pairId } = await req.json();
    if (!serviceId || !pairId) return Response.json({ error: "Thiếu serviceId hoặc pairId" }, { status: 400 });

    const [service, pair] = await Promise.all([
      prisma.service.findUnique({ where: { id: String(serviceId) }, include: { assignments: { include: { pair: true } } } }),
      prisma.pair.findUnique({ where: { id: String(pairId) }, include: { members: true } }),
    ]);

    if (!service) return Response.json({ error: "Không tìm thấy buổi lễ" }, { status: 404 });
    if (!pair || !pair.active || pair.members.length < 2) return Response.json({ error: "Cặp không hợp lệ hoặc chưa đủ 2 thành viên" }, { status: 400 });
    if (service.assignments.some((assignment) => assignment.pairId === pair.id)) return Response.json({ error: "Cặp này đã được gán vào buổi lễ" }, { status: 400 });

    const pairBusyRequests = await prisma.busyDayRequest.findMany({ where: { pairId: pair.id } });
    if (pairBusyRequests.some((request) => sameDate(request.busyDate, service.startsAt))) return Response.json({ error: "Cặp đã đăng ký bận trong ngày này" }, { status: 400 });

    const pairAssignments = await prisma.assignment.findMany({
      where: { pairId: pair.id, serviceId: { not: service.id } },
      include: { service: true },
    });

    if (pairAssignments.some((assignment) => overlaps(assignment.service.startsAt, assignment.service.endsAt, service.startsAt, service.endsAt))) {
      return Response.json({ error: "Cặp đã có lịch trùng giờ với buổi này" }, { status: 400 });
    }

    if (service.type === "ADORATION") {
      if (!isEligibleForAdoration(String(pair.level))) {
        return Response.json({ error: "Chầu Thánh Thể chỉ nhận cặp LV3" }, { status: 400 });
      }

      if (service.assignments.length > 0) {
        return Response.json({ error: "Buổi chầu Thánh Thể này đã có cặp phục vụ" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.assignment.create({ data: { serviceId: service.id, pairId: pair.id, role: AssignmentRole.GENERAL } });
        await syncPairTotals(tx, [pair.id]);
      });

      return Response.json({ ok: true });
    }

    if (service.type === "FOUR_PEOPLE") {
      if (!["LEVEL_2", "LEVEL_3"].includes(String(pair.level))) return Response.json({ error: "Lễ 4 người chỉ nhận cặp LV2 hoặc LV3" }, { status: 400 });
      if (service.assignments.length >= 2) return Response.json({ error: "Buổi lễ 4 người đã đủ 2 cặp" }, { status: 400 });
      const levels = [...service.assignments.map((item) => String(item.pair.level)), String(pair.level)];
      if (levels.length === 2 && !canServeFourPeople(levels)) return Response.json({ error: "Tổ hợp 2 cặp không hợp lệ cho lễ 4 người" }, { status: 400 });

      const nextRole = service.assignments.some((item) => item.role === AssignmentRole.CANDLE) ? AssignmentRole.INCENSE : AssignmentRole.CANDLE;

      await prisma.$transaction(async (tx) => {
        await tx.assignment.create({ data: { serviceId: service.id, pairId: pair.id, role: nextRole } });
        await syncPairTotals(tx, [pair.id]);
      });

      return Response.json({ ok: true });
    }

    if (service.assignments.length > 0) return Response.json({ error: "Buổi lễ này đã có cặp phục vụ" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.assignment.create({ data: { serviceId: service.id, pairId: pair.id, role: AssignmentRole.GENERAL } });
      await syncPairTotals(tx, [pair.id]);
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể gán cặp vào buổi lễ" }, { status: 500 });
  }
}
