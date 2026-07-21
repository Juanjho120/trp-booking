import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  AdminCatalogActor,
  AdminCatalogAmenity,
  AdminCatalogErrorCode,
  AdminCatalogHouseRule,
  AdminCatalogSettings,
  CreateAdminCatalogAmenityInput,
  CreateAdminCatalogHouseRuleInput,
  DeleteAdminCatalogAmenityInput,
  DeleteAdminCatalogHouseRuleInput,
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
const CATALOG_KEY_MAX_LENGTH = 80;
const CATALOG_KEY_SUFFIX_LIMIT = 10_000;

const amenitySelect = {
  id: true,
  key: true,
  nameEs: true,
  nameEn: true,
  icon: true,
  category: true,
  updatedAt: true,
} satisfies Prisma.AmenitySelect;

const amenityDeleteSelect = {
  ...amenitySelect,
  properties: {
    select: {
      propertyId: true,
    },
  },
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

const houseRuleDeleteSelect = {
  ...houseRuleSelect,
  properties: {
    select: {
      propertyId: true,
    },
  },
} satisfies Prisma.HouseRuleSelect;

type AmenityRecord = Prisma.AmenityGetPayload<{
  select: typeof amenitySelect;
}>;

type AmenityDeleteRecord = Prisma.AmenityGetPayload<{
  select: typeof amenityDeleteSelect;
}>;

type HouseRuleRecord = Prisma.HouseRuleGetPayload<{
  select: typeof houseRuleSelect;
}>;

type HouseRuleDeleteRecord = Prisma.HouseRuleGetPayload<{
  select: typeof houseRuleDeleteSelect;
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
    id: amenity.id,
    key: amenity.key,
    nameEs: amenity.nameEs,
    nameEn: amenity.nameEn,
    icon: amenity.icon,
    category: amenity.category,
    updatedAt: amenity.updatedAt.toISOString(),
  };
}

function toHouseRule(houseRule: HouseRuleRecord): AdminCatalogHouseRule {
  return {
    id: houseRule.id,
    key: houseRule.key,
    titleEs: houseRule.titleEs,
    titleEn: houseRule.titleEn,
    descriptionEs: houseRule.descriptionEs,
    descriptionEn: houseRule.descriptionEn,
    category: houseRule.category,
    updatedAt: houseRule.updatedAt.toISOString(),
  };
}

function buildBaseCatalogKey(value: string): string {
  const key = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATALOG_KEY_MAX_LENGTH)
    .replace(/-+$/g, "");

  if (key.length < 2) {
    throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
  }

  return key;
}

async function getAvailableAmenityKey(
  baseKey: string,
  transaction: Prisma.TransactionClient,
): Promise<string> {
  const records = await transaction.amenity.findMany({
    where: {
      OR: [
        { key: baseKey },
        { key: { startsWith: `${baseKey}-` } },
      ],
    },
    select: { key: true },
  });
  const keys = new Set(records.map((record) => record.key));

  if (!keys.has(baseKey)) {
    return baseKey;
  }

  for (let suffix = 2; suffix <= CATALOG_KEY_SUFFIX_LIMIT; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${baseKey.slice(
      0,
      CATALOG_KEY_MAX_LENGTH - suffixText.length,
    )}${suffixText}`;

    if (!keys.has(candidate)) {
      return candidate;
    }
  }

  throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
}

async function getAvailableHouseRuleKey(
  baseKey: string,
  transaction: Prisma.TransactionClient,
): Promise<string> {
  const records = await transaction.houseRule.findMany({
    where: {
      OR: [
        { key: baseKey },
        { key: { startsWith: `${baseKey}-` } },
      ],
    },
    select: { key: true },
  });
  const keys = new Set(records.map((record) => record.key));

  if (!keys.has(baseKey)) {
    return baseKey;
  }

  for (let suffix = 2; suffix <= CATALOG_KEY_SUFFIX_LIMIT; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${baseKey.slice(
      0,
      CATALOG_KEY_MAX_LENGTH - suffixText.length,
    )}${suffixText}`;

    if (!keys.has(candidate)) {
      return candidate;
    }
  }

  throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
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

export async function createAdminCatalogAmenity(
  input: CreateAdminCatalogAmenityInput,
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
    const key = await getAvailableAmenityKey(
      buildBaseCatalogKey(nameEn),
      transaction,
    );
    const amenity = await transaction.amenity.create({
      data: {
        key,
        nameEs,
        nameEn,
        icon: input.icon,
        category: null,
      },
      select: amenitySelect,
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "AMENITY_CREATED",
        entityType: "Amenity",
        entityId: amenity.id,
        metadata: {
          actorEmail: adminActor.email,
          key,
          nameEs,
          nameEn,
          icon: input.icon,
          initiallyAssignedPropertyIds: [],
        },
      },
    });
  });

  return getAdminCatalogSettings();
}

