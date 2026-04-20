import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Mail, User, LogIn, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { audioManager } from "@/lib/audioManager";

// Pre-generated floating symbols for the background
const SYMBOLS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  char: i % 2 === 0 ? "✕" : "○",
  left: `${(i * 17 + 7) % 100}%`,
  size: `${1.8 + (i % 5) * 0.7}rem`,
  duration: 10 + (i % 7) * 3,
  delay: (i % 8) * 1.2,
  isCyan: i % 2 === 0,
}));

export default function AuthScreen() {
  const { loginAsGuest, loginWithEmail, isLoading, error } = useAuth();
  const [mode, setMode] = useState<"choice" | "email">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Start atmospheric BGM on the login screen
  useEffect(() => {
    audioManager.startAuthBGM();
    return () => audioManager.stopAuthBGM();
  }, []);

  const handleGuest = async () => {
    audioManager.playClick();
    try {
      await loginAsGuest();
    } catch {
      // handled by context
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError("Email and password are required");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (isSignup && username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters");
      return;
    }
    audioManager.playClick();
    try {
      await loginWithEmail(email.trim(), password, isSignup, isSignup ? username.trim() || undefined : undefined);
    } catch {
      // handled by context
    }
  };

  const displayError = localError || error;
  let submitLabel = "Sign In";
  if (isLoading) submitLabel = "Connecting...";
  else if (isSignup) submitLabel = "Create Account";

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 grid-bg overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* ── Floating X & O background symbols ── */}
      {SYMBOLS.map((sym) => (
        <motion.span
          key={sym.id}
          className="absolute pointer-events-none select-none font-display font-black"
          style={{
            left: sym.left,
            bottom: "-10%",
            fontSize: sym.size,
            color: sym.isCyan
              ? "hsl(180 100% 50%)"
              : "hsl(330 100% 60%)",
            opacity: 0,
          }}
          animate={{
            y: [0, -window.innerHeight * 1.4],
            rotate: [0, sym.isCyan ? 180 : -180],
            opacity: [0, 0.08, 0.08, 0],
          }}
          transition={{
            duration: sym.duration,
            repeat: Infinity,
            delay: sym.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* ── Pulsing glow orb behind title ── */}
      <motion.div
        className="absolute top-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(180 100% 50% / 0.08), transparent 70%)" }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Grid flash lines ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 49.8%, hsl(180 100% 50% / 0.04) 50%, transparent 50.2%)",
          backgroundSize: "120px 100%",
        }}
        animate={{ x: [0, 120] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* ── Title Section ── */}
      <motion.div
        className="flex flex-col items-center z-10 mb-2"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 80, damping: 15 }}
      >
        <motion.div
          className="flex items-center gap-4 mb-3"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Gamepad2 className="w-12 h-12 sm:w-14 sm:h-14 text-neon-cyan drop-shadow-[0_0_12px_hsl(180,100%,50%)]" />
          <h1 className="font-display text-5xl sm:text-7xl font-black tracking-[0.15em] neon-text-cyan">
            Deep Grid Clash
          </h1>
        </motion.div>

        {/* Glowing divider line */}
        <motion.div
          className="h-[2px] w-56 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, hsl(180 100% 50%), transparent)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />

        <motion.p
          className="text-muted-foreground font-display text-xs sm:text-sm tracking-[0.35em] mt-3 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Tic Tac Toe Arena
        </motion.p>
      </motion.div>

      {/* ── Tagline ── */}
      <motion.p
        className="text-muted-foreground font-body text-lg mb-10 z-10 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Zap className="w-4 h-4 text-neon-yellow" />
        Enter the arena
        <Zap className="w-4 h-4 text-neon-yellow" />
      </motion.p>

      {/* ── Choice Mode ── */}
      {mode === "choice" ? (
        <motion.div
          className="flex flex-col gap-4 w-full max-w-xs z-10"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {/* Guest login */}
          <motion.button
            className="relative flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-neon-cyan/30 bg-card/60 backdrop-blur-md hover:neon-border-cyan hover:neon-glow-cyan transition-all duration-300 font-display text-lg font-bold text-foreground disabled:opacity-50 overflow-hidden group"
            onClick={handleGuest}
            disabled={isLoading}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/5 to-neon-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <User className="w-6 h-6 text-neon-cyan" />
            {isLoading ? "Connecting..." : "Quick Play"}
          </motion.button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs font-display tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email login */}
          <motion.button
            className="relative flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-neon-magenta/30 bg-card/60 backdrop-blur-md hover:neon-border-magenta hover:neon-glow-magenta transition-all duration-300 font-display text-lg font-bold text-foreground overflow-hidden group"
            onClick={() => { audioManager.playClick(); setMode("email"); }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-neon-magenta/0 via-neon-magenta/5 to-neon-magenta/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Mail className="w-6 h-6 text-neon-magenta" />
            Sign in with Email
          </motion.button>

          {displayError && (
            <p className="text-destructive text-sm font-body text-center mt-2">{displayError}</p>
          )}
        </motion.div>
      ) : (
        /* ── Email Form ── */
        <motion.form
          className="flex flex-col gap-4 w-full max-w-xs z-10"
          onSubmit={handleEmail}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="font-display text-xl font-bold neon-text-magenta tracking-wider text-center mb-2">
            {isSignup ? "Create Account" : "Sign In"}
          </h2>

          {isSignup && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              minLength={3}
              required
              className="px-4 py-3 rounded-lg border-2 border-border bg-card/60 backdrop-blur-md text-foreground font-body focus:neon-border-magenta focus:outline-none transition-all"
              autoComplete="username"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-3 rounded-lg border-2 border-border bg-card/60 backdrop-blur-md text-foreground font-body focus:neon-border-magenta focus:outline-none transition-all"
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="px-4 py-3 rounded-lg border-2 border-border bg-card/60 backdrop-blur-md text-foreground font-body focus:neon-border-magenta focus:outline-none transition-all"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          {displayError && (
            <p className="text-destructive text-sm font-body text-center">{displayError}</p>
          )}

          <motion.button
            type="submit"
            className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-neon-magenta/50 bg-card/60 backdrop-blur-md font-display text-lg font-bold text-foreground hover:neon-border-magenta hover:neon-glow-magenta transition-all disabled:opacity-50"
            disabled={isLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogIn className="w-5 h-5 text-neon-magenta" />
            {submitLabel}
          </motion.button>

          <button
            type="button"
            className="text-muted-foreground text-sm hover:text-foreground transition-colors font-body"
            onClick={() => { setIsSignup(!isSignup); setLocalError(null); }}
          >
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>

          <button
            type="button"
            className="text-muted-foreground text-xs hover:text-foreground transition-colors font-body"
            onClick={() => { audioManager.playClick(); setMode("choice"); setLocalError(null); }}
          >
            ← Back
          </button>
        </motion.form>
      )}

      {/* ── Bottom version tag ── */}
      <motion.p
        className="absolute bottom-6 text-muted-foreground/30 text-xs font-display tracking-widest z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        v1.0 • Deep Grid Clash
      </motion.p>
    </motion.div>
  );
}
