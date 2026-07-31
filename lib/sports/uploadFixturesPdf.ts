import { getServiceClient } from "@/lib/supabase/service";

export const SPORTS_FIXTURES_BUCKET = "sports-fixtures";

async function ensureSportsFixturesBucket() {
  const service = getServiceClient();
  const { data: buckets, error: listError } = await service.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets || []).some(
    (bucket) => bucket.name === SPORTS_FIXTURES_BUCKET || bucket.id === SPORTS_FIXTURES_BUCKET,
  );
  if (exists) return;

  const { error: createError } = await service.storage.createBucket(SPORTS_FIXTURES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

/** Upload PDF and return a direct public media URL (CDN-style download link). */
export async function uploadSportsFixturesPdf(
  pdf: Buffer,
  options: { gameId: string; week?: number | null },
): Promise<{ path: string; publicUrl: string }> {
  await ensureSportsFixturesBucket();
  const service = getServiceClient();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const weekPart = options.week != null ? `week-${options.week}` : "fixtures";
  const path = `${options.gameId}/${weekPart}-${stamp}.pdf`;

  const { error: uploadError } = await service.storage
    .from(SPORTS_FIXTURES_BUCKET)
    .upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = service.storage.from(SPORTS_FIXTURES_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to create public PDF URL");
  }

  // Cache-bust so recipients always get the latest file when reusing path patterns
  const publicUrl = `${data.publicUrl}?alt=media`;

  return { path, publicUrl };
}
