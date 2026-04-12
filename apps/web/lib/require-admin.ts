import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) {
    redirect("/dashboard");
  }
  return session;
}
