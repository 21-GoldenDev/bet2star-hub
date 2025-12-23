import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin Panel - Bet2Star",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProtectedRoute>
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto lg:ml-64 pt-16">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}
