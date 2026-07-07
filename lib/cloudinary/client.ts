import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv, type CloudinaryEnv } from "@/lib/env/server";

export type CloudinaryClient = typeof cloudinary;

export function getCloudinaryClient(
  env: CloudinaryEnv = getCloudinaryEnv(),
): CloudinaryClient {
  if (typeof window !== "undefined") {
    throw new Error("Cloudinary client configuration must remain server-side only.");
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export function getCloudinaryUploadFolder(
  env: CloudinaryEnv = getCloudinaryEnv(),
): string {
  return env.CLOUDINARY_UPLOAD_FOLDER;
}
