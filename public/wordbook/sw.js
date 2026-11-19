/*
 * 단어 그림책 오프라인 저장용 서비스 워커.
 * 범위(scope): /wordbook/  → 단어 그림책 화면에만 적용되고 사이트 나머지에는 영향이 없다.
 *
 * - 그림책 화면(/wordbook/주문ID): 인터넷이 되면 새로 받고, 안 되면 저장해 둔 화면을 보여 준다.
 * - 그림·소리·글꼴·앱 코드(/_next/static)·캐릭터 이미지(/api/media): 한 번 받으면 저장해 두고 그걸 쓴다.
 * - 플레이어가 "cache-book" 메시지로 필요한 주소 목록을 보내면 한꺼번에 받아 둔다.
 *
 * 그림·소리를 바꾸면 VERSION 을 올려야 예전 저장본이 지워진다.
 */
const VERSION = "v1";
const PAGE_CACHE = `wordbook-pages-${VERSION}`;
const ASSET_CACHE = `wordbook-assets-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("wordbook-") && key !== PAGE_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/wordbook/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/api/media/") ||
    url.pathname.startsWith("/uploads/")
  );
}

function isBookPage(url) {
  return url.origin === self.location.origin && /^\/wordbook\/[^/.]+\/?$/.test(url.pathname);
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // 로그인 화면 등으로 넘어간 응답은 저장하지 않는다
    if (response.ok && !response.redirected) {
      await cache.put(request.url.split("?")[0], response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request.url.split("?")[0]);
    if (cached) return cached;
    throw error;
  }
}

async function assetCacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function rangeResponse(request, url) {
  const cache = await caches.open(ASSET_CACHE);
  let cached = await cache.match(url.href, { ignoreVary: true });
  if (!cached) {
    try {
      const full = await fetch(url.href, { credentials: "include" });
      if (full.ok && full.status === 200) {
        await cache.put(url.href, full.clone());
        cached = full;
      }
    } catch {
      // 오프라인이고 저장본도 없음
    }
  }
  if (!cached) return fetch(request);

  const buffer = await cached.arrayBuffer();
  const size = buffer.byteLength;
  const match = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") || "");
  let start = match && match[1] ? Number(match[1]) : 0;
  let end = match && match[2] ? Number(match[2]) : size - 1;
  if (!match || !match[1]) {
    // "bytes=-500" (끝에서 500바이트)
    if (match && match[2]) {
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    }
  }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mp4",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && isBookPage(url)) {
    event.respondWith(pageNetworkFirst(request));
    return;
  }
  // 오디오는 Range 요청으로 온다. 사파리는 206 응답이어야 재생하므로 저장본을 잘라서 준다
  if (request.headers.has("range") && isAsset(url)) {
    event.respondWith(rangeResponse(request, url));
    return;
  }
  if (isAsset(url)) {
    event.respondWith(assetCacheFirst(request));
  }
});

/** 플레이어가 보낸 주소 목록을 모두 받아 저장하고 진행률을 알려 준다 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-book") return;
  const port = event.ports && event.ports[0];
  event.waitUntil(
    (async () => {
      const pageCache = await caches.open(PAGE_CACHE);
      const assetCache = await caches.open(ASSET_CACHE);
      const urls = Array.from(new Set(data.urls || []));
      let done = 0;
      let failed = 0;

      if (data.pageUrl) {
        try {
          const response = await fetch(data.pageUrl, { credentials: "include" });
          if (response.ok && !response.redirected) {
            await pageCache.put(data.pageUrl.split("?")[0], response);
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }

      const queue = urls.slice();
      const worker = async () => {
        while (queue.length) {
          const url = queue.shift();
          try {
            const hit = await assetCache.match(url, { ignoreVary: true });
            if (!hit) {
              const response = await fetch(url, { credentials: "include" });
              if (response.ok && response.status === 200) {
                await assetCache.put(url, response);
              } else {
                failed += 1;
              }
            }
          } catch {
            failed += 1;
          }
          done += 1;
          if (port) port.postMessage({ type: "progress", done, total: urls.length });
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      if (port) port.postMessage({ type: "done", total: urls.length, failed });
    })(),
  );
});
