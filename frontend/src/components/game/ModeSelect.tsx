import { motion } from "framer-motion";
import { Bot, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ModeSelectProps {
  onSelectAI: () => void;
  onSelectOnline: () => void;
}

export default function ModeSelect({ onSelectAI, onSelectOnline }: ModeSelectProps) {
  const { username } = useAuth();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.h1
        className="font-display text-4xl sm:text-6xl font-black tracking-widest neon-text-cyan mb-2"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        TIC TAC TOE
      </motion.h1>
      <motion.p
        className="text-muted-foreground font-body text-lg mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Choose your battle
      </motion.p>

      {username && (
        <motion.p
          className="text-muted-foreground text-xs font-body mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Welcome, <span className="text-neon-cyan font-display">{username}</span>
        </motion.p>
      )}
      {!username && <div className="mb-10" />}

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md sm:max-w-lg">
        <ModeButton
          icon={<Bot className="w-10 h-10" />}
          label="Play vs AI"
          sublabel="Challenge the machine"
          onClick={onSelectAI}
          variant="cyan"
          delay={0.4}
        />
        <ModeButton
          icon={<Users className="w-10 h-10" />}
          label="Play Online"
          sublabel="Challenge a friend"
          onClick={onSelectOnline}
          variant="magenta"
          delay={0.5}
        />
      </div>
    </motion.div>
  );
}

function ModeButton({ icon, label, sublabel, onClick, variant, delay }: {
  icon: React.ReactNode; label: string; sublabel: string;
  onClick: () => void; variant: 'cyan' | 'magenta'; delay: number;
}) {
  const isCyan = variant === 'cyan';
  return (
    <motion.button
      className={`
        flex-1 flex flex-col items-center gap-3 p-8 rounded-xl border-2 bg-card/50 backdrop-blur-sm
        transition-all duration-300 cursor-pointer
        ${isCyan ? 'border-neon-cyan/30 hover:neon-border-cyan hover:neon-glow-cyan' : 'border-neon-magenta/30 hover:neon-border-magenta hover:neon-glow-magenta'}
      `}
      onClick={onClick}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className={isCyan ? 'text-neon-cyan' : 'text-neon-magenta'}>{icon}</div>
      <span className={`font-display text-xl font-bold ${isCyan ? 'neon-text-cyan' : 'neon-text-magenta'}`}>{label}</span>
      <span className="text-muted-foreground text-sm">{sublabel}</span>
    </motion.button>
  );
}
