import { getCloudinaryClient } from "./client";

export type CloudinaryImageDeliveryOptions = Readonly<{
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "scale" | "thumb";
  quality?: "auto" | number;
  format?: "auto" | "jpg" | "png" | "webp" | "avif";
}>;

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export function buildCloudinaryImageUrl(
  publicId: string,
  options: CloudinaryImageDeliveryOptions = {},
): string {
  const trimmedPublicId = publicId.trim();

  if (!trimmedPublicId) {
    throw new Error("publicId is required.");
  }

  if (options.width !== undefined) {
    assertPositiveInteger(options.width, "width");
  }

  if (options.height !== undefined) {
    assertPositiveInteger(options.height, "height");
  }

  const cloudinary = getCloudinaryClient();

  return cloudinary.url(trimmedPublicId, {
    secure: true,
    width: options.width,
    height: options.height,
    crop: options.crop ?? "fill",
    quality: options.quality ?? "auto",
    fetch_format: options.format ?? "auto",
  });
}
