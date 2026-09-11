export type IllustrationVersionSource = "generate" | "upload";

export type IllustrationVersion = {
  path: string;
  createdAt: string;
  source: IllustrationVersionSource;
};

const MAX_VERSIONS = 15;

export function parseIllustrationVersions(value: unknown): IllustrationVersion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const path = "path" in item && typeof item.path === "string" ? item.path.trim() : "";
    if (!path) {
      return [];
    }
    const createdAt =
      "createdAt" in item && typeof item.createdAt === "string"
        ? item.createdAt
        : new Date(0).toISOString();
    const source =
      "source" in item && item.source === "upload" ? "upload" : "generate";
    return [{ path, createdAt, source }];
  });
}

export function archiveIllustrationVersion(options: {
  imagePath?: string | null;
  sceneImagePath?: string | null;
  versions: unknown;
  source?: IllustrationVersionSource;
}): IllustrationVersion[] {
  const current = (options.sceneImagePath || options.imagePath || "").trim();
  const versions = parseIllustrationVersions(options.versions);
  if (!current || versions.some((item) => item.path === current)) {
    return versions.slice(-MAX_VERSIONS);
  }

  return [
    ...versions,
    {
      path: current,
      createdAt: new Date().toISOString(),
      source: options.source ?? "generate",
    },
  ].slice(-MAX_VERSIONS);
}

export function collectIllustrationAssetPaths(illustration: {
  imagePath?: string | null;
  sceneImagePath?: string | null;
  upscaledImagePath?: string | null;
  imageVersions?: unknown;
}): string[] {
  return [
    illustration.imagePath,
    illustration.sceneImagePath,
    illustration.upscaledImagePath,
    ...parseIllustrationVersions(illustration.imageVersions).map((item) => item.path),
  ].filter((path, index, all): path is string => {
    return Boolean(path) && all.indexOf(path) === index;
  });
}
