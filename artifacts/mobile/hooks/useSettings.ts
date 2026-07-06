import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadSettings().then((s) => {
        if (!cancelled) {
          setSettings(s);
          setLoaded(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const update = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, update, loaded };
}
