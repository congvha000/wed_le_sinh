"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type AppMenuProps = {
  role: "ADMIN" | "USER";
  title?: string;
  subtitle?: string;
};

type MenuItem = {
  href: string;
  label: string;
  description?: string;
};

export default function AppMenu({
  role,
  title = "Quản lý lễ sinh",
  subtitle = "Hệ thống điều phối",
}: AppMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = useMemo<MenuItem[]>(() => {
    if (role === "ADMIN") {
      return [
        { href: "/admin", label: "Tổng quan", description: "Nhìn nhanh tình hình tuần sau" },
        { href: "/admin/stats", label: "Thống kê điểm", description: "Điểm và xếp hạng theo tháng" },
        { href: "/admin/users", label: "Thành viên", description: "Duyệt và quản lý tài khoản" },
        { href: "/admin/pairs", label: "Cặp lễ sinh", description: "Tạo cặp và ghép thành viên" },
        { href: "/admin/busy-days", label: "Ngày bận", description: "Mở đăng ký và xem danh sách" },
        { href: "/admin/services", label: "Xếp lịch", description: "Tạo lịch và tự xếp AI" },
      ];
    }

    return [
      { href: "/dashboard", label: "Tổng quan", description: "Tóm tắt cặp và lịch của bạn" },
      { href: "/dashboard/schedule", label: "Lịch của tôi", description: "Xem các buổi đã phân công" },
      { href: "/dashboard/busy-days", label: "Ngày bận", description: "Đăng ký ngày bận tuần sau" },
      { href: "/dashboard/stats", label: "Thống kê điểm", description: "Theo dõi điểm theo tháng" },
      { href: "/dashboard/profile", label: "Thông tin", description: "Thông tin thành viên và cặp" },
      { href: "/dashboard/account", label: "Tài khoản", description: "Đổi mật khẩu và bảo mật" },
    ];
  }, [role]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="brand-block brand-link">
          <div className="brand-mark">LS</div>
          <div>
            <div className="brand-title">{title}</div>
            <div className="brand-subtitle">{subtitle}</div>
          </div>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          {open ? "✕" : "☰"}
        </button>

        <nav className={`nav-menu ${open ? "is-open" : ""}`}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
              {item.description ? <small>{item.description}</small> : null}
            </Link>
          ))}
        </nav>
      </div>

      {open ? <button type="button" className="menu-backdrop" onClick={() => setOpen(false)} /> : null}
    </header>
  );
}
