import AsyncStorage from "@react-native-async-storage/async-storage";

export const VOICE_OPTIONS = [
  "Casual & Real",
  "Funny & Light",
  "Emotional & Heartfelt",
  "Motivational",
  "Storyteller",
] as const;

export type VoiceOption = (typeof VOICE_OPTIONS)[number];

export type HandlePlatformId =
  | "instagram"
  | "tiktok"
  | "x"
  | "facebook"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "threads"
  | "reddit"
  | "youtube"
  | "substack";

export type Settings = {
  voice: VoiceOption | null;
  handles: Partial<Record<HandlePlatformId, string>>;
  defaultPlatforms: Partial<Record<HandlePlatformId, boolean>>;
};

const STORAGE_KEY = "imagine.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  voice: null,
  handles: {},
  defaultPlatforms: {},
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      voice: parsed.voice ?? null,
      handles: parsed.handles ?? {},
      defaultPlatforms: parsed.defaultPlatforms ?? {},
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
