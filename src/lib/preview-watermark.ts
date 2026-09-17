import { sniffImageContentType } from "@/lib/uploads";

export async function getWatermarkedPreview(src: string, original: Buffer) {
  void src;
  return {
    bytes: original,
    contentType: sniffImageContentType(original),
  };
}

export async function deleteWatermarkCache(src: string | null | undefined) {
  void src;
}
