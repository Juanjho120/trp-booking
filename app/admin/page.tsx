import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { esMessages } from "@/messages";
import { MinimalAdminShell } from "@/features/admin";

const messages = esMessages;

export const metadata: Metadata = {
  title: messages.seo.admin.title,
  description: messages.seo.admin.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await auth();
  const adminUser = session?.user;

  if (!adminUser || adminUser.role !== ADMIN_ROLE) {
    redirect("/");
  }

  return (
    <MinimalAdminShell
      adminEmail={adminUser.email ?? null}
      adminName={
        adminUser.name ?? adminUser.email ?? messages.admin.shell.fallbackUserName
      }
    />
  );
}
