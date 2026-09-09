"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Script from "next/script";
import type {
  DaumPostcodeData,
  DaumPostcodeHost,
} from "@/types/daum-postcode";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none ring-sky-200 placeholder:text-stone-400 focus:border-sky-300 focus:ring-2";

const DETAIL_MAX_LENGTH = 50;

function lockTypedInput(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Tab") {
    event.preventDefault();
  }
}

function preventTypedValue(
  event: FormEvent<HTMLInputElement> | ClipboardEvent<HTMLInputElement>,
) {
  event.preventDefault();
}

function isMobilePostcodeViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function waitForDaumPostcode(timeoutMs = 8000): Promise<DaumPostcodeHost> {
  const existing = window.daum;
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const daum = window.daum;
      if (daum) {
        window.clearInterval(timer);
        resolve(daum);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
      }
    }, 50);
  });
}

export function DaumPostcodeFields() {
  const zonecodeId = useId();
  const roadId = useId();
  const detailId = useId();
  const embedHostRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLInputElement | null>(null);

  const [zonecode, setZonecode] = useState("");
  const [roadAddress, setRoadAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [sido, setSido] = useState("");
  const [layerOpen, setLayerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function applyPostcode(data: DaumPostcodeData) {
    const road = data.roadAddress.trim() || data.jibunAddress.trim();
    setZonecode(data.zonecode);
    setRoadAddress(road);
    setSido(data.sido);
    setLayerOpen(false);
    setLoadError(null);
    window.setTimeout(() => {
      detailRef.current?.focus();
    }, 0);
  }

  async function openPostcode() {
    setLoadError(null);
    let daum: DaumPostcodeHost;
    try {
      daum = await waitForDaumPostcode();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "우편번호 서비스를 불러오지 못했습니다.",
      );
      return;
    }

    if (isMobilePostcodeViewport()) {
      setLayerOpen(true);
      return;
    }

    new daum.Postcode({
      oncomplete: applyPostcode,
    }).open();
  }

  useLayoutEffect(() => {
    if (!layerOpen) {
      return;
    }

    const host = embedHostRef.current;
    const daum = window.daum;
    if (!host || !daum) {
      return;
    }

    host.replaceChildren();
    new daum.Postcode({
      oncomplete: applyPostcode,
      onclose: () => setLayerOpen(false),
      width: "100%",
      height: "100%",
    }).embed(host);
  }, [layerOpen]);

  useEffect(() => {
    if (!layerOpen) {
      return;
    }

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setLayerOpen(false);
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [layerOpen]);

  return (
    <div className="space-y-3 sm:col-span-2">
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <input type="hidden" name="sido" value={sido} />

      <div>
        <span className="mb-1 block text-xs font-medium text-stone-600">
          우편번호
          <span className="text-[#E07A5F]"> *</span>
        </span>
        <div className="flex gap-2">
          <input
            id={zonecodeId}
            name="zonecode"
            value={zonecode}
            required
            aria-readonly="true"
            autoComplete="off"
            inputMode="none"
            placeholder="주소 찾기"
            className={`${INPUT_CLASS} flex-1 cursor-pointer bg-stone-50`}
            onKeyDown={lockTypedInput}
            onPaste={preventTypedValue}
            onBeforeInput={preventTypedValue}
            onClick={() => {
              void openPostcode();
            }}
          />
          <button
            type="button"
            onClick={() => {
              void openPostcode();
            }}
            className="h-11 shrink-0 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            주소 찾기
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-600">
          도로명주소
          <span className="text-[#E07A5F]"> *</span>
        </span>
        <input
          id={roadId}
          name="roadAddress"
          value={roadAddress}
          required
          aria-readonly="true"
          autoComplete="off"
          inputMode="none"
          placeholder="주소 찾기로 입력됩니다"
          className={`${INPUT_CLASS} cursor-pointer bg-stone-50`}
          onKeyDown={lockTypedInput}
          onPaste={preventTypedValue}
          onBeforeInput={preventTypedValue}
          onClick={() => {
            void openPostcode();
          }}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-600">
          상세주소
          <span className="text-[#E07A5F]"> *</span>
        </span>
        <input
          id={detailId}
          ref={detailRef}
          name="detailAddress"
          value={detailAddress}
          required
          maxLength={DETAIL_MAX_LENGTH}
          autoComplete="address-line2"
          placeholder="동·호수"
          onChange={(event) =>
            setDetailAddress(event.target.value.slice(0, DETAIL_MAX_LENGTH))
          }
          className={INPUT_CLASS}
        />
        <span className="mt-1 block text-right text-[11px] text-stone-400">
          {detailAddress.length}/{DETAIL_MAX_LENGTH}
        </span>
      </label>

      {loadError ? (
        <p className="text-sm text-red-700">{loadError}</p>
      ) : null}

      {layerOpen ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-white">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 px-4">
            <p className="text-sm font-semibold text-stone-800">주소 찾기</p>
            <button
              type="button"
              onClick={() => setLayerOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              <span className="sr-only">닫기</span>
              ×
            </button>
          </div>
          <div ref={embedHostRef} className="min-h-0 flex-1" />
        </div>
      ) : null}
    </div>
  );
}
