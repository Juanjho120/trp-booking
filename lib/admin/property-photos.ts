import { createHash, randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import {
  buildAccommodationImageFolder,
  buildCloudinaryImageUrl,
  getCloudinaryClient,
  getCloudinaryUploadFolder,
} from "@/lib/cloudinary";
import { getCloudinaryEnv } from "@/lib/env/server";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminPropertyPhoto,
  AdminPropertyPhotoActor,
  AdminPropertyPhotoErrorCode,
  AdminPropertyPhotoSettings,
  AdminPropertyPhotoUploadSignature,
  DeleteAdminPropertyPhotoInput,
  FinalizeAdminPropertyPhotoUploadInput,
  PrepareAdminPropertyPhotoUploadInput,
  ReorderAdminPropertyPhotosInput,
  SetAdminPropertyPhotoCoverInput,
  UpdateAdminPropertyPhotoAltTextInput,
} from "@/types/admin-property-photos";

import { resolveAdminActor } from "./admin-actor";
import {
  isAdminAccommodationId,
} from "./accommodations";

export const ADMIN_PROPERTY_PHOTO_MAX_COUNT = 20;
export const ADMIN_PROPERTY_PHOTO_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ADMIN_PROPERTY_PHOTO_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const ADMIN_PROPERTY_PHOTO_ACCEPTED_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALT_TEXT_MIN_LENGTH = 3;
const ALT_TEXT_MAX_LENGTH = 250;
const DIRECT_UPLOAD_MAX_AGE_MS = 15 * 60 * 1000;
const PUBLIC_ID_SUFFIX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const photoSelect = {
  id: true,
  propertyId: true,
  cloudinaryPublicId: true,
  url: true,
  secureUrl: true,
  altTextEs: true,
  altTextEn: true,
  sortOrder: true,
  isCover: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PropertyImageSelect;

const propertyPhotoSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  slug: true,
  status: true,
  images: {
    where: {
      deletedAt: null,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: photoSelect,
  },
} satisfies Prisma.PropertySelect;

type PropertyPhotoRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyPhotoSelect;
}>;

type PhotoRecord = Prisma.PropertyImageGetPayload<{
  select: typeof photoSelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

type CloudinaryResource = Readonly<{
  public_id?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  bytes?: number;
  url?: string;
  secure_url?: string;
  created_at?: string;
}>;

export class AdminPropertyPhotoError extends Error {
  constructor(public readonly code: AdminPropertyPhotoErrorCode) {
    super(code);
    this.name = "AdminPropertyPhotoError";
  }
}

function normalizeSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAltText(value: string): string {
  const normalized = normalizeSingleLine(value);

  if (
    normalized.length < ALT_TEXT_MIN_LENGTH ||
    normalized.length > ALT_TEXT_MAX_LENGTH
  ) {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }

  return normalized;
}

function assertSupportedPropertyId(propertyId: string): void {
  if (!isAdminAccommodationId(propertyId)) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }
}

function assertUploadMetadata(
  input: PrepareAdminPropertyPhotoUploadInput,
): Readonly<{ altTextEs: string; altTextEn: string }> {
  if (!input.fileName.trim()) {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }

  if (!ADMIN_PROPERTY_PHOTO_ACCEPTED_MIME_TYPES.includes(
    input.mimeType as (typeof ADMIN_PROPERTY_PHOTO_ACCEPTED_MIME_TYPES)[number],
  )) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_UNSUPPORTED_TYPE");
  }

  if (!Number.isInteger(input.fileSize) || input.fileSize <= 0) {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }

  if (input.fileSize > ADMIN_PROPERTY_PHOTO_MAX_FILE_SIZE_BYTES) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_FILE_TOO_LARGE");
  }

  return {
    altTextEs: normalizeAltText(input.altTextEs),
    altTextEn: normalizeAltText(input.altTextEn),
  };
}

