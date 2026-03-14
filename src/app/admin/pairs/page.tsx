export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AdminPairsPanel from "@/components/admin-pairs-panel";
import { getAdminPairsPageData } from "@/lib/admin-page-data";

export default async function AdminPairsPage() {
  const data = await getAdminPairsPageData();

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Cặp lễ sinh"
      title="Tạo cặp và ghép thành viên"
      metaLabel="Chưa có cặp"
      metaValue={`${data.unpairedUsers.length} thành viên`}
    >
      <AdminPairsPanel
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
        unpairedUsers={data.unpairedUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
        }))}
      />
    </WorkspaceShell>
  );
}
