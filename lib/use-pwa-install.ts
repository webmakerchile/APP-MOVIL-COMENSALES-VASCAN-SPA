import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setPrompt(null);
    }
  }

  return { canInstall: !!prompt, install };
}