function toPhoto(photo: PhotoRecord): AdminPropertyPhoto {
  const src = photo.cloudinaryPublicId
    ? buildCloudinaryImageUrl(photo.cloudinaryPublicId, {
        width: 1200,
        height: 900,
        crop: "fill",
        quality: "auto",
        format: "auto",
      })
    : photo.secureUrl ?? photo.url;

  return {
    id: photo.id,
    propertyId: photo.propertyId,
    cloudinaryPublicId: photo.cloudinaryPublicId,
    src,
    altTextEs: photo.altTextEs,
    altTextEn: photo.altTextEn,
    sortOrder: photo.sortOrder,
    isCover: photo.isCover,
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
  };
}

function getGalleryRevision(property: PropertyPhotoRecord): string {
  const payload = property.images.map((photo) => ({
    id: photo.id,
    updatedAt: photo.updatedAt.toISOString(),
    sortOrder: photo.sortOrder,
    isCover: photo.isCover,
  }));

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function assertExpectedRevision(
  property: PropertyPhotoRecord,
  expectedRevision: string,
): void {
  if (getGalleryRevision(property) !== expectedRevision) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_STALE");
  }
}

function toSettings(property: PropertyPhotoRecord): AdminPropertyPhotoSettings {
  return {
    property: {
      id: property.id,
      nameEs: property.nameEs,
      nameEn: property.nameEn,
      slug: property.slug,
      status: property.status,
    },
    photos: property.images.map(toPhoto),
    maxPhotos: ADMIN_PROPERTY_PHOTO_MAX_COUNT,
    maxFileSizeBytes: ADMIN_PROPERTY_PHOTO_MAX_FILE_SIZE_BYTES,
    acceptedMimeTypes: ADMIN_PROPERTY_PHOTO_ACCEPTED_MIME_TYPES,
    revision: getGalleryRevision(property),
    generatedAt: new Date().toISOString(),
  };
}

async function findPropertyWithPhotos(
  propertyId: string,
  prismaClient: AdminPrismaClient,
): Promise<PropertyPhotoRecord> {
  assertSupportedPropertyId(propertyId);

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertyPhotoSelect,
  });

  if (!property) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return property;
}

function getOwnedImageFolder(propertySlug: string): string {
  return buildAccommodationImageFolder(
    getCloudinaryUploadFolder(),
    propertySlug,
  );
}

function assertOwnedPublicId(publicId: string, propertySlug: string): void {
  const folder = getOwnedImageFolder(propertySlug);
  const expectedPrefix = `${folder}/`;

  if (!publicId.startsWith(expectedPrefix)) {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }

  const suffix = publicId.slice(expectedPrefix.length);

  if (!PUBLIC_ID_SUFFIX_PATTERN.test(suffix)) {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }
}

async function getCloudinaryResource(
  publicId: string,
): Promise<CloudinaryResource> {
  try {
    const resource = await getCloudinaryClient().api.resource(publicId, {
      resource_type: "image",
      type: "upload",
    });

    return resource as CloudinaryResource;
  } catch {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROVIDER_ERROR");
  }
}

async function destroyCloudinaryAssetBestEffort(publicId: string): Promise<void> {
  try {
    await getCloudinaryClient().uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup only. Provider errors are intentionally not exposed.
  }
}

async function destroyUnpersistedCloudinaryAssetBestEffort(
  publicId: string,
): Promise<void> {
  try {
    const persistedPhoto = await prisma.propertyImage.findFirst({
      where: {
        cloudinaryPublicId: publicId,
      },
      select: {
        id: true,
      },
    });

    if (!persistedPhoto) {
      await destroyCloudinaryAssetBestEffort(publicId);
    }
  } catch {
    // Database/provider cleanup remains best effort and never masks the original error.
  }
}

