import type { HandlePlatformId } from "@/lib/settings";

export type PlatformMeta = {
  id: HandlePlatformId;
  label: string;
  icon: string;
  styleHint: string;
  profileUrl: (handle?: string) => string;
  composeUrl?: (caption: string, handle?: string) => string;
};

export const PLATFORMS: Record<HandlePlatformId, PlatformMeta> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    icon: "instagram",
    styleHint:
      "Instagram: warm and personal, 1-3 short sentences, emojis welcome, soft call-to-action okay",
    profileUrl: (handle) => (handle ? `https://instagram.com/${handle}` : "https://instagram.com"),
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    icon: "music-note",
    styleHint: "TikTok: punchy and trend-aware, very short, first line has to hook fast",
    profileUrl: (handle) => (handle ? `https://tiktok.com/@${handle}` : "https://tiktok.com"),
  },
  x: {
    id: "x",
    label: "X (Twitter)",
    icon: "twitter",
    styleHint: "X: concise, must fit under 280 characters, conversational, no fluff",
    profileUrl: (handle) => (handle ? `https://x.com/${handle}` : "https://x.com"),
    composeUrl: (caption) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    icon: "facebook",
    styleHint: "Facebook: a little more room, storytelling tone works well, friendly",
    profileUrl: (handle) => (handle ? `https://facebook.com/${handle}` : "https://facebook.com"),
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: "linkedin",
    styleHint: "LinkedIn: professional but still human, 2-4 short sentences, no corporate jargon",
    profileUrl: (handle) => (handle ? `https://linkedin.com/in/${handle}` : "https://linkedin.com"),
  },
  pinterest: {
    id: "pinterest",
    label: "Pinterest",
    icon: "pinterest",
    styleHint: "Pinterest: descriptive and searchable, clearly say what it is",
    profileUrl: (handle) => (handle ? `https://pinterest.com/${handle}` : "https://pinterest.com"),
  },
  snapchat: {
    id: "snapchat",
    label: "Snapchat",
    icon: "snapchat",
    styleHint: "Snapchat: very short, casual, like texting a close friend",
    profileUrl: (handle) => (handle ? `https://snapchat.com/add/${handle}` : "https://snapchat.com"),
  },
  threads: {
    id: "threads",
    label: "Threads",
    icon: "at",
    styleHint: "Threads: casual and conversational, similar to X but a bit warmer",
    profileUrl: (handle) => (handle ? `https://threads.net/@${handle}` : "https://threads.net"),
  },
  reddit: {
    id: "reddit",
    label: "Reddit",
    icon: "reddit",
    styleHint: "Reddit: honest, no-hype, title-style, avoid sounding like an ad",
    profileUrl: (handle) => (handle ? `https://reddit.com/user/${handle}` : "https://reddit.com"),
    composeUrl: (caption) => `https://www.reddit.com/submit?title=${encodeURIComponent(caption)}`,
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    icon: "youtube",
    styleHint: "YouTube: can be a little longer, describe what's happening and add context",
    profileUrl: (handle) => (handle ? `https://youtube.com/@${handle}` : "https://youtube.com"),
  },
  substack: {
    id: "substack",
    label: "Substack",
    icon: "newspaper-variant-outline",
    styleHint: "Substack: newsletter tone, can be longer, more reflective",
    profileUrl: (handle) => (handle ? `https://${handle}.substack.com` : "https://substack.com"),
  },
};

export const HANDLE_PLATFORM_IDS = Object.keys(PLATFORMS) as HandlePlatformId[];
