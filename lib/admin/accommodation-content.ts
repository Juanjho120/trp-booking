import type { Prisma, PrismaClient } from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import {
  adminAccommodationIds,
  isAdminAccommodationId,
} from "@/lib/admin/accommodations";
import { prisma } from "@/lib/db/prisma";
import { normalizePropertyTimeValue } from "@/lib/time/property-time";
import type {
  AdminAccommodationContentActor,
  AdminAccommodationContentErrorCode,
  AdminAccommodationContentProperty,
  AdminAccommodationContentSettings,
  UpdateAdminAccommodationContentInput,
} from "@/types/admin-accommodation-content";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;
const SHORT_DESCRIPTION_MIN_LENGTH = 20;
const SHORT_DESCRIPTION_MAX_LENGTH = 500;
const LONG_DESCRIPTION_MIN_LENGTH = 50;
const LONG_DESCRIPTION_MAX_LENGTH = 5000;
const MAX_CAPACITY_VALUE = 20;

const accommodationContentSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  slug: true,
  shortDescriptionEs: true,
  shortDescriptionEn: true,
  longDescriptionEs: true,
  longDescriptionEn: true,
  maxGuests: true,
  bedrooms: true,
  bathrooms: true,
  baseNightlyPrice: true,
  currency: true,
  status: true,
  checkInTime: true,
  checkOutTime: true,
  isComposed: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

