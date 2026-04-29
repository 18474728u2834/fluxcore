import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LangCode =
  | "en" | "es" | "fr" | "de" | "pt-BR" | "zh" | "zh-TW" | "ja" | "ko" | "ru"
  | "tr" | "ar" | "no" | "sv" | "da" | "nl" | "it" | "pl" | "fi" | "uk"
  | "cs" | "el" | "he" | "hi" | "id" | "th" | "vi" | "ro" | "hu";

export const LANGUAGES: { code: LangCode; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "pt-BR", label: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "no", label: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "sv", label: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "fi", label: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "pl", label: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "cs", label: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "hu", label: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "ro", label: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "el", label: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "he", label: "Hebrew", native: "עברית", flag: "🇮🇱" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", label: "Chinese (Simplified)", native: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文", flag: "🇹🇼" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "th", label: "Thai", native: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
];

const STORAGE_KEY = "fluxcore_lang";
const CACHE_PREFIX = "fluxcore_i18n_";

function detectBrowserLang(): LangCode {
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  const nav = (navigator.language || "en").toLowerCase();
  // Try exact (pt-br, zh-tw)
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === nav);
  if (exact) return exact.code;
  // Fall back to language part
  const base = nav.split("-")[0];
  const baseMatch = LANGUAGES.find((l) => l.code.toLowerCase() === base);
  if (baseMatch) return baseMatch.code;
  if (nav.startsWith("pt")) return "pt-BR";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

function loadCache(lang: LangCode): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lang);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(lang: LangCode, dict: Record<string, string>) {
  try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(dict)); } catch {}
}

interface I18nContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (text: string) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => detectBrowserLang());
  const [forced, setForced] = useState<LangCode | null>(null);
  const activeLang = forced || lang;

  const dictRef = useRef<Record<string, string>>(loadCache(activeLang));
  const [version, setVersion] = useState(0);
  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  // Reload dict whenever active language changes
  useEffect(() => {
    dictRef.current = loadCache(activeLang);
    setVersion((v) => v + 1);
  }, [activeLang]);

  // Allow ForceEnglish boundary to override
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { lang: LangCode | null };
      setForced(detail.lang);
    };
    window.addEventListener("fluxcore:force-lang", handler);
    return () => window.removeEventListener("fluxcore:force-lang", handler);
  }, []);

  const flush = useCallback(async () => {
    if (inflightRef.current) return;
    if (activeLang === "en") { pendingRef.current.clear(); return; }
    const all = Array.from(pendingRef.current);
    if (all.length === 0) return;
    pendingRef.current = new Set();
    inflightRef.current = true;

    // Split into chunks of 80 and fire in parallel for much faster loads
    const CHUNK = 80;
    const chunks: string[][] = [];
    for (let i = 0; i < all.length; i += CHUNK) chunks.push(all.slice(i, i + CHUNK));

    try {
      const results = await Promise.all(
        chunks.map((batch) =>
          supabase.functions
            .invoke("translate-batch", { body: { strings: batch, lang: activeLang } })
            .then((r) => ({ batch, data: r.data, error: r.error }))
            .catch((e) => ({ batch, data: null, error: e }))
        )
      );
      const next = { ...dictRef.current };
      for (const { batch, data, error } of results) {
        if (!error && data?.translations) {
          Object.assign(next, data.translations);
        }
        // Mark misses so we don't refetch this session
        for (const s of batch) if (!next[s]) next[s] = s;
      }
      dictRef.current = next;
      saveCache(activeLang, next);
      setVersion((v) => v + 1);
    } catch (e) {
      console.warn("translate-batch failed:", e);
    } finally {
      inflightRef.current = false;
      if (pendingRef.current.size > 0) {
        flushTimerRef.current = window.setTimeout(flush, 50);
      }
    }
  }, [activeLang]);

  const queueTranslate = useCallback((text: string) => {
    if (activeLang === "en") return;
    if (dictRef.current[text]) return;
    pendingRef.current.add(text);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(flush, 30);
  }, [activeLang, flush]);

  const t = useCallback((text: string) => {
    if (!text || activeLang === "en") return text;
    const cached = dictRef.current[text];
    if (cached) return cached;
    queueTranslate(text);
    return text; // show English while loading — appears instantly, swaps in
    // version dependency forces re-render when dict updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLang, queueTranslate, version]);

  const setLang = useCallback((l: LangCode) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  // Set <html lang> + dir for RTL
  useEffect(() => {
    document.documentElement.lang = activeLang;
    document.documentElement.dir = (activeLang === "ar" || activeLang === "he") ? "rtl" : "ltr";
  }, [activeLang]);

  const value = useMemo(() => ({ lang: activeLang, setLang, t, ready: true }), [activeLang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback — pass-through if provider missing
    return { lang: "en" as LangCode, setLang: () => {}, t: (s: string) => s, ready: true };
  }
  return ctx;
}

/** Wrap a subtree to force English (e.g. /support). */
export function ForceEnglish({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fluxcore:force-lang", { detail: { lang: "en" } }));
    return () => {
      window.dispatchEvent(new CustomEvent("fluxcore:force-lang", { detail: { lang: null } }));
    };
  }, []);
  return <>{children}</>;
}
