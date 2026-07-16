import { UserRole, type Prisma, type PrismaClient } from "@prisma/client";

import { normalizeAdminEmail } from "@/lib/auth/admin-access";
import type { AdminActor } from "@/types/admin";

type AdminActorPrismaClient = PrismaClient | Prisma.TransactionClient;

export async function resolveAdminActor(
  prismaClient: AdminActorPrismaClient,
  actor: AdminActor,
) {
  const email = normalizeAdminEmail(actor.email);

  if (!email) {
    throw new Error("ADMIN_UNAUTHORIZED");
  }

  return prismaClient.user.upsert({
    where: {
      email,
    },
    update: {
      name: actor.name?.trim() || undefined,
      role: UserRole.ADMIN,
    },
    create: {
      email,
      name: actor.name?.trim() || null,
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
