import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TRP Admin",
    short_name: "TRP Admin",
    start_url: "/admin/notifications",
    scope: "/admin/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [
      {
        src: "/brand/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
