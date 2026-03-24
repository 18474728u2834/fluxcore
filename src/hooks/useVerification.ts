import { useState, useCallback } from "react";

const EMOJI_POOL = [
  "🎮", "🕹️", "🎯", "🏆", "⭐", "🔥", "💎", "🎲", "🎪", "🎭",
  "🌟", "💫", "🚀", "⚡", "🎵", "🎶", "🌈", "🍀", "🦊", "🐉",
  "🦁", "🐺", "🦅", "🐬", "🦋", "🌸", "🌺", "🍄", "🌙", "☀️",
  "🔮", "🗡️", "🛡️", "👑", "💰", "🎁", "🧩", "🎃", "❄️", "🔑",
  "🏅", "🥇", "🎖️", "🏵️", "🎗️", "🧸", "🎠", "🎡", "🎢", "🎬",
];

function generateEmojiCode(length = 20): string {
  const emojis: string[] = [];
  const pool = [...EMOJI_POOL];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    emojis.push(pool[idx]);
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

    // Simulate API verification (in production, this would call Roblox API via edge function)
    await new Promise((r) => setTimeout(r, 2500));

    // Simulated result - in production this checks real Roblox API
    const bioMatch = Math.random() > 0.3;
    const hasGamepass = Math.random() > 0.3;

    if (bioMatch && hasGamepass) {
      setState((s) => ({
        ...s,
        step: "success",
        bioMatch: true,
        hasGamepass: true,
        robloxId: "123456789",
      }));
    } else {
      setState((s) => ({
        ...s,
        step: "failed",
        bioMatch,
        hasGamepass,
        error: !bioMatch
          ? "Bio emoji verification failed. Make sure the emojis are at the start of your bio."
          : "Gamepass not found. Please purchase the required gamepass.",
      }));
    }
  }, [requiredGamepassId]);

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
