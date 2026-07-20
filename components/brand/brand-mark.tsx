import Image, { type ImageProps } from "next/image";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { brandAssets, getBrandAssetHeight } from "./brand-assets";

type BrandMarkProps = Omit<
  ImageProps,
  "alt" | "fill" | "height" | "src" | "width"
> &
  Readonly<{
    alt?: string;
    width?: number;
  }>;

export function BrandMark({
  alt = siteConfig.brandName,
  className,
  draggable = false,
  quality = 100,
  sizes,
  width = 64,
  ...props
}: BrandMarkProps) {
  const asset = brandAssets.mark;
  const height = getBrandAssetHeight("mark", width);

  return (
    <Image
      {...props}
      alt={alt}
      className={cn("block h-auto max-w-full object-contain", className)}
      data-slot="brand-mark"
      draggable={draggable}
      height={height}
      quality={quality}
      sizes={sizes ?? `${width}px`}
      src={asset.src}
      width={width}
    />
  );
}

export type { BrandMarkProps };
