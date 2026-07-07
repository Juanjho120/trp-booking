const FOLDER_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_PURPOSE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AccommodationImagePublicIdInput = Readonly<{
  baseFolder: string;
  propertySlug: string;
  sortOrder: number;
  imagePurpose: string;
}>;

export function normalizeCloudinaryFolder(folder: string): string {
  return folder.trim().replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

export function assertCloudinaryFolderSegment(value: string, label: string): void {
  if (!FOLDER_SEGMENT_PATTERN.test(value)) {
    throw new Error(`${label} must use lowercase slug format.`);
  }
}

export function assertImagePurpose(value: string): void {
  if (!IMAGE_PURPOSE_PATTERN.test(value)) {
    throw new Error("imagePurpose must use lowercase slug format.");
  }
}

export function buildAccommodationImageFolder(
  baseFolder: string,
  propertySlug: string,
): string {
  const normalizedBaseFolder = normalizeCloudinaryFolder(baseFolder);

  if (!normalizedBaseFolder.startsWith("trp-booking/")) {
    throw new Error("Cloudinary base folder must stay under trp-booking/.");
  }

  assertCloudinaryFolderSegment(propertySlug, "propertySlug");

  return `${normalizedBaseFolder}/accommodations/${propertySlug}`;
}

export function buildAccommodationImagePublicId({
  baseFolder,
  propertySlug,
  sortOrder,
  imagePurpose,
}: AccommodationImagePublicIdInput): string {
  if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 99) {
    throw new Error("sortOrder must be an integer between 1 and 99.");
  }

  assertImagePurpose(imagePurpose);

  const folder = buildAccommodationImageFolder(baseFolder, propertySlug);
  const paddedSortOrder = sortOrder.toString().padStart(2, "0");

  return `${folder}/${paddedSortOrder}-${imagePurpose}`;
}
