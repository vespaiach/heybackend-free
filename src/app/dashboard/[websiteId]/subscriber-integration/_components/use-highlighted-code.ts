"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

export function useHighlightedCode(code: string | null, lang = "html") {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setHtml(null);
      return;
    }

    let cancelled = false;
    codeToHtml(code, { lang, theme: "github-dark" }).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return html;
}
