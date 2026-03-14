import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/get-user-context";

export default async function HomePage() {
  const ctx = await getUserContext();

  redirect(ctx.user ? ctx.nextPath : "/login");
}