function validateCloudinaryResource(
  resource: CloudinaryResource,
  expectedPublicId: string,
): Readonly<{
  publicId: string;
  url: string;
  secureUrl: string;
}> {
  if (
    resource.public_id !== expectedPublicId ||
    resource.resource_type !== "image" ||
    resource.type !== "upload" ||
    !resource.url ||
    !resource.secure_url ||
    typeof resource.bytes !== "number" ||
    !resource.format ||
    !resource.created_at
  ) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROVIDER_ERROR");
  }

  if (resource.bytes > ADMIN_PROPERTY_PHOTO_MAX_FILE_SIZE_BYTES) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_FILE_TOO_LARGE");
  }

  if (!ADMIN_PROPERTY_PHOTO_ACCEPTED_FORMATS.has(resource.format.toLowerCase())) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_UNSUPPORTED_TYPE");
  }

  const createdAt = new Date(resource.created_at).getTime();
  const age = Date.now() - createdAt;

  if (!Number.isFinite(createdAt) || age < -60_000 || age > DIRECT_UPLOAD_MAX_AGE_MS) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_UPLOAD_EXPIRED");
  }

  return {
    publicId: resource.public_id,
    url: resource.url,
    secureUrl: resource.secure_url,
  };
}

async function updateSequentialSortOrder(
  transaction: Prisma.TransactionClient,
  imageIds: readonly string[],
): Promise<void> {
  for (const [index, imageId] of imageIds.entries()) {
    await transaction.propertyImage.update({
      where: {
        id: imageId,
      },
      data: {
        sortOrder: index + 1,
      },
    });
  }
}

export async function getAdminPropertyPhotoSettings(
  propertyId: string,
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminPropertyPhotoSettings | null> {
  if (!isAdminAccommodationId(propertyId)) {
    return null;
  }

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertyPhotoSelect,
  });

  return property ? toSettings(property) : null;
}