export async function createAdminCatalogHouseRule(
  input: CreateAdminCatalogHouseRuleInput,
  actor: AdminCatalogActor,
): Promise<AdminCatalogSettings> {
  const titleEs = normalizeSingleLine(input.titleEs);
  const titleEn = normalizeSingleLine(input.titleEn);
  const descriptionEs = normalizeMultiline(input.descriptionEs);
  const descriptionEn = normalizeMultiline(input.descriptionEn);

  assertTextLength(titleEs, HOUSE_RULE_TITLE_MIN_LENGTH, HOUSE_RULE_TITLE_MAX_LENGTH);
  assertTextLength(titleEn, HOUSE_RULE_TITLE_MIN_LENGTH, HOUSE_RULE_TITLE_MAX_LENGTH);
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
    const key = await getAvailableHouseRuleKey(
      buildBaseCatalogKey(titleEn),
      transaction,
    );
    const houseRule = await transaction.houseRule.create({
      data: {
        key,
        titleEs,
        titleEn,
        descriptionEs,
        descriptionEn,
        category: null,
      },
      select: houseRuleSelect,
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "HOUSE_RULE_CREATED",
        entityType: "HouseRule",
        entityId: houseRule.id,
        metadata: {
          actorEmail: adminActor.email,
          key,
          titleEs,
          titleEn,
          descriptionEs,
          descriptionEn,
          initiallyAssignedPropertyIds: [],
        },
      },
    });
  });

  return getAdminCatalogSettings();
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

  assertTextLength(titleEs, HOUSE_RULE_TITLE_MIN_LENGTH, HOUSE_RULE_TITLE_MAX_LENGTH);
  assertTextLength(titleEn, HOUSE_RULE_TITLE_MIN_LENGTH, HOUSE_RULE_TITLE_MAX_LENGTH);
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

async function assertAmenityDeletionKeepsMinimumAssignments(
  amenity: AmenityDeleteRecord,
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const assignment of amenity.properties) {
    const remainingCount = await transaction.propertyAmenity.count({
      where: {
        propertyId: assignment.propertyId,
        amenityId: { not: amenity.id },
        amenity: { deletedAt: null },
      },
    });

    if (remainingCount === 0) {
      throw new AdminCatalogError(
        "ADMIN_CATALOG_MINIMUM_ASSIGNMENT_REQUIRED",
      );
    }
  }
}

async function assertHouseRuleDeletionKeepsMinimumAssignments(
  houseRule: HouseRuleDeleteRecord,
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const assignment of houseRule.properties) {
    const remainingCount = await transaction.propertyRule.count({
      where: {
        propertyId: assignment.propertyId,
        ruleId: { not: houseRule.id },
        rule: { deletedAt: null },
      },
    });

    if (remainingCount === 0) {
      throw new AdminCatalogError(
        "ADMIN_CATALOG_MINIMUM_ASSIGNMENT_REQUIRED",
      );
    }
  }
}

export async function softDeleteAdminCatalogAmenity(
  input: DeleteAdminCatalogAmenityInput,
  actor: AdminCatalogActor,
): Promise<AdminCatalogSettings> {
  await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const amenity = await transaction.amenity.findFirst({
        where: {
          id: input.amenityId,
          deletedAt: null,
        },
        select: amenityDeleteSelect,
      });

      if (!amenity) {
        throw new AdminCatalogError("ADMIN_CATALOG_AMENITY_NOT_FOUND");
      }

      if (amenity.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new AdminCatalogError("ADMIN_CATALOG_STALE");
      }

      await assertAmenityDeletionKeepsMinimumAssignments(amenity, transaction);

      const assignedPropertyIds = amenity.properties
        .map((assignment) => assignment.propertyId)
        .sort();
      const deletedAt = new Date();

      await transaction.propertyAmenity.deleteMany({
        where: { amenityId: amenity.id },
      });

      const updateResult = await transaction.amenity.updateMany({
        where: {
          id: amenity.id,
          updatedAt: amenity.updatedAt,
          deletedAt: null,
        },
        data: {
          deletedAt,
          deletedById: adminActor.id,
          updatedAt: deletedAt,
        },
      });

      if (updateResult.count !== 1) {
        throw new AdminCatalogError("ADMIN_CATALOG_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "AMENITY_SOFT_DELETED",
          entityType: "Amenity",
          entityId: amenity.id,
          metadata: {
            actorEmail: adminActor.email,
            key: amenity.key,
            nameEs: amenity.nameEs,
            nameEn: amenity.nameEn,
            icon: amenity.icon,
            removedPropertyIds: assignedPropertyIds,
            deletedAt: deletedAt.toISOString(),
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return getAdminCatalogSettings();
}

export async function softDeleteAdminCatalogHouseRule(
  input: DeleteAdminCatalogHouseRuleInput,
  actor: AdminCatalogActor,
): Promise<AdminCatalogSettings> {
  await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const houseRule = await transaction.houseRule.findFirst({
        where: {
          id: input.houseRuleId,
          deletedAt: null,
        },
        select: houseRuleDeleteSelect,
      });

      if (!houseRule) {
        throw new AdminCatalogError("ADMIN_CATALOG_HOUSE_RULE_NOT_FOUND");
      }

      if (houseRule.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new AdminCatalogError("ADMIN_CATALOG_STALE");
      }

      await assertHouseRuleDeletionKeepsMinimumAssignments(
        houseRule,
        transaction,
      );

      const assignedPropertyIds = houseRule.properties
        .map((assignment) => assignment.propertyId)
        .sort();
      const deletedAt = new Date();

      await transaction.propertyRule.deleteMany({
        where: { ruleId: houseRule.id },
      });

      const updateResult = await transaction.houseRule.updateMany({
        where: {
          id: houseRule.id,
          updatedAt: houseRule.updatedAt,
          deletedAt: null,
        },
        data: {
          deletedAt,
          deletedById: adminActor.id,
          updatedAt: deletedAt,
        },
      });

      if (updateResult.count !== 1) {
        throw new AdminCatalogError("ADMIN_CATALOG_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "HOUSE_RULE_SOFT_DELETED",
          entityType: "HouseRule",
          entityId: houseRule.id,
          metadata: {
            actorEmail: adminActor.email,
            key: houseRule.key,
            titleEs: houseRule.titleEs,
            titleEn: houseRule.titleEn,
            removedPropertyIds: assignedPropertyIds,
            deletedAt: deletedAt.toISOString(),
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return getAdminCatalogSettings();
}
