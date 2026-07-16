import { auth } from "@/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import type { AdminActor } from "@/types/admin";

export async function getAdminSessionActor(): Promise<AdminActor | null> {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role !== ADMIN_ROLE || !user.email) {
    return null;
  }

  return {
    email: user.email,
    name: user.name,
  };
}
