import { REVIEW_IMAGE_MAX_BYTES, REVIEW_IMAGE_TYPES } from "@/lib/reviews";
import { getSupabaseAdmin } from "@/lib/supabase";

export const REVIEW_IMAGE_BUCKET = "review-images";

const PATH_MARKER = `/${REVIEW_IMAGE_BUCKET}/`;

function extensionFromMime(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export function reviewImageStoragePath(url: string): string | null {
  const markerIndex = url.indexOf(PATH_MARKER);
  if (markerIndex === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(markerIndex + PATH_MARKER.length).split("?")[0]);
}

export function validateReviewImageFile(file: File): string | null {
  if (!REVIEW_IMAGE_TYPES.has(file.type)) {
    return "JPG, PNG, WEBP, GIF 이미지만 첨부할 수 있습니다.";
  }
  if (file.size > REVIEW_IMAGE_MAX_BYTES) {
    return "각 사진은 4MB 이하여야 합니다.";
  }
  return null;
}

export async function uploadReviewImages(
  userId: string,
  reviewId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const urls: string[] = [];

  try {
    for (const file of files) {
      const fieldError = validateReviewImageFile(file);
      if (fieldError) {
        throw new Error(fieldError);
      }

      const path = `${userId}/${reviewId}/${crypto.randomUUID()}.${extensionFromMime(file.type)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage
        .from(REVIEW_IMAGE_BUCKET)
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        throw new Error("사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const { data } = supabase.storage.from(REVIEW_IMAGE_BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  } catch (error) {
    await deleteReviewImageFiles(urls);
    throw error;
  }

  return urls;
}

export async function deleteReviewImageFiles(urls: string[]) {
  const paths = urls
    .map(reviewImageStoragePath)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) {
    return;
  }

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(REVIEW_IMAGE_BUCKET).remove(paths);
}

export async function signReviewImageUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) {
    return [];
  }

  try {
    const supabase = getSupabaseAdmin();
    const paths = urls.map(reviewImageStoragePath);
    const toSign = paths.filter((path): path is string => Boolean(path));
    if (toSign.length === 0) {
      return urls;
    }

    const { data, error } = await supabase.storage
      .from(REVIEW_IMAGE_BUCKET)
      .createSignedUrls(toSign, 60 * 60);

    if (error || !data) {
      return urls;
    }

    const signedByPath = new Map(
      data
        .filter((item) => item.path && item.signedUrl)
        .map((item) => [item.path, item.signedUrl]),
    );

    return urls.map((url, index) => {
      const path = paths[index];
      return (path && signedByPath.get(path)) || url;
    });
  } catch {
    return urls;
  }
}
