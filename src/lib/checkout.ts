import { clampOrderQuantity } from "@/lib/payments";

export type CheckoutInput = {
  checkoutEmail: string;
  checkoutPhone: string;
  shippingName: string;
  zonecode: string;
  roadAddress: string;
  detailAddress: string;
  sido: string;
  includePhotoAlbum: boolean;
  quantity: number;
};

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function parseCheckoutForm(formData: FormData): CheckoutInput {
  const includeRaw = formData.get("includePhotoAlbum");
  return {
    checkoutEmail: readField(formData, "checkoutEmail").toLowerCase(),
    checkoutPhone: readField(formData, "checkoutPhone"),
    shippingName: readField(formData, "shippingName"),
    zonecode: readField(formData, "zonecode"),
    roadAddress: readField(formData, "roadAddress"),
    detailAddress: readField(formData, "detailAddress"),
    sido: readField(formData, "sido"),
    includePhotoAlbum:
      includeRaw === "on" || includeRaw === "true" || includeRaw === "1",
    quantity: clampOrderQuantity(Number(readField(formData, "quantity"))),
  };
}

export function validateCheckoutInput(input: CheckoutInput): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.checkoutEmail)) {
    return "이메일 주소를 확인해 주세요.";
  }

  const phoneDigits = input.checkoutPhone.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 11) {
    return "연락처를 확인해 주세요.";
  }

  if (input.shippingName.length < 1) {
    return "받는 분 이름을 입력해 주세요.";
  }

  if (!input.zonecode || !input.roadAddress || !input.sido) {
    return "주소를 검색해주세요";
  }

  if (!/^\d{5}$/.test(input.zonecode)) {
    return "주소를 검색해주세요";
  }

  if (input.detailAddress.length < 1) {
    return "상세주소를 입력해 주세요.";
  }

  if (input.detailAddress.length > 50) {
    return "상세주소는 50자 이내로 입력해 주세요.";
  }

  return null;
}
