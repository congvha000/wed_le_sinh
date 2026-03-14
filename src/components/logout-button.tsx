"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      className="button-secondary"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Đăng xuất
    </button>
  );
}
