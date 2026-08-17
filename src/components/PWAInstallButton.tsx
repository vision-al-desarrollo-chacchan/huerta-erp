import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PWAInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setHidden(false);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed || hidden || !promptEvent) return null;

  const install = async () => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 rounded-2xl border border-green-200 bg-white p-3 shadow-2xl sm:left-auto sm:w-[390px]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
        <Download size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">Instalar Huerta ERP</p>
        <p className="text-xs text-slate-600">Úsalo como una aplicación en este dispositivo.</p>
      </div>
      <button onClick={install} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
        Instalar
      </button>
      <button onClick={() => setHidden(true)} aria-label="Cerrar" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
        <X size={18} />
      </button>
    </div>
  );
}
