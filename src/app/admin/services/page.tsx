export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AdminServicesPanel from "@/components/admin-services-panel";
import { getAdminServicesPageData } from "@/lib/admin-page-data";

export default async function AdminServicesPage() {
  const data = await getAdminServicesPageData();

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Xếp lịch"
      title="Quản lý buổi lễ"
      metaLabel="Buổi lễ tuần sau"
      metaValue={`${data.services.length}`}
    >
      <AdminServicesPanel
        nextWeekStart={data.nextWeekStart.toISOString()}
        services={data.services.map((service) => ({
          id: service.id,
          title: service.title,
          type: service.type,
          status: service.status,
          points: Number(service.points),
          startsAt: service.startsAt.toISOString(),
          endsAt: service.endsAt.toISOString(),
          assignments: service.assignments.map((assignment) => ({
            id: assignment.id,
            pairId: assignment.pairId,
            pairName: assignment.pair.name,
            role: assignment.role,
          })),
        }))}
        pairs={data.pairs.map((pair) => ({
          id: pair.id,
          name: pair.name,
          level: pair.level,
          active: pair.active,
          totalPoints: Number(pair.totalPoints),
          members: pair.members.map((member) => ({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            isLeader: member.isLeader,
          })),
        }))}
      />
    </WorkspaceShell>
  );
}