export async function prepareAdminPropertyPhotoUpload(
  input: PrepareAdminPropertyPhotoUploadInput,
): Promise<AdminPropertyPhotoUploadSignature> {
  assertSupportedPropertyId(input.propertyId);
  assertUploadMetadata(input);

  const property = await findPropertyWithPhotos(input.propertyId, prisma);

  if (property.images.length >= ADMIN_PROPERTY_PHOTO_MAX_COUNT) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_LIMIT_REACHED");
  }

  const env = getCloudinaryEnv();
  const publicId = `${getOwnedImageFolder(property.slug)}/${randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = getCloudinaryClient().utils.api_sign_request(
    {
      overwrite: false,
      public_id: publicId,
      timestamp,
    },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    publicId,
    overwrite: false,
  };
}

export async function finalizeAdminPropertyPhotoUpload(
  input: FinalizeAdminPropertyPhotoUploadInput,
  actor: AdminPropertyPhotoActor,
): Promise<AdminPropertyPhotoSettings> {
  assertSupportedPropertyId(input.propertyId);
  const altTextEs = normalizeAltText(input.altTextEs);
  const altTextEn = normalizeAltText(input.altTextEn);
  const property = await findPropertyWithPhotos(input.propertyId, prisma);
  assertOwnedPublicId(input.publicId, property.slug);

  if (
    property.images.some(
      (photo) => photo.cloudinaryPublicId === input.publicId,
    )
  ) {
    return toSettings(property);
  }

  const resource = await getCloudinaryResource(input.publicId);
  let validatedResource: ReturnType<typeof validateCloudinaryResource>;

  try {
    validatedResource = validateCloudinaryResource(resource, input.publicId);
  } catch (error) {
    await destroyUnpersistedCloudinaryAssetBestEffort(input.publicId);
    throw error;
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const currentProperty = await findPropertyWithPhotos(
          input.propertyId,
          transaction,
        );

        const alreadyPersisted = currentProperty.images.some(
          (photo) => photo.cloudinaryPublicId === validatedResource.publicId,
        );

        if (alreadyPersisted) {
          return;
        }

        if (currentProperty.images.length >= ADMIN_PROPERTY_PHOTO_MAX_COUNT) {
          throw new AdminPropertyPhotoError("PROPERTY_PHOTO_LIMIT_REACHED");
        }

        const sortOrder = currentProperty.images.length + 1;
        const isCover = currentProperty.images.length === 0;
        const createdPhoto = await transaction.propertyImage.create({
          data: {
            propertyId: currentProperty.id,
            cloudinaryPublicId: validatedResource.publicId,
            url: validatedResource.url,
            secureUrl: validatedResource.secureUrl,
            altTextEs,
            altTextEn,
            sortOrder,
            isCover,
          },
          select: photoSelect,
        });

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "PROPERTY_IMAGE_UPLOADED",
            entityType: "PropertyImage",
            entityId: createdPhoto.id,
            metadata: {
              actorEmail: adminActor.email,
              propertyId: currentProperty.id,
              cloudinaryPublicId: validatedResource.publicId,
              sortOrder,
              isCover,
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    await destroyUnpersistedCloudinaryAssetBestEffort(
      validatedResource.publicId,
    );
    throw error;
  }

  const settings = await getAdminPropertyPhotoSettings(input.propertyId);

  if (!settings) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return settings;
}

export async function updateAdminPropertyPhotoAltText(
  input: UpdateAdminPropertyPhotoAltTextInput,
  actor: AdminPropertyPhotoActor,
): Promise<AdminPropertyPhotoSettings> {
  assertSupportedPropertyId(input.propertyId);
  const altTextEs = normalizeAltText(input.altTextEs);
  const altTextEn = normalizeAltText(input.altTextEn);

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    await findPropertyWithPhotos(input.propertyId, transaction);
    const photo = await transaction.propertyImage.findFirst({
      where: {
        id: input.imageId,
        propertyId: input.propertyId,
        deletedAt: null,
      },
      select: photoSelect,
    });

    if (!photo) {
      throw new AdminPropertyPhotoError("PROPERTY_PHOTO_NOT_FOUND");
    }

    if (photo.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new AdminPropertyPhotoError("PROPERTY_PHOTO_STALE");
    }

    if (photo.altTextEs === altTextEs && photo.altTextEn === altTextEn) {
      return;
    }

    const updateResult = await transaction.propertyImage.updateMany({
      where: {
        id: photo.id,
        propertyId: input.propertyId,
        updatedAt: photo.updatedAt,
        deletedAt: null,
      },
      data: {
        altTextEs,
        altTextEn,
      },
    });

    if (updateResult.count !== 1) {
      throw new AdminPropertyPhotoError("PROPERTY_PHOTO_STALE");
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "PROPERTY_IMAGE_ALT_TEXT_UPDATED",
        entityType: "PropertyImage",
        entityId: photo.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          before: {
            altTextEs: photo.altTextEs,
            altTextEn: photo.altTextEn,
          },
          after: {
            altTextEs,
            altTextEn,
          },
        },
      },
    });
  });

  const settings = await getAdminPropertyPhotoSettings(input.propertyId);

  if (!settings) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return settings;
}

export async function reorderAdminPropertyPhotos(
  input: ReorderAdminPropertyPhotosInput,
  actor: AdminPropertyPhotoActor,
): Promise<AdminPropertyPhotoSettings> {
  assertSupportedPropertyId(input.propertyId);

  await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const property = await findPropertyWithPhotos(
        input.propertyId,
        transaction,
      );
      assertExpectedRevision(property, input.expectedRevision);

      const currentIds = property.images.map((photo) => photo.id);
      const requestedIds = [...input.orderedImageIds];

      if (
        requestedIds.length !== currentIds.length ||
        new Set(requestedIds).size !== requestedIds.length ||
        currentIds.some((imageId) => !requestedIds.includes(imageId))
      ) {
        throw new AdminPropertyPhotoError("PROPERTY_PHOTO_STALE");
      }

      if (
        currentIds.every((imageId, index) => imageId === requestedIds[index])
      ) {
        return;
      }

      await updateSequentialSortOrder(transaction, requestedIds);

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "PROPERTY_IMAGES_REORDERED",
          entityType: "Property",
          entityId: property.id,
          metadata: {
            actorEmail: adminActor.email,
            before: currentIds,
            after: requestedIds,
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  const settings = await getAdminPropertyPhotoSettings(input.propertyId);

  if (!settings) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return settings;
}

export async function setAdminPropertyPhotoCover(
  input: SetAdminPropertyPhotoCoverInput,
  actor: AdminPropertyPhotoActor,
): Promise<AdminPropertyPhotoSettings> {
  assertSupportedPropertyId(input.propertyId);

  await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const property = await findPropertyWithPhotos(
        input.propertyId,
        transaction,
      );
      assertExpectedRevision(property, input.expectedRevision);

      const selectedPhoto = property.images.find(
        (photo) => photo.id === input.imageId,
      );

      if (!selectedPhoto) {
        throw new AdminPropertyPhotoError("PROPERTY_PHOTO_NOT_FOUND");
      }

      const previousCover =
        property.images.find((photo) => photo.isCover) ?? null;

      if (selectedPhoto.isCover) {
        return;
      }

      await transaction.propertyImage.updateMany({
        where: {
          propertyId: input.propertyId,
          deletedAt: null,
        },
        data: {
          isCover: false,
        },
      });
      await transaction.propertyImage.update({
        where: {
          id: selectedPhoto.id,
        },
        data: {
          isCover: true,
        },
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "PROPERTY_IMAGE_COVER_CHANGED",
          entityType: "PropertyImage",
          entityId: selectedPhoto.id,
          metadata: {
            actorEmail: adminActor.email,
            propertyId: property.id,
            previousCoverImageId: previousCover?.id ?? null,
            coverImageId: selectedPhoto.id,
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  const settings = await getAdminPropertyPhotoSettings(input.propertyId);

  if (!settings) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return settings;
}

export async function softDeleteAdminPropertyPhoto(
  input: DeleteAdminPropertyPhotoInput,
  actor: AdminPropertyPhotoActor,
): Promise<AdminPropertyPhotoSettings> {
  assertSupportedPropertyId(input.propertyId);

  await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const property = await findPropertyWithPhotos(
        input.propertyId,
        transaction,
      );
      assertExpectedRevision(property, input.expectedRevision);

      const photo = property.images.find(
        (candidate) => candidate.id === input.imageId,
      );

      if (!photo) {
        throw new AdminPropertyPhotoError("PROPERTY_PHOTO_NOT_FOUND");
      }

      if (property.images.length <= 1) {
        throw new AdminPropertyPhotoError("PROPERTY_PHOTO_MINIMUM_REQUIRED");
      }

      const remainingPhotos = property.images.filter(
        (candidate) => candidate.id !== photo.id,
      );
      const remainingCover = remainingPhotos.find(
        (candidate) => candidate.isCover,
      );
      const promotedCover =
        photo.isCover || !remainingCover ? remainingPhotos[0] : null;
      const deletedAt = new Date();

      await transaction.propertyImage.update({
        where: {
          id: photo.id,
        },
        data: {
          deletedAt,
          deletedById: adminActor.id,
          isCover: false,
        },
      });

      await updateSequentialSortOrder(
        transaction,
        remainingPhotos.map((candidate) => candidate.id),
      );

      if (promotedCover) {
        await transaction.propertyImage.updateMany({
          where: {
            propertyId: input.propertyId,
            deletedAt: null,
          },
          data: {
            isCover: false,
          },
        });
        await transaction.propertyImage.update({
          where: {
            id: promotedCover.id,
          },
          data: {
            isCover: true,
          },
        });
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "PROPERTY_IMAGE_SOFT_DELETED",
          entityType: "PropertyImage",
          entityId: photo.id,
          metadata: {
            actorEmail: adminActor.email,
            propertyId: property.id,
            cloudinaryPublicId: photo.cloudinaryPublicId,
            deletedAt: deletedAt.toISOString(),
            promotedCoverImageId: promotedCover?.id ?? null,
            cloudinaryAssetRetained: true,
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  const settings = await getAdminPropertyPhotoSettings(input.propertyId);

  if (!settings) {
    throw new AdminPropertyPhotoError("PROPERTY_PHOTO_PROPERTY_NOT_FOUND");
  }

  return settings;
}
