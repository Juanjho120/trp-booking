import { createHash } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  AdminAmenityCatalogItem,
  AdminAmenityHouseRuleActor,
  AdminAmenityHouseRuleErrorCode,
  AdminAmenityHouseRuleSettings,
  AdminHouseRuleCatalogItem,
  UpdateAdminAmenityContentInput,
  UpdateAdminAmenityHouseRuleAssignmentsInput,
  UpdateAdminHouseRuleContentInput,
} from "@/types/admin-amenities-house-rules";
import {
  amenityIconNames,
  type AmenityIconName,
} from "@/types/amenity";

import { resolveAdminActor } from "./admin-actor";
import { isAdminAccommodationId } from "./accommodations";

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
  properties: {
    select: {
      propertyId: true,
    },
  },
} satisfies Prisma.HouseRuleSelect;

const propertySelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  slug: true,
  status: true,
} satisfies Prisma.PropertySelect;

type AmenityRecord = Prisma.AmenityGetPayload<{
  select: typeof amenitySelect;
}>;

type HouseRuleRecord = Prisma.HouseRuleGetPayload<{
  select: typeof houseRuleSelect;
}>;

type PropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

export class AdminAmenityHouseRuleError extends Error {
  constructor(public readonly code: AdminAmenityHouseRuleErrorCode) {
    super(code);
    this.name = "AdminAmenityHouseRuleError";
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
    throw new AdminAmenityHouseRuleError(
      "INVALID_AMENITY_HOUSE_RULE_REQUEST",
    );
  }
}

function assertSupportedPropertyId(propertyId: string): void {
  if (!isAdminAccommodationId(propertyId)) {
    throw new AdminAmenityHouseRuleError(
      "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND",
    );
  }
}

function isAmenityIconName(value: string): value is AmenityIconName {
  return amenityIconNames.includes(value as AmenityIconName);
}

function toAmenity(
  amenity: AmenityRecord,
  propertyId: string,
): AdminAmenityCatalogItem {
  if (!isAmenityIconName(amenity.icon)) {
    throw new AdminAmenityHouseRuleError(
      "INVALID_AMENITY_HOUSE_RULE_REQUEST",
    );
  }

  return {
    id: amenity.id,
    key: amenity.key,
    nameEs: amenity.nameEs,
    nameEn: amenity.nameEn,
    icon: amenity.icon,
    category: amenity.category,
    assigned: amenity.properties.some(
      (assignment) => assignment.propertyId === propertyId,
    ),
    updatedAt: amenity.updatedAt.toISOString(),
  };
}

function toHouseRule(
  houseRule: HouseRuleRecord,
  propertyId: string,
): AdminHouseRuleCatalogItem {
  return {
    id: houseRule.id,
    key: houseRule.key,
    titleEs: houseRule.titleEs,
    titleEn: houseRule.titleEn,
    descriptionEs: houseRule.descriptionEs,
    descriptionEn: houseRule.descriptionEn,
    category: houseRule.category,
    assigned: houseRule.properties.some(
      (assignment) => assignment.propertyId === propertyId,
    ),
    updatedAt: houseRule.updatedAt.toISOString(),
  };
}

function getAssignmentRevision(
  amenities: readonly AdminAmenityCatalogItem[],
  houseRules: readonly AdminHouseRuleCatalogItem[],
): string {
  const payload = {
    amenityIds: amenities
      .filter((amenity) => amenity.assigned)
      .map((amenity) => amenity.id)
      .sort(),
    houseRuleIds: houseRules
      .filter((houseRule) => houseRule.assigned)
      .map((houseRule) => houseRule.id)
      .sort(),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function toSettings(
  property: PropertyRecord,
  amenityRecords: readonly AmenityRecord[],
  houseRuleRecords: readonly HouseRuleRecord[],
): AdminAmenityHouseRuleSettings {
  const amenities = [...amenityRecords]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((amenity) => toAmenity(amenity, property.id));
  const houseRules = [...houseRuleRecords]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((houseRule) => toHouseRule(houseRule, property.id));

  return {
    property,
    amenities,
    houseRules,
    revision: getAssignmentRevision(amenities, houseRules),
    generatedAt: new Date().toISOString(),
  };
}

async function findProperty(
  propertyId: string,
  prismaClient: AdminPrismaClient,
): Promise<PropertyRecord> {
  assertSupportedPropertyId(propertyId);

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertySelect,
  });

  if (!property) {
    throw new AdminAmenityHouseRuleError(
      "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND",
    );
  }

  return property;
}

