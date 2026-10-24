export const DEFAULT_COVER_COMMENT =
  "사랑하는 우리 아이야,\n너의 모든 하루가 멋진 이야기가 되기를.";

export const MAX_COVER_COMMENT = 120;

export function resolveCoverComment(saved: string | null | undefined) {
  const text = saved?.replace(/\r\n/g, "\n").trim();
  return text ? text : DEFAULT_COVER_COMMENT;
}
