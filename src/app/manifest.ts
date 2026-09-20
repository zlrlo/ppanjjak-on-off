import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "빤짝 온오프",
    short_name: "빤짝 온오프",
    description: "가족 돌봄 근무와 빤짝이 상태를 기록해요",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ed",
    theme_color: "#ff8a65",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
