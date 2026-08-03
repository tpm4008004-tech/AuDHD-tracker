'use client';

import React, { useRef, useEffect } from 'react';

export interface AudioBufferPlayerProps {
  isActive: boolean;
  audioSrc?: string;
}

export const AudioBufferPlayer: React.FC<AudioBufferPlayerProps> = ({
  isActive,
  audioSrc = '/audio/lofi-buffer.mp3',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isActive && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser until user interaction
      });
    } else if (!isActive && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs font-medium">
      <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
      <span>Buffer Active — Ambient audio playing</span>
      <audio
        ref={audioRef}
        src={audioSrc}
        loop
        data-testid="audio-buffer-player"
      />
    </div>
  );
};

export default AudioBufferPlayer;
