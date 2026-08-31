export function oauthErrorMessage(error?: string) {
  switch (error) {
    case "OAuthEmailRequired":
      return "소셜 계정에서 이메일을 가져오지 못했습니다. 이메일 제공에 동의해 주세요.";
    case "OAuthAccountNotLinked":
      return "이미 같은 이메일로 가입된 계정이 있습니다. 기존에 사용한 소셜 계정으로 로그인해 주세요.";
    case "AccessDenied":
      return "로그인이 취소되었습니다.";
    case "Configuration":
      return "소셜 로그인 설정에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
    case undefined:
    case "":
      return null;
    default:
      return "소셜 로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}
