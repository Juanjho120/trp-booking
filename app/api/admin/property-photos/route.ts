import { z } from "zod";

import {
  AdminPropertyPhotoError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  finalizeAdminPropertyPhotoUpload,
  getAdminSessionActor,
  prepareAdminPropertyPhotoUpload,
  reorderAdminPropertyPhotos,
  setAdminPropertyPhotoCover,
  softDeleteAdminPropertyPhoto,
  updateAdminPropertyPhotoAltText,
} from "@/lib/admin";
import type { AdminPropertyPhotoErrorCode } from "@/types/admin-property-photos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.string().trim().min(1).max(120);
const imageIdSchema = z.string().trim().min(1).max(120);
const altTextSchema = z.string().trim().min(3).max(250);
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);

const prepareUploadSchema = z
  .object({
    action: z.literal("prepare-upload"),
    propertyId: propertyIdSchema,
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(120),
    fileSize: z.number().int().positive(),
    altTextEs: altTextSchema,
    altTextEn: altTextSchema,
  })
  .strict();

const finalizeUploadSchema = z
  .object({
    action: z.literal("finalize-upload"),
    propertyId: propertyIdSchema,
    publicId: z.string().trim().min(1).max(500),
    altTextEs: altTextSchema,
    altTextEn: altTextSchema,
  })
  .strict();

const postSchema = z.discriminatedUnion("action", [
  prepareUploadSchema,
  finalizeUploadSchema,
]);

const updateAltTextSchema = z
  .object({
    action: z.literal("update-alt"),
    propertyId: propertyIdSchema,
    imageId: imageIdSchema,
    expectedUpdatedAt: z.string().datetime(),
    altTextEs: altTextSchema,
    altTextEn: altTextSchema,
  })
  .strict();

const reorderSchema = z
  .object({
    action: z.literal("reorder"),
    propertyId: propertyIdSchema,
    expectedRevision: revisionSchema,
    orderedImageIds: z.array(imageIdSchema).min(1).max(20),
  })
  .strict();

const setCoverSchema = z
  .object({
    action: z.literal("set-cover"),
    propertyId: propertyIdSchema,
    imageId: imageIdSchema,
    expectedRevision: revisionSchema,
  })
  .strict();

const patchSchema = z.discriminatedUnion("action", [
  updateAltTextSchema,
  reorderSchema,
  setCoverSchema,
]);

const deleteSchema = z
  .object({
    propertyId: propertyIdSchema,
    imageId: imageIdSchema,
    expectedRevision: revisionSchema,
  })
  .strict();

function errorStatus(code: AdminPropertyPhotoErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "PROPERTY_PHOTO_PROPERTY_NOT_FOUND":
    case "PROPERTY_PHOTO_NOT_FOUND":
      return 404;
    case "PROPERTY_PHOTO_STALE":
    case "PROPERTY_PHOTO_LIMIT_REACHED":
    case "PROPERTY_PHOTO_MINIMUM_REQUIRED":
      return 409;
    case "PROPERTY_PHOTO_FILE_TOO_LARGE":
      return 413;
    case "PROPERTY_PHOTO_UNSUPPORTED_TYPE":
      return 415;
    case "PROPERTY_PHOTO_PROVIDER_ERROR":
      return 502;
    case "PROPERTY_PHOTO_UPLOAD_EXPIRED":
    case "INVALID_PROPERTY_PHOTO_REQUEST":
      return 400;
    case "PROPERTY_PHOTO_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminPropertyPhotoError("INVALID_PROPERTY_PHOTO_REQUEST");
  }
}

function propertyPhotoErrorResponse(error: unknown) {
  if (error instanceof AdminPropertyPhotoError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse("PROPERTY_PHOTO_UNEXPECTED_ERROR", 500);
}

export async function POST(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = postSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse("INVALID_PROPERTY_PHOTO_REQUEST", 400);
    }

    if (parsedRequest.data.action === "prepare-upload") {
      const upload = await prepareAdminPropertyPhotoUpload(parsedRequest.data);
      return adminApiSuccessResponse({ upload });
    }

    const settings = await finalizeAdminPropertyPhotoUpload(
      parsedRequest.data,
      actor,
    );
    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return propertyPhotoErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = patchSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse("INVALID_PROPERTY_PHOTO_REQUEST", 400);
    }

    const settings =
      parsedRequest.data.action === "update-alt"
        ? await updateAdminPropertyPhotoAltText(parsedRequest.data, actor)
        : parsedRequest.data.action === "reorder"
          ? await reorderAdminPropertyPhotos(parsedRequest.data, actor)
          : await setAdminPropertyPhotoCover(parsedRequest.data, actor);

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return propertyPhotoErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = deleteSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse("INVALID_PROPERTY_PHOTO_REQUEST", 400);
    }

    const settings = await softDeleteAdminPropertyPhoto(
      parsedRequest.data,
      actor,
    );
    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return propertyPhotoErrorResponse(error);
  }
}
