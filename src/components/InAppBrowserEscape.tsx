"use client";

import { useEffect } from "react";

export function InAppBrowserEscape() {
  useEffect(() => {
    const ua = navigator.userAgent;
    if (!/KAKAOTALK/i.test(ua)) return;

    const fullUrl = window.location.href;
    const urlWithoutProtocol = fullUrl.replace(/^https?:\/\//, "");

    if (/Android/i.test(ua)) {
      window.location.href = `intent://${urlWithoutProtocol}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fullUrl)};end`;
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      const scheme = fullUrl.startsWith("https://")
        ? "x-safari-https://"
        : "x-safari-http://";
      window.location.href = `${scheme}${urlWithoutProtocol}`;
    }
  }, []);

  return null;
}
