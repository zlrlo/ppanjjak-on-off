import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return {
    name: "빤짝 온오프",
    short_name: "빤짝 온오프",
    description: "가족 돌봄 근무와 빤짝이 상태를 기록해요",
    start_url: `${basePath}/`,
    display: "standalone",
    background_color: "#fff8ed",
    theme_color: "#ff8a65",
    icons: [{ src: `${basePath}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
