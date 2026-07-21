import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  AdminCatalogActor,
  AdminCatalogAmenity,
  AdminCatalogErrorCode,
  AdminCatalogHouseRule,
  AdminCatalogSettings,
  UpdateAdminCatalogAmenityInput,
  UpdateAdminCatalogHouseRuleInput,
} from "@/types/admin-catalogs";
import {
  amenityIconNames,
  type AmenityIconName,
} from "@/types/amenity";

import { resolveAdminActor } from "./admin-actor";

const AMENITY_NAME_MIN_LENGTH = 2;
const AMENITY_NAME_MAX_LENGTH = 160;
const HOUSE_RULE_TITLE_MIN_LENGTH = 2;
const HOUSE_RULE_TITLE_MAX_LENGTH = 160;
const HOUSE_RULE_DESCRIPTION_MIN_LENGTH = 3;
const HOUSE_RULE_DESCRIPTION_MAX_LENGTH = 500;

const amenitySelect = {
  id: true,
  key: true,
  nameEs: true,
  nameEn: true,
  icon: true,
  category: true,
  updatedAt: true,
} satisfies Prisma.AmenitySelect;

const houseRuleSelect = {
  id: true,
  key: true,
  titleEs: true,
  titleEn: true,
  descriptionEs: true,
  descriptionEn: true,
  category: true,
  updatedAt: true,
} satisfies Prisma.HouseRuleSelect;

type AmenityRecord = Prisma.AmenityGetPayload<{
  select: typeof amenitySelect;
}>;

