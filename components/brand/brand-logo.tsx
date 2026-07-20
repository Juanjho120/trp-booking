import Image, { type ImageProps } from "next/image";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { brandAssets, getBrandAssetHeight } from "./brand-assets";

type BrandLogoProps = Omit<
  ImageProps,
  "alt" | "fill" | "height" | "src" | "width"
> &
  Readonly<{
    alt?: string;
    width?: number;
  }>;

export function BrandLogo({
  alt = siteConfig.brandName,
  className,
  draggable = false,
  quality = 100,
  sizes,
  width = 240,
  ...props
}: BrandLogoProps) {
  const asset = brandAssets.primary;
  const height = getBrandAssetHeight("primary", width);

  return (
    <Image
      {...props}
      alt={alt}
      className={cn("block h-auto max-w-full object-contain", className)}
      data-slot="brand-logo"
      draggable={draggable}
      height={height}
      quality={quality}
      sizes={sizes ?? `${width}px`}
      src={asset.src}
      width={width}
    />
  );
}

export type { BrandLogoProps };
