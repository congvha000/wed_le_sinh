export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AdminUsersPanel from "@/components/admin-users-panel";
import { getAdminUsersPageData } from "@/lib/admin-page-data";

export default async function AdminUsersPage() {
  const data = await getAdminUsersPageData();

  return (
    <WorkspaceShell
      role="ADMIN"
      subtitle="Khu vực quản trị"
      badge="Thành viên"
      title="Quản lý thành viên"
      metaLabel="Tài khoản chờ duyệt"
      metaValue={`${data.pendingUsers.length}`}
    >
      <AdminUsersPanel
        pendingUsers={data.pendingUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          profileCompleted: user.profileCompleted,
          createdAt: user.createdAt.toISOString(),
        }))}
        allUsers={data.normalUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          approved: user.approved,
          profileCompleted: user.profileCompleted,
          pairName: user.pairMembers[0]?.pair?.name ?? null,
        }))}
      />
    </WorkspaceShell>
  );
}
