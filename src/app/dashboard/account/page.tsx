export const dynamic = "force-dynamic";

import WorkspaceShell from "@/components/workspace-shell";
import AccountSecurityForm from "@/components/account-security-form";
import { getUserPageData } from "@/lib/user-page-data";

export default async function DashboardAccountPage() {
  const data = await getUserPageData();

  return (
    <WorkspaceShell
      role="USER"
      subtitle="Khu vực thành viên"
      badge="Tài khoản"
      title="Bảo mật tài khoản"
      metaLabel="Tài khoản"
      metaValue={data.ctx.user.email}
    >
      <AccountSecurityForm />
    </WorkspaceShell>
  );
}