type AccommodationContentRecord = Prisma.PropertyGetPayload<{
  select: typeof accommodationContentSelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

type MutableContent = Readonly<{
  nameEs: string;
  nameEn: string;
  shortDescriptionEs: string;
  shortDescriptionEn: string;
  longDescriptionEs: string;
  longDescriptionEn: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string | null;
}>;

type MutableContentField = keyof MutableContent;

const mutableContentFields = [
  "nameEs",
  "nameEn",
  "shortDescriptionEs",
  "shortDescriptionEn",
  "longDescriptionEs",
  "longDescriptionEn",
  "maxGuests",
  "bedrooms",
  "bathrooms",
  "checkInTime",
  "checkOutTime",
] as const satisfies readonly MutableContentField[];

export class AdminAccommodationContentError extends Error {
  constructor(public readonly code: AdminAccommodationContentErrorCode) {
    super(code);
    this.name = "AdminAccommodationContentError";
  }
}

function toContentProperty(
  property: AccommodationContentRecord,
): AdminAccommodationContentProperty {
  return {
    id: property.id,
    nameEs: property.nameEs,
    nameEn: property.nameEn,
    slug: property.slug,
    shortDescriptionEs: property.shortDescriptionEs,
    shortDescriptionEn: property.shortDescriptionEn,
    longDescriptionEs: property.longDescriptionEs,
    longDescriptionEn: property.longDescriptionEn,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    baseNightlyPrice: property.baseNightlyPrice.toFixed(2),
    currency: property.currency,
    status: property.status,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    isComposed: property.isComposed,
    updatedAt: property.updatedAt.toISOString(),
  };
}

function normalizeSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMultiline(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function assertTextLength(value: string, minimum: number, maximum: number): void {
  if (value.length < minimum || value.length > maximum) {
    throw new AdminAccommodationContentError(
      "INVALID_ACCOMMODATION_CONTENT_REQUEST",
    );
  }
}

function assertCapacity(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > MAX_CAPACITY_VALUE) {
    throw new AdminAccommodationContentError(
      "INVALID_ACCOMMODATION_CONTENT_REQUEST",
    );
  }
}

function normalizeRequiredTime(value: string): string {
  const normalized = normalizePropertyTimeValue(value);

  if (!normalized) {
    throw new AdminAccommodationContentError(
      "INVALID_ACCOMMODATION_CONTENT_REQUEST",
    );
  }

  return normalized;
}

function normalizeOptionalTime(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  return normalizeRequiredTime(value);
}

function normalizeInput(input: UpdateAdminAccommodationContentInput): MutableContent {
  const content = {
    nameEs: normalizeSingleLine(input.nameEs),
    nameEn: normalizeSingleLine(input.nameEn),
    shortDescriptionEs: normalizeMultiline(input.shortDescriptionEs),
    shortDescriptionEn: normalizeMultiline(input.shortDescriptionEn),
    longDescriptionEs: normalizeMultiline(input.longDescriptionEs),
    longDescriptionEn: normalizeMultiline(input.longDescriptionEn),
    maxGuests: input.maxGuests,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    checkInTime: normalizeRequiredTime(input.checkInTime),
    checkOutTime: normalizeOptionalTime(input.checkOutTime),
  } satisfies MutableContent;

  assertTextLength(content.nameEs, NAME_MIN_LENGTH, NAME_MAX_LENGTH);
  assertTextLength(content.nameEn, NAME_MIN_LENGTH, NAME_MAX_LENGTH);
  assertTextLength(
    content.shortDescriptionEs,
    SHORT_DESCRIPTION_MIN_LENGTH,
    SHORT_DESCRIPTION_MAX_LENGTH,
  );
  assertTextLength(
    content.shortDescriptionEn,
    SHORT_DESCRIPTION_MIN_LENGTH,
    SHORT_DESCRIPTION_MAX_LENGTH,
  );
  assertTextLength(
    content.longDescriptionEs,
    LONG_DESCRIPTION_MIN_LENGTH,
    LONG_DESCRIPTION_MAX_LENGTH,
  );
  assertTextLength(
    content.longDescriptionEn,
    LONG_DESCRIPTION_MIN_LENGTH,
    LONG_DESCRIPTION_MAX_LENGTH,
  );
  assertCapacity(content.maxGuests);
  assertCapacity(content.bedrooms);
  assertCapacity(content.bathrooms);

  return content;
}

function toMutableContent(property: AccommodationContentRecord): MutableContent {
  return {
    nameEs: property.nameEs,
    nameEn: property.nameEn,
    shortDescriptionEs: property.shortDescriptionEs,
    shortDescriptionEn: property.shortDescriptionEn,
    longDescriptionEs: property.longDescriptionEs,
    longDescriptionEn: property.longDescriptionEn,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
  };
}

function getChangedFields(
  before: MutableContent,
  after: MutableContent,
): MutableContentField[] {
  return mutableContentFields.filter((field) => before[field] !== after[field]);
}

function pickChangedValues(
  content: MutableContent,
  changedFields: readonly MutableContentField[],
): Record<string, string | number | null> {
  return Object.fromEntries(
    changedFields.map((field) => [field, content[field]]),
  );
}

function sortProperties(
  properties: readonly AccommodationContentRecord[],
): AccommodationContentRecord[] {
  const order = new Map<string, number>(
    adminAccommodationIds.map((propertyId, index) => [propertyId, index]),
  );

  return [...properties].sort(
    (left, right) =>
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function getAdminAccommodationContentSettings(
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminAccommodationContentSettings> {
  const properties = await prismaClient.property.findMany({
    where: {
      id: {
        in: [...adminAccommodationIds],
      },
      deletedAt: null,
    },
    select: accommodationContentSelect,
  });

  return {
    generatedAt: new Date().toISOString(),
    properties: sortProperties(properties).map(toContentProperty),
  };
}

export async function getAdminAccommodationContentById(
  propertyId: string,
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminAccommodationContentProperty | null> {
  if (!isAdminAccommodationId(propertyId)) {
    return null;
  }

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: accommodationContentSelect,
  });

  return property ? toContentProperty(property) : null;
}

export async function updateAdminAccommodationContent(
  input: UpdateAdminAccommodationContentInput,
  actor: AdminAccommodationContentActor,
): Promise<AdminAccommodationContentProperty> {
  if (!isAdminAccommodationId(input.propertyId)) {
    throw new AdminAccommodationContentError(
      "ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND",
    );
  }

  const normalizedContent = normalizeInput(input);

  return prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const property = await transaction.property.findFirst({
      where: {
        id: input.propertyId,
        deletedAt: null,
      },
      select: accommodationContentSelect,
    });

    if (!property) {
      throw new AdminAccommodationContentError(
        "ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND",
      );
    }

    if (property.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminAccommodationContentError("ACCOMMODATION_CONTENT_STALE");
    }

    const before = toMutableContent(property);
    const changedFields = getChangedFields(before, normalizedContent);

    if (changedFields.length === 0) {
      return toContentProperty(property);
    }

    const updatedAt = new Date();
    const updateResult = await transaction.property.updateMany({
      where: {
        id: property.id,
        updatedAt: property.updatedAt,
        deletedAt: null,
      },
      data: {
        ...normalizedContent,
        updatedAt,
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminAccommodationContentError("ACCOMMODATION_CONTENT_STALE");
    }

    const updatedProperty = await transaction.property.findUnique({
      where: {
        id: property.id,
      },
      select: accommodationContentSelect,
    });

    if (!updatedProperty) {
      throw new AdminAccommodationContentError(
        "ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND",
      );
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "PROPERTY_CONTENT_UPDATED",
        entityType: "Property",
        entityId: property.id,
        metadata: {
          actorEmail: adminActor.email,
          changedFields,
          before: pickChangedValues(before, changedFields),
          after: pickChangedValues(normalizedContent, changedFields),
        },
      },
    });

    return toContentProperty(updatedProperty);
  });
}
