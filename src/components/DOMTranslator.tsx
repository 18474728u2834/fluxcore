import { useEffect, useRef } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useLocation } from "react-router-dom";

/**
 * Walks the live DOM, collects visible English text nodes & common
 * attributes (placeholder, title, aria-label), translates them via t(),
 * and replaces in-place. Re-runs on route changes and DOM mutations.
 *
 * Skips elements marked with `data-no-translate` or inside <script>/<style>/<code>.
 */

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "NOSCRIPT", "SVG", "PATH"]);
const ATTR_TARGETS = ["placeholder", "title", "aria-label"];
// Don't bother translating these patterns (numbers, emails, urls, brand-only)
const SKIP_PATTERNS = [
  /^[\s\d.,:%+\-/x×*]+$/, // pure numbers/symbols
  /^https?:\/\//i,
  /^[\w.+-]+@[\w-]+\.[\w.-]+$/, // emails
  /^[#@]?\w+$/, // single token like "Fluxcore"
];

function shouldTranslate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.length > 500) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  for (const p of SKIP_PATTERNS) if (p.test(trimmed)) return false;
  return true;
}

function isInsideSkipped(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p) {
    if (p.nodeType === Node.ELEMENT_NODE) {
      const el = p as HTMLElement;
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.hasAttribute && el.hasAttribute("data-no-translate")) return true;
    }
    p = p.parentNode;
  }
  return false;
}

export function DOMTranslator() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (lang === "en") return;

    const translatePass = () => {
      const root = document.body;
      if (!root) return;

      // Text nodes
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          if (isInsideSkipped(node)) return NodeFilter.FILTER_REJECT;
          const txt = node.nodeValue;
          if (!shouldTranslate(txt)) return NodeFilter.FILTER_REJECT;
          // Skip if already translated (heuristic: stored on parent)
          const parent = node.parentElement;
          if (parent && parent.getAttribute("data-i18n-src") === txt.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const nodes: Text[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) nodes.push(n as Text);

      for (const node of nodes) {
        const original = node.nodeValue || "";
        const leading = original.match(/^\s*/)?.[0] || "";
        const trailing = original.match(/\s*$/)?.[0] || "";
        const core = original.trim();
        const translated = t(core);
        if (translated !== core) {
          node.nodeValue = leading + translated + trailing;
          if (node.parentElement) node.parentElement.setAttribute("data-i18n-src", core);
        }
      }

      // Attributes
      const elements = root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]");
      elements.forEach((el) => {
        if (el.closest("[data-no-translate]")) return;
        for (const attr of ATTR_TARGETS) {
          const val = el.getAttribute(attr);
          if (!val || !shouldTranslate(val)) continue;
          const stamp = `data-i18n-${attr}`;
          if (el.getAttribute(stamp) === val) continue;
          const translated = t(val);
          if (translated !== val) {
            el.setAttribute(attr, translated);
            el.setAttribute(stamp, val);
          }
        }
      });
    };

    // Initial pass + interval to pick up async-loaded content & translation cache updates
    translatePass();
    const interval = window.setInterval(translatePass, 600);

    // Mutation observer for new content
    const observer = new MutationObserver(() => {
      if (tickRef.current) return;
      tickRef.current = window.setTimeout(() => {
        tickRef.current = null;
        translatePass();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [t, lang, location.pathname]);

  return null;
}
