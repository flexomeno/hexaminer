import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { TopNav } from "@/components/layout/top-nav";

export async function TopNavWrapper() {
  const session = await getServerSession(authOptions);
  return <TopNav showAdminLink={isAdminEmail(session?.user?.email)} />;
}
