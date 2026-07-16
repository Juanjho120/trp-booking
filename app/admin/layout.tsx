import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AdminShell } from "@/features/admin";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { esMessages } from "@/messages";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();
  const adminUser = session?.user;

  if (!adminUser || adminUser.role !== ADMIN_ROLE) {
    redirect("/");
  }

  return (
    <AdminShell
      adminEmail={adminUser.email ?? null}
      adminName={
        adminUser.name ??
        adminUser.email ??
        esMessages.admin.navigation.fallbackUserName
      }
    >
      {children}
    </AdminShell>
  );
}
