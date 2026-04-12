import { TopNavWrapper } from "@/components/layout/top-nav-wrapper";
import { DashboardSubNav } from "@/components/dashboard/dashboard-sub-nav";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavWrapper />
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 md:px-8">
        <DashboardSubNav />
        {children}
      </div>
    </div>
  );
}
