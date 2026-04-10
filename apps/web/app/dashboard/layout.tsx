import { TopNav } from "@/components/layout/top-nav";
import { DashboardSubNav } from "@/components/dashboard/dashboard-sub-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 md:px-8">
        <DashboardSubNav />
        {children}
      </div>
    </div>
  );
}
