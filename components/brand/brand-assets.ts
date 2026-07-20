export const brandAssets = {
  primary: {
    src: "/brand/logo-primary.png",
    intrinsicWidth: 1233,
    intrinsicHeight: 1132,
  },
  mark: {
    src: "/brand/logo-mark.png",
    intrinsicWidth: 1121,
    intrinsicHeight: 1036,
  },
} as const;

export type BrandAssetName = keyof typeof brandAssets;

export function getBrandAssetHeight(
  assetName: BrandAssetName,
  width: number,
): number {
  const asset = brandAssets[assetName];

  return Math.round((width * asset.intrinsicHeight) / asset.intrinsicWidth);
}
