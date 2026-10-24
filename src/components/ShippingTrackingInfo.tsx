"use client";

import { useState } from "react";
import { shippingTrackingUrl } from "@/lib/fulfillment";
import { cn } from "@/lib/utils";

export function ShippingTrackingInfo({
  carrier,
  trackingNumber,
  className,
}: {
  carrier: string;
  trackingNumber: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trackingUrl = shippingTrackingUrl(carrier, trackingNumber);

  async function copyTrackingNumber() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-stone-400">배송 정보</p>
        <p className="mt-0.5 break-all text-sm font-medium text-stone-800">
          {carrier}
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-mono tracking-wide">{trackingNumber}</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => void copyTrackingNumber()}
          className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          {copied ? "복사됨" : "복사"}
        </button>
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-lg bg-sky-400 px-3 text-xs font-semibold text-white hover:bg-sky-500"
          >
            배송조회
          </a>
        ) : null}
      </div>
    </div>
  );
}
