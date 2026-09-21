import React, { useState, useEffect, useRef } from 'react';
import { MachineState } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { soundManager } from '../utils/audio';
import { hapticManager } from '../utils/haptics';
import { Activity, Volume2, VolumeX, Vibrate, Lock, Unlock, Sparkles, Timer, Zap } from 'lucide-react';

interface CadenceMetronomeBarProps {
  state: MachineState;
  activeDonor: DonorProfile;
  isCadenceLocked: boolean;
  onToggleCadenceLock: () => void;
  onAutoStrokePulse: () => void;
}

export const CadenceMetronomeBar: React.FC<CadenceMetronomeBarProps> = ({
  state,
  activeDonor,
  isCadenceLocked,
  onToggleCadenceLock,
  onAutoStrokePulse,
}) => {
  const [metronomeAudio, setMetronomeAudio] = useState<boolean>(false);
  const [metronomeHaptic, setMetronomeHaptic] = useState<boolean>(false);
  const [beatPhase, setBeatPhase] = useState<number>(0);
  const [isBeatFlash, setIsBeatFlash] = useState<boolean>(false);

  const optimalFreq = activeDonor.optimalFrequency || 1.8;
  const optimalBpm = Math.round(optimalFreq * 60);
  const optimalIntervalMs = Math.round(1000 / optimalFreq);

  const currentFreq = state.currentFrequency || 0;
  const currentBpm = Math.round(currentFreq * 60);
  const lastIntervalMs = state.lastStrokeIntervalMs;
  const combo = state.rhythmCombo || 0;
  const rating = state.lastTimingRating || 'IDLE';

  const lastBeatTimeRef = useRef<number>(0);
  const autoLockTimerRef = useRef<number | null>(null);

  // Metronome visual & audio animation loop
  useEffect(() => {
    let animId: number;
    const updateBeat = () => {
      const now = performance.now();
      const phase = (now % optimalIntervalMs) / optimalIntervalMs;
      setBeatPhase(phase);

      // Check for beat trigger at phase reset
      if (now - lastBeatTimeRef.current >= optimalIntervalMs * 0.92) {
        lastBeatTimeRef.current = now;
        setIsBeatFlash(true);
        setTimeout(() => setIsBeatFlash(false), 90);

        if (metronomeAudio) {
          soundManager.playMetronomeTick(true);
        }
        if (metronomeHaptic) {
          hapticManager.triggerRhythmBeat();
        }
      }

      animId = requestAnimationFrame(updateBeat);
    };

    animId = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(animId);
  }, [optimalIntervalMs, metronomeAudio, metronomeHaptic]);

  // Cadence Lock Auto-Pacer Loop
  useEffect(() => {
    if (isCadenceLocked) {
      if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current);
      autoLockTimerRef.current = window.setInterval(() => {
        onAutoStrokePulse();
      }, optimalIntervalMs);
    } else {
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    }

    return () => {
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
      }
    };
  }, [isCadenceLocked, optimalIntervalMs, onAutoStrokePulse]);

  // Timing difference calculations
  const freqDiff = Math.abs(currentFreq - optimalFreq);
  const isSweetCadence = freqDiff <= 0.25;

  return (
    <div
      id="cadence-metronome-card"
      className={`rounded-xl border transition-all duration-300 p-2.5 sm:p-3 flex flex-col gap-2 shadow-md ${
        isCadenceLocked
          ? 'bg-slate-900/95 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
          : isSweetCadence
          ? 'bg-slate-900/90 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      {/* 1. Header: Real-time Cadence vs Target Sweet Spot */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              isBeatFlash
                ? 'bg-emerald-400 border-white text-slate-950 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                : 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-slate-200">CADENCE ENGINE</span>
              {isCadenceLocked ? (
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-emerald-300 animate-pulse">
                  LOCKED IN
                </span>
              ) : isSweetCadence ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-300">
                  ON BEAT
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  MANUAL
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Toggles: Audio Metronome, Haptic Pulse, Cadence Lock */}
        <div className="flex items-center gap-1">
          {/* Metronome Audio Tick Toggle */}
          <button
            id="btn-toggle-metronome-audio"
            onClick={() => setMetronomeAudio((p) => !p)}
            title={metronomeAudio ? 'Mute metronome tick sound' : 'Enable audio metronome tick'}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${
              metronomeAudio
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400'
            }`}
          >
            {metronomeAudio ? <Volume2 className="w-3 h-3 text-cyan-400" /> : <VolumeX className="w-3 h-3" />}
            <span className="hidden xs:inline">Tick</span>
          </button>

          {/* Metronome Haptics Buzz Toggle */}
          <button
            id="btn-toggle-metronome-haptic"
            onClick={() => setMetronomeHaptic((p) => !p)}
            title={metronomeHaptic ? 'Disable metronome haptic pulse' : 'Enable haptic vibration on each beat'}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${
              metronomeHaptic
                ? 'bg-pink-950 border-pink-400 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.4)]'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400'
            }`}
          >
            <Vibrate className="w-3 h-3" />
            <span className="hidden xs:inline">Haptic</span>
          </button>

          {/* Cadence Lock Toggle to guarantee exact frequency */}
          <button
            id="btn-toggle-cadence-lock"
            onClick={onToggleCadenceLock}
            title={isCadenceLocked ? 'Unlock manual cadence' : 'Lock cadence at optimal donor sweet spot'}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-black flex items-center gap-1 border transition-all shadow ${
              isCadenceLocked
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 border-white text-slate-950 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isCadenceLocked ? <Lock className="w-3 h-3 text-slate-950" /> : <Unlock className="w-3 h-3" />}
            <span>{isCadenceLocked ? 'LOCK ON' : 'ENSURE'}</span>
          </button>
        </div>
      </div>

      {/* 2. Precision Dual Readout: Target Cadence vs Measured Cadence */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Target Sweet Spot */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3 text-emerald-400" /> Target Pace
            </span>
            <span className="text-emerald-400 font-bold">{optimalBpm} BPM</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-black text-white">{optimalFreq.toFixed(1)} <span className="text-xs font-normal text-slate-400">Hz</span></span>
            <span className="text-[11px] text-slate-400 font-mono">{optimalIntervalMs} ms/stroke</span>
          </div>
        </div>

        {/* Current Measured Cadence */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Real Measured
            </span>
            <span className={currentFreq > 0 ? (isSweetCadence ? 'text-emerald-300 font-bold' : 'text-cyan-300') : 'text-slate-500'}>
              {currentFreq > 0 ? `${currentBpm} BPM` : '0 BPM'}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-base sm:text-lg font-black ${
              currentFreq > 0 ? (isSweetCadence ? 'text-emerald-400' : 'text-cyan-300') : 'text-slate-500'
            }`}>
              {currentFreq.toFixed(1)} <span className="text-xs font-normal text-slate-400">Hz</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {lastIntervalMs ? `${Math.round(lastIntervalMs)} ms` : '-- ms'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Rhythm Metronome Track with Target Hit Zone */}
      <div className="relative w-full bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-hidden flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Rhythm Beat Track</span>
          <span className="text-slate-300 font-semibold">
            {rating === 'PERFECT' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> PERFECT TIMING!
              </span>
            ) : rating === 'GOOD' ? (
              <span className="text-cyan-300 font-bold">GOOD CADENCE</span>
            ) : rating === 'FAST' ? (
              <span className="text-amber-400 font-bold">TOO FAST (Slow Down)</span>
            ) : rating === 'SLOW' ? (
              <span className="text-rose-400 font-bold">TOO SLOW (Speed Up)</span>
            ) : (
              <span>Tap in sync with the pulse</span>
            )}
          </span>
        </div>

        {/* Metronome Pendulum / Beat Sweep Bar */}
        <div className="relative w-full h-4 bg-slate-900 rounded-full border border-slate-800/80 overflow-hidden flex items-center px-1">
          {/* Target Sweet Spot Hit Zone in Center */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1/4 h-full bg-emerald-500/20 border-x border-emerald-400/50 flex items-center justify-center">
            <div className="w-0.5 h-full bg-emerald-400/70" />
          </div>

          {/* Sweeping Beat Marker oscillating smoothly with beatPhase */}
          {(() => {
            // Triangular wave 0 -> 1 -> 0 across the track
            const sweepPos = beatPhase < 0.5 ? beatPhase * 2 : (1 - beatPhase) * 2;
            const leftPercent = sweepPos * 100;
            return (
              <div
                className={`absolute w-3.5 h-3.5 rounded-full -ml-[7px] border shadow-lg transition-transform ${
                  isBeatFlash
                    ? 'bg-white border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,1)] scale-125'
                    : 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                }`}
                style={{ left: `${leftPercent}%` }}
              />
            );
          })()}
        </div>

        {/* Real-time Tap Interval Feedback & Combo Streak */}
        <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
          <div className="flex items-center gap-1 text-slate-400">
            <span>Accuracy:</span>
            <span className={state.cadenceAccuracy > 80 ? 'text-emerald-400 font-bold' : state.cadenceAccuracy > 50 ? 'text-cyan-400' : 'text-slate-400'}>
              {Math.round(state.cadenceAccuracy)}%
            </span>
          </div>

          {combo > 1 ? (
            <div className="flex items-center gap-1 text-emerald-300 font-bold animate-pulse">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{combo}x CADENCE STREAK! (+{Math.min(50, combo * 5)}% stimulation)</span>
            </div>
          ) : (
            <span className="text-slate-500">Hold button or match beat to lock in</span>
          )}
        </div>
      </div>
    </div>
  );
};
