export const PRINT_COMMENT_MAX = 500;
export const PRINT_COMMENT_PLACEHOLDER = "2page 곰돌이 손이 이상해요";

export function parsePrintComment(value: unknown) {
  const comment = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (comment.length > PRINT_COMMENT_MAX) {
    return {
      error: `수정 사항은 ${PRINT_COMMENT_MAX}자 이내로 입력해 주세요.`,
    };
  }
  return { comment };
}
