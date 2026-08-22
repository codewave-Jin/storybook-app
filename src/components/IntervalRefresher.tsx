"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function IntervalRefresher({
  active,
  href,
  initialSignature,
}: {
  active: boolean;
  href: string;
  initialSignature: string;
}) {
  const router = useRouter();
  const signatureRef = useRef(initialSignature);

  useEffect(() => {
    signatureRef.current = initialSignature;
  }, [initialSignature]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(href, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const payload = await response.text();
        if (cancelled) {
          return;
        }

        if (signatureRef.current !== payload) {
          signatureRef.current = payload;
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          if (!cancelled) {
            router.refresh();
          }
        }
      } catch {
        // Ignore transient poll errors; the next interval retries.
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, href, router]);

  return null;
}
