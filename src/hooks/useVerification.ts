import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const EMOJI_POOL = [
  "🎮", "🕹️", "🎯", "🏆", "⭐", "🔥", "💎", "🎲", "🎪", "🎭",
  "🌟", "💫", "🚀", "⚡", "🎵", "🎶", "🌈", "🍀", "🦊", "🐉",
  "🦁", "🐺", "🦅", "🐬", "🦋", "🌸", "🌺", "🍄", "🌙", "☀️",
  "🔮", "🗡️", "🛡️", "👑", "💰", "🎁", "🧩", "🎃", "❄️", "🔑",
  "🏅", "🥇", "🎖️", "🏵️", "🎗️", "🧸", "🎠", "🎡", "🎢", "🎬",
];

function generateEmojiCode(length = 20): string {
  const emojis: string[] = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * EMOJI_POOL.length);
    emojis.push(EMOJI_POOL[idx]);
  }
  return emojis.join("");
}

export interface VerificationState {
  step: "input" | "emoji" | "checking" | "success" | "failed";
  robloxUsername: string;
  robloxId: string | null;
  emojiCode: string;
  hasGamepass: boolean;
  bioMatch: boolean;
  error: string | null;
}

export function useVerification(requiredGamepassId: string) {
  const [state, setState] = useState<VerificationState>({
    step: "input",
    robloxUsername: "",
    robloxId: null,
    emojiCode: generateEmojiCode(),
    hasGamepass: false,
    bioMatch: false,
    error: null,
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
          gamepassId: requiredGamepassId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setState((s) => ({
          ...s,
          step: "success",
          bioMatch: true,
          hasGamepass: true,
          robloxId: data.robloxUserId,
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
  }, [state.robloxUsername, state.emojiCode, requiredGamepassId]);

  const reset = useCallback(() => {
    setState({
      step: "input",
      robloxUsername: "",
      robloxId: null,
      emojiCode: generateEmojiCode(),
      hasGamepass: false,
      bioMatch: false,
      error: null,
    });
  }, []);

  return { state, setUsername, proceedToEmoji, regenerateEmojis, verify, reset };
}
