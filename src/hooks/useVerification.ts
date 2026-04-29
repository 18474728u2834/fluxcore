import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADJECTIVES = [
  "swift", "bright", "calm", "bold", "quiet", "lucky", "wild", "loyal",
  "noble", "clever", "fierce", "gentle", "rapid", "quirky", "vivid", "stoic",
  "sunny", "amber", "cobalt", "crimson", "midnight", "frosty", "stormy", "mellow",
];
const NOUNS = [
  "tiger", "falcon", "panther", "wolf", "otter", "raven", "lynx", "fox",
  "comet", "ember", "harbor", "ridge", "meadow", "summit", "river", "delta",
  "pixel", "vector", "nebula", "atlas", "echo", "lumen", "axiom", "cipher",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generates a human, brand-feeling verification phrase
// Format: fluxcore-{adj}-{noun}-{4 digits}
// Example: fluxcore-amber-falcon-4127
function generateEmojiCode(): string {
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `fluxcore-${pick(ADJECTIVES)}-${pick(NOUNS)}-${num}`;
}

export interface VerificationState {
  step: "input" | "emoji" | "checking" | "success" | "failed";
  robloxUsername: string;
  robloxId: string | null;
  emojiCode: string;
  hasGamepass: boolean;
  bioMatch: boolean;
  error: string | null;
  tokenHash: string | null;
  email: string | null;
}

interface VerifyOptions {
  checkGamepass?: boolean;
  gamepassId?: string;
}

export function useVerification(options?: VerifyOptions) {
  const [state, setState] = useState<VerificationState>({
    step: "input",
    robloxUsername: "",
    robloxId: null,
    emojiCode: generateEmojiCode(),
    hasGamepass: false,
    bioMatch: false,
    error: null,
    tokenHash: null,
    email: null,
  });

  const setUsername = useCallback((username: string) => {
    setState((s) => ({ ...s, robloxUsername: username }));
  }, []);

  const proceedToEmoji = useCallback(() => {
    if (!state.robloxUsername.trim()) {
      setState((s) => ({ ...s, error: "Please enter your Roblox username" }));
      return;
    }
    setState((s) => ({
      ...s,
      step: "emoji",
      emojiCode: generateEmojiCode(),
      error: null,
    }));
  }, [state.robloxUsername]);

  const regenerateEmojis = useCallback(() => {
    setState((s) => ({ ...s, emojiCode: generateEmojiCode() }));
  }, []);

  const verify = useCallback(async () => {
    setState((s) => ({ ...s, step: "checking", error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("roblox-verify", {
        body: {
          username: state.robloxUsername.trim(),
          emojiCode: state.emojiCode,
          checkGamepass: options?.checkGamepass ?? false,
          gamepassId: options?.gamepassId ?? null,
        },
      });

      if (error) throw error;

      if (data.success) {
        setState((s) => ({
          ...s,
          step: "success",
          bioMatch: true,
          hasGamepass: data.hasGamepass ?? false,
          robloxId: data.robloxUserId,
          tokenHash: data.tokenHash,
          email: data.email,
        }));
      } else {
        setState((s) => ({
          ...s,
          step: "failed",
          bioMatch: data.bioMatch ?? false,
          hasGamepass: data.hasGamepass ?? false,
          error: data.error || "Verification failed.",
        }));
      }
    } catch (err: any) {
      setState((s) => ({
        ...s,
        step: "failed",
        bioMatch: false,
        hasGamepass: false,
        error: err.message || "Something went wrong. Please try again.",
      }));
    }
  }, [state.robloxUsername, state.emojiCode, options?.checkGamepass, options?.gamepassId]);

  const reset = useCallback(() => {
    setState({
      step: "input",
      robloxUsername: "",
      robloxId: null,
      emojiCode: generateEmojiCode(),
      hasGamepass: false,
      bioMatch: false,
      error: null,
      tokenHash: null,
      email: null,
    });
  }, []);

  return { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset };
}
