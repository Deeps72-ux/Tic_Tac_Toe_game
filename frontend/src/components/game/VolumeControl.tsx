import { Volume2, VolumeX } from "lucide-react";
import { audioManager } from "@/lib/audioManager";
import { useState } from "react";

export default function VolumeControl() {
  const [muted, setMuted] = useState(audioManager.muted);

  const toggle = () => {
    audioManager.toggleMute();
    setMuted(audioManager.muted);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm hover:neon-border-cyan transition-all duration-200"
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Volume2 className="w-5 h-5 text-primary" />
      )}
    </button>
  );
}
