// Audio Manager - generates sounds using Web Audio API (no external files needed)

class AudioManager {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private _muted = false;
  private _volume = 0.3;
  private bgmPlaying = false;
  private authBGMPlaying = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getGain(): GainNode {
    this.getCtx();
    return this.gainNode!;
  }

  get muted() { return this._muted; }
  get volume() { return this._volume; }

  setVolume(v: number) {
    this._volume = v;
    if (this.gainNode) this.gainNode.gain.value = this._muted ? 0 : v;
    if (this.bgmGain) this.bgmGain.gain.value = this._muted ? 0 : v * 0.15;
  }

  toggleMute() {
    this._muted = !this._muted;
    this.setVolume(this._volume);
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 1) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = volume * (this._muted ? 0 : this._volume);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  private playNotes(notes: [number, number, number][], type: OscillatorType = 'sine') {
    const ctx = this.getCtx();
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const vol = this._muted ? 0 : this._volume * 0.5;
      g.gain.value = vol;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    });
  }

  playClick() {
    this.playTone(800, 0.08, 'square', 0.3);
  }

  playYourMove() {
    this.playNotes([[523, 0, 0.1], [659, 0.08, 0.12]], 'sine');
  }

  playOpponentMove() {
    this.playNotes([[330, 0, 0.1], [262, 0.08, 0.12]], 'triangle');
  }

  playAIThinking() {
    this.playTone(200, 0.4, 'sine', 0.15);
  }

  playWin() {
    this.playNotes([
      [523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15],
      [1047, 0.45, 0.3],
    ], 'sine');
  }

  playLose() {
    this.playNotes([
      [400, 0, 0.2], [350, 0.2, 0.2], [300, 0.4, 0.3],
    ], 'triangle');
  }

  playDraw() {
    this.playNotes([
      [440, 0, 0.2], [440, 0.25, 0.2], [440, 0.5, 0.3],
    ], 'sine');
  }

  startBGM() {
    if (this.bgmPlaying) return;
    const ctx = this.getCtx();
    this.bgmPlaying = true;

    const playLoop = () => {
      if (!this.bgmPlaying) return;
      // Simple arpeggio loop
      const notes = [262, 330, 392, 523, 392, 330];
      const noteLen = 0.35;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const vol = this._muted ? 0 : this._volume * 0.08;
        g.gain.value = vol;
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * noteLen);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * noteLen + noteLen * 0.9);
        osc.stop(ctx.currentTime + i * noteLen + noteLen);
      });
      setTimeout(playLoop, notes.length * noteLen * 1000);
    };
    playLoop();
  }

  stopBGM() {
    this.bgmPlaying = false;
  }

  /** Atmospheric retro-arcade BGM for the login/auth screen */
  startAuthBGM() {
    if (this.authBGMPlaying) return;
    const ctx = this.getCtx();
    this.authBGMPlaying = true;

    const playLoop = () => {
      if (!this.authBGMPlaying) return;
      const vol = this._muted ? 0 : this._volume;

      // Chord progression: Am → F → C → G (cinematic game-menu feel)
      const bars: { bass: number; arp: number[]; shimmer: number }[] = [
        { bass: 110,   arp: [220, 262, 330, 440, 330, 262], shimmer: 440 },
        { bass: 87.3,  arp: [175, 220, 262, 349, 262, 220], shimmer: 349 },
        { bass: 130.8, arp: [262, 330, 392, 523, 392, 330], shimmer: 523 },
        { bass: 98,    arp: [196, 247, 294, 392, 294, 247], shimmer: 392 },
      ];

      const barDur = 2.4;
      const totalDur = bars.length * barDur;

      bars.forEach((bar, bi) => {
        const barStart = bi * barDur;

        // — Bass: sustained low sine —
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = bar.bass;
        bassGain.gain.value = vol * 0.07;
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(ctx.currentTime + barStart);
        bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + barStart + barDur * 0.95);
        bassOsc.stop(ctx.currentTime + barStart + barDur);

        // — Arpeggio: triangle wave notes —
        const noteLen = barDur / bar.arp.length;
        bar.arp.forEach((freq, ni) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          g.gain.value = vol * 0.045;
          osc.connect(g);
          g.connect(ctx.destination);
          const start = ctx.currentTime + barStart + ni * noteLen;
          osc.start(start);
          g.gain.exponentialRampToValueAtTime(0.001, start + noteLen * 0.85);
          osc.stop(start + noteLen);
        });

        // — High shimmer: soft sine pad —
        const shimOsc = ctx.createOscillator();
        const shimGain = ctx.createGain();
        shimOsc.type = 'sine';
        shimOsc.frequency.value = bar.shimmer;
        shimGain.gain.value = vol * 0.018;
        shimOsc.connect(shimGain);
        shimGain.connect(ctx.destination);
        shimOsc.start(ctx.currentTime + barStart + barDur * 0.4);
        shimGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + barStart + barDur);
        shimOsc.stop(ctx.currentTime + barStart + barDur + 0.01);
      });

      setTimeout(playLoop, totalDur * 1000);
    };

    playLoop();
  }

  stopAuthBGM() {
    this.authBGMPlaying = false;
  }
}

export const audioManager = new AudioManager();
