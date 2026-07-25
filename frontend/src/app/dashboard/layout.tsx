// Path: frontend/src/app/dashboard/layout.tsx

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No navbar here — the dashboard page has its own sidebar
  return <>{children}</>;
}
