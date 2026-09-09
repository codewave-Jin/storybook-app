export interface DaumPostcodeHost {
  Postcode: new (options: DaumPostcodeOptions) => DaumPostcode;
}

export interface DaumPostcode {
  open: (options?: DaumPostcodeOpenOptions) => void;
  embed: (element: HTMLElement, options?: DaumPostcodeEmbedOptions) => void;
}

export interface DaumPostcodeOptions {
  oncomplete?: (data: DaumPostcodeData) => void;
  onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
  onresize?: (size: { width: number; height: number }) => void;
  width?: string | number;
  height?: string | number;
  animation?: boolean;
}

export interface DaumPostcodeOpenOptions {
  q?: string;
  left?: number;
  top?: number;
  popupTitle?: string;
  popupKey?: string;
  autoClose?: boolean;
}

export interface DaumPostcodeEmbedOptions {
  q?: string;
  autoClose?: boolean;
}

export interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  autoRoadAddress: string;
  autoJibunAddress: string;
  sido: string;
  sigungu: string;
  address: string;
  addressType: "R" | "J";
  userSelectedType: "R" | "J";
}

declare global {
  interface Window {
    daum?: DaumPostcodeHost;
  }
}
