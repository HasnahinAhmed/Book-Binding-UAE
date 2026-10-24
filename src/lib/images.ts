import manifest from "./image-manifest.json";

export type ImageName = keyof typeof manifest;
export interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

export function imageInfo(name: string): ImageInfo {
  const info = (manifest as Record<string, ImageInfo>)[name];
  if (!info) throw new Error(`Unknown image: ${name}`);
  return info;
}
