export function characterStatusPayload(
  items: Array<{ id: string; status: string }>,
) {
  return {
    characters: [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, status }) => ({ id, status })),
  };
}

export function illustrationStatusPayload(
  items: Array<{ id: string; status: string; imagePath?: string | null }>,
) {
  return {
    illustrations: [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, status, imagePath }) => ({
        id,
        status,
        imagePath: imagePath ?? null,
      })),
  };
}
