import { Globe } from "lucide-react";
import { useI18n, LANGUAGES, LangCode } from "@/hooks/useI18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  variant?: "footer" | "compact";
}

export function LanguageSelector({ variant = "footer" }: Props) {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          aria-label="Change language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-medium">{current.flag} {current.native}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "footer" ? "end" : "start"} className="max-h-80 overflow-y-auto w-56">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as LangCode)}
            className={`cursor-pointer ${l.code === lang ? "bg-primary/10 text-primary" : ""}`}
          >
            <span className="mr-2">{l.flag}</span>
            <span className="flex-1">{l.native}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