type HouseRuleRecord = Prisma.HouseRuleGetPayload<{
  select: typeof houseRuleSelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

export class AdminCatalogError extends Error {
  constructor(public readonly code: AdminCatalogErrorCode) {
    super(code);
    this.name = "AdminCatalogError";
  }
}

function normalizeSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMultiline(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function assertTextLength(value: string, minimum: number, maximum: number): void {
  if (value.length < minimum || value.length > maximum) {
    throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
  }
}

function isAmenityIconName(value: string): value is AmenityIconName {
  return amenityIconNames.includes(value as AmenityIconName);
}

function toAmenity(amenity: AmenityRecord): AdminCatalogAmenity {
  if (!isAmenityIconName(amenity.icon)) {
    throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
  }

  return {
    ...amenity,
    icon: amenity.icon,
    updatedAt: amenity.updatedAt.toISOString(),
  };
}

function toHouseRule(houseRule: HouseRuleRecord): AdminCatalogHouseRule {
  return {
    ...houseRule,
    updatedAt: houseRule.updatedAt.toISOString(),
  };
}

export async function getAdminCatalogSettings(
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminCatalogSettings> {
  const [amenities, houseRules] = await Promise.all([
    prismaClient.amenity.findMany({
      where: { deletedAt: null },
      orderBy: { key: "asc" },
      select: amenitySelect,
    }),
    prismaClient.houseRule.findMany({
      where: { deletedAt: null },
      orderBy: { key: "asc" },
      select: houseRuleSelect,
    }),
  ]);

  return {
    amenities: amenities.map(toAmenity),
    houseRules: houseRules.map(toHouseRule),
    generatedAt: new Date().toISOString(),
  };
}

export async function updateAdminCatalogAmenity(
  input: UpdateAdminCatalogAmenityInput,
  actor: AdminCatalogActor,
): Promise<AdminCatalogSettings> {
  const nameEs = normalizeSingleLine(input.nameEs);
  const nameEn = normalizeSingleLine(input.nameEn);

  assertTextLength(nameEs, AMENITY_NAME_MIN_LENGTH, AMENITY_NAME_MAX_LENGTH);
  assertTextLength(nameEn, AMENITY_NAME_MIN_LENGTH, AMENITY_NAME_MAX_LENGTH);

  if (!isAmenityIconName(input.icon)) {
    throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
  }

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const amenity = await transaction.amenity.findFirst({
      where: {
        id: input.amenityId,
        deletedAt: null,
      },
      select: amenitySelect,
    });

    if (!amenity) {
      throw new AdminCatalogError("ADMIN_CATALOG_AMENITY_NOT_FOUND");
    }

    if (amenity.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminCatalogError("ADMIN_CATALOG_STALE");
    }

    if (
      amenity.nameEs === nameEs &&
      amenity.nameEn === nameEn &&
      amenity.icon === input.icon
    ) {
      return;
    }

    const updatedAt = new Date();
    const updateResult = await transaction.amenity.updateMany({
      where: {
        id: amenity.id,
        updatedAt: amenity.updatedAt,
        deletedAt: null,
      },
      data: {
        nameEs,
        nameEn,
        icon: input.icon,
        updatedAt,
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminCatalogError("ADMIN_CATALOG_STALE");
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "AMENITY_CONTENT_UPDATED",
        entityType: "Amenity",
        entityId: amenity.id,
        metadata: {
          actorEmail: adminActor.email,
          key: amenity.key,
          before: {
            nameEs: amenity.nameEs,
            nameEn: amenity.nameEn,
            icon: amenity.icon,
          },
          after: {
            nameEs,
            nameEn,
            icon: input.icon,
          },
        },
      },
    });
  });

  return getAdminCatalogSettings();
}

export async function updateAdminCatalogHouseRule(
  input: UpdateAdminCatalogHouseRuleInput,
  actor: AdminCatalogActor,
): Promise<AdminCatalogSettings> {
  const titleEs = normalizeSingleLine(input.titleEs);
  const titleEn = normalizeSingleLine(input.titleEn);
  const descriptionEs = normalizeMultiline(input.descriptionEs);
  const descriptionEn = normalizeMultiline(input.descriptionEn);

  assertTextLength(
    titleEs,
    HOUSE_RULE_TITLE_MIN_LENGTH,
    HOUSE_RULE_TITLE_MAX_LENGTH,
  );
  assertTextLength(
    titleEn,
    HOUSE_RULE_TITLE_MIN_LENGTH,
    HOUSE_RULE_TITLE_MAX_LENGTH,
  );
  assertTextLength(
    descriptionEs,
    HOUSE_RULE_DESCRIPTION_MIN_LENGTH,
    HOUSE_RULE_DESCRIPTION_MAX_LENGTH,
  );
  assertTextLength(
    descriptionEn,
    HOUSE_RULE_DESCRIPTION_MIN_LENGTH,
    HOUSE_RULE_DESCRIPTION_MAX_LENGTH,
  );

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const houseRule = await transaction.houseRule.findFirst({
      where: {
        id: input.houseRuleId,
        deletedAt: null,
      },
      select: houseRuleSelect,
    });

    if (!houseRule) {
      throw new AdminCatalogError("ADMIN_CATALOG_HOUSE_RULE_NOT_FOUND");
    }

    if (houseRule.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminCatalogError("ADMIN_CATALOG_STALE");
    }

    if (
      houseRule.titleEs === titleEs &&
      houseRule.titleEn === titleEn &&
      houseRule.descriptionEs === descriptionEs &&
      houseRule.descriptionEn === descriptionEn
    ) {
      return;
    }

    const updatedAt = new Date();
    const updateResult = await transaction.houseRule.updateMany({
      where: {
        id: houseRule.id,
        updatedAt: houseRule.updatedAt,
        deletedAt: null,
      },
      data: {
        titleEs,
        titleEn,
        descriptionEs,
        descriptionEn,
        updatedAt,
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminCatalogError("ADMIN_CATALOG_STALE");
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "HOUSE_RULE_CONTENT_UPDATED",
        entityType: "HouseRule",
        entityId: houseRule.id,
        metadata: {
          actorEmail: adminActor.email,
          key: houseRule.key,
          before: {
            titleEs: houseRule.titleEs,
            titleEn: houseRule.titleEn,
            descriptionEs: houseRule.descriptionEs,
            descriptionEn: houseRule.descriptionEn,
          },
          after: {
            titleEs,
            titleEn,
            descriptionEs,
            descriptionEn,
          },
        },
      },
    });
  });

  return getAdminCatalogSettings();
}
