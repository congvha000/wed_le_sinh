import { ReactNode } from "react";
import AppMenu from "@/components/app-menu";
import LogoutButton from "@/components/logout-button";

type Props = {
  role: "ADMIN" | "USER";
  title: string;
  badge?: string;
  subtitle: string;
  metaLabel: string;
  metaValue: string;
  children: ReactNode;
};

export default function WorkspaceShell({
  role,
  title,
  badge,
  subtitle,
  metaLabel,
  metaValue,
  children,
}: Props) {
  const hasBadge = Boolean(badge?.trim());

  return (
    <main className="page-shell admin-shell">
      <AppMenu role={role} title="Quản lý lễ sinh" subtitle={subtitle} />

      <div className="container stack-lg page-section">
        <section className="hero-banner workspace-hero">
          <div className="workspace-hero-copy">
            {hasBadge ? <span className="badge badge-success">{badge}</span> : null}
            <h1 className="workspace-title">{title}</h1>
          </div>

          <div className="workspace-hero-actions">
            <div className="mini-stat-card workspace-meta-card">
              <div className="mini-stat-label">{metaLabel}</div>
              <div className="mini-stat-value text-truncate">{metaValue}</div>
            </div>
            <LogoutButton />
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