async function getSettingsOrThrow(
  propertyId: string,
  prismaClient: AdminPrismaClient,
): Promise<AdminAmenityHouseRuleSettings> {
  const property = await findProperty(propertyId, prismaClient);
  const [amenities, houseRules] = await Promise.all([
    prismaClient.amenity.findMany({
      where: {
        deletedAt: null,
      },
      select: amenitySelect,
    }),
    prismaClient.houseRule.findMany({
      where: {
        deletedAt: null,
      },
      select: houseRuleSelect,
    }),
  ]);

  return toSettings(property, amenities, houseRules);
}

function assertUniqueNonEmptyIds(ids: readonly string[]): string[] {
  const normalizedIds = ids.map((id) => id.trim()).filter(Boolean);
  const uniqueIds = Array.from(new Set(normalizedIds));

  if (uniqueIds.length === 0) {
    throw new AdminAmenityHouseRuleError(
      "AMENITY_HOUSE_RULE_MINIMUM_REQUIRED",
    );
  }

  if (uniqueIds.length !== normalizedIds.length) {
    throw new AdminAmenityHouseRuleError(
      "INVALID_AMENITY_HOUSE_RULE_REQUEST",
    );
  }

  return uniqueIds;
}

export async function getAdminAmenityHouseRuleSettings(
  propertyId: string,
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminAmenityHouseRuleSettings | null> {
  if (!isAdminAccommodationId(propertyId)) {
    return null;
  }

  try {
    return await getSettingsOrThrow(propertyId, prismaClient);
  } catch (error) {
    if (
      error instanceof AdminAmenityHouseRuleError &&
      error.code === "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND"
    ) {
      return null;
    }

    throw error;
  }
}

export async function updateAdminAmenityContent(
  input: UpdateAdminAmenityContentInput,
  actor: AdminAmenityHouseRuleActor,
): Promise<AdminAmenityHouseRuleSettings> {
  assertSupportedPropertyId(input.propertyId);
  const nameEs = normalizeSingleLine(input.nameEs);
  const nameEn = normalizeSingleLine(input.nameEn);

  assertTextLength(
    nameEs,
    AMENITY_NAME_MIN_LENGTH,
    AMENITY_NAME_MAX_LENGTH,
  );
  assertTextLength(
    nameEn,
    AMENITY_NAME_MIN_LENGTH,
    AMENITY_NAME_MAX_LENGTH,
  );

  if (!isAmenityIconName(input.icon)) {
    throw new AdminAmenityHouseRuleError(
      "INVALID_AMENITY_HOUSE_RULE_REQUEST",
    );
  }

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    await findProperty(input.propertyId, transaction);
    const amenity = await transaction.amenity.findFirst({
      where: {
        id: input.amenityId,
        deletedAt: null,
      },
      select: amenitySelect,
    });

    if (!amenity) {
      throw new AdminAmenityHouseRuleError("AMENITY_NOT_FOUND");
    }

    if (amenity.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminAmenityHouseRuleError("AMENITY_HOUSE_RULE_STALE");
    }

    if (
      amenity.nameEs === nameEs &&
      amenity.nameEn === nameEn &&
      amenity.icon === input.icon
    ) {
      return;
    }

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
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminAmenityHouseRuleError("AMENITY_HOUSE_RULE_STALE");
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "AMENITY_CONTENT_UPDATED",
        entityType: "Amenity",
        entityId: amenity.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
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

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function updateAdminHouseRuleContent(
  input: UpdateAdminHouseRuleContentInput,
  actor: AdminAmenityHouseRuleActor,
): Promise<AdminAmenityHouseRuleSettings> {
  assertSupportedPropertyId(input.propertyId);
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

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    await findProperty(input.propertyId, transaction);
    const houseRule = await transaction.houseRule.findFirst({
      where: {
        id: input.houseRuleId,
        deletedAt: null,
      },
      select: houseRuleSelect,
    });

    if (!houseRule) {
      throw new AdminAmenityHouseRuleError("HOUSE_RULE_NOT_FOUND");
    }

    if (houseRule.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminAmenityHouseRuleError("AMENITY_HOUSE_RULE_STALE");
    }

    if (
      houseRule.titleEs === titleEs &&
      houseRule.titleEn === titleEn &&
      houseRule.descriptionEs === descriptionEs &&
      houseRule.descriptionEn === descriptionEn
    ) {
      return;
    }

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
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminAmenityHouseRuleError("AMENITY_HOUSE_RULE_STALE");
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "HOUSE_RULE_CONTENT_UPDATED",
        entityType: "HouseRule",
        entityId: houseRule.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
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

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function updateAdminAmenityHouseRuleAssignments(
  input: UpdateAdminAmenityHouseRuleAssignmentsInput,
  actor: AdminAmenityHouseRuleActor,
): Promise<AdminAmenityHouseRuleSettings> {
  assertSupportedPropertyId(input.propertyId);
  const amenityIds = assertUniqueNonEmptyIds(input.amenityIds);
  const houseRuleIds = assertUniqueNonEmptyIds(input.houseRuleIds);

  await prisma.$transaction(
    async (transaction: Prisma.TransactionClient) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const currentSettings = await getSettingsOrThrow(
        input.propertyId,
        transaction,
      );

      if (currentSettings.revision !== input.expectedRevision) {
        throw new AdminAmenityHouseRuleError("AMENITY_HOUSE_RULE_STALE");
      }

      const activeAmenityIds = new Set(
        currentSettings.amenities.map((amenity) => amenity.id),
      );
      const activeHouseRuleIds = new Set(
        currentSettings.houseRules.map((houseRule) => houseRule.id),
      );

      if (
        amenityIds.some((amenityId) => !activeAmenityIds.has(amenityId)) ||
        houseRuleIds.some(
          (houseRuleId) => !activeHouseRuleIds.has(houseRuleId),
        )
      ) {
        throw new AdminAmenityHouseRuleError(
          "INVALID_AMENITY_HOUSE_RULE_REQUEST",
        );
      }

      const beforeAmenityIds = currentSettings.amenities
        .filter((amenity) => amenity.assigned)
        .map((amenity) => amenity.id)
        .sort();
      const beforeHouseRuleIds = currentSettings.houseRules
        .filter((houseRule) => houseRule.assigned)
        .map((houseRule) => houseRule.id)
        .sort();
      const afterAmenityIds = [...amenityIds].sort();
      const afterHouseRuleIds = [...houseRuleIds].sort();

      if (
        JSON.stringify(beforeAmenityIds) === JSON.stringify(afterAmenityIds) &&
        JSON.stringify(beforeHouseRuleIds) ===
          JSON.stringify(afterHouseRuleIds)
      ) {
        return;
      }

      await transaction.propertyAmenity.deleteMany({
        where: {
          propertyId: input.propertyId,
          amenityId: {
            notIn: amenityIds,
          },
        },
      });
      await transaction.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          propertyId: input.propertyId,
          amenityId,
        })),
        skipDuplicates: true,
      });

      await transaction.propertyRule.deleteMany({
        where: {
          propertyId: input.propertyId,
          ruleId: {
            notIn: houseRuleIds,
          },
        },
      });
      await transaction.propertyRule.createMany({
        data: houseRuleIds.map((ruleId) => ({
          propertyId: input.propertyId,
          ruleId,
        })),
        skipDuplicates: true,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "PROPERTY_AMENITIES_RULES_UPDATED",
          entityType: "Property",
          entityId: input.propertyId,
          metadata: {
            actorEmail: adminActor.email,
            before: {
              amenityIds: beforeAmenityIds,
              houseRuleIds: beforeHouseRuleIds,
            },
            after: {
              amenityIds: afterAmenityIds,
              houseRuleIds: afterHouseRuleIds,
            },
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return getSettingsOrThrow(input.propertyId, prisma);
}
