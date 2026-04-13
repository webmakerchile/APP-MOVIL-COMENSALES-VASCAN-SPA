import { useEffect, useState } from "react";
import { Platform } from "react-native";

function detectIosSafari(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  return isIos && isSafari && !isStandalone;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<any>(null);
  const [showIosGuide] = useState(() => detectIosSafari());

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

  return { canInstall: !!prompt, install, showIosGuide };
}
