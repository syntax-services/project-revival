import { useState, useRef, useEffect } from "react";
import { Play, Pause, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  isSelf: boolean;
  time?: string;
  read?: boolean;
}

// Telegram-like static organic voice note waveform distribution
const TELEGRAM_BARS = [
  3, 5, 8, 14, 10, 6, 12, 18, 15, 9, 7, 13, 20, 16, 11, 6, 14, 19, 12, 8,
  10, 16, 22, 17, 12, 6, 9, 15, 18, 13, 8, 11, 16, 10, 5, 4
];

export const AudioPlayer = ({ src, isSelf, time, read }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  const togglePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !waveformRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newProgress = clickX / rect.width;
    const newTime = newProgress * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[210px] sm:min-w-[245px] py-1 select-none">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* 1. Ultra-Minimalist Circular Play/Pause Action Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 rounded-full shrink-0 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-xs",
          isSelf
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-[#0dcaf0] text-white dark:text-slate-950 hover:bg-[#0dcaf0]/90"
        )}
        title={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* 2. Sleek Waveform & Integrated Meta Row */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* Interactive Telegram Waveform */}
        <div
          ref={waveformRef}
          onClick={handleSeek}
          className="flex items-center gap-[2px] h-5 cursor-pointer py-0.5 group/wave"
          title="Click to seek"
        >
          {TELEGRAM_BARS.map((barHeight, idx) => {
            const barProgress = (idx + 0.5) / TELEGRAM_BARS.length;
            const isPlayed = progress >= barProgress;

            return (
              <span
                key={idx}
                className={cn(
                  "w-[2.5px] rounded-full transition-all duration-150 group-hover/wave:scale-y-110 origin-center",
                  isSelf
                    ? isPlayed
                      ? "bg-white"
                      : "bg-white/35"
                    : isPlayed
                      ? "bg-[#0dcaf0] dark:bg-[#0dcaf0]"
                      : "bg-[#0dcaf0]/30 dark:bg-[#0dcaf0]/25"
                )}
                style={{
                  height: `${Math.max(4, isPlaying ? Math.min(20, barHeight * (0.8 + Math.sin(currentTime * 8 + idx * 0.4) * 0.35)) : barHeight)}px`
                }}
              />
            );
          })}
        </div>

        {/* Telegram Integrated Meta Row: Duration + Speed + Seamless Inline Timestamp */}
        <div className={cn(
          "flex items-center justify-between text-[10px] font-mono leading-none tracking-tight gap-2",
          isSelf ? "text-white/85" : "text-slate-600 dark:text-slate-400"
        )}>
          <div className="flex items-center gap-2">
            <span>
              {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
            </span>

            <button
              type="button"
              onClick={togglePlaybackRate}
              className={cn(
                "px-1 py-0.5 rounded text-[9px] font-bold font-sans transition-colors cursor-pointer",
                playbackRate !== 1
                  ? isSelf
                    ? "bg-white/25 text-white"
                    : "bg-[#0dcaf0]/25 text-[#0aa8c8] dark:text-[#0dcaf0] font-black"
                  : "opacity-60 hover:opacity-100"
              )}
              title="Toggle playback speed"
            >
              {playbackRate}x
            </button>
          </div>

          {/* Integrated Timestamp & Read Checkmarks without disturbing container */}
          {time && (
            <div className={cn(
              "flex items-center gap-0.5 text-[9px] font-sans shrink-0 ml-auto",
              isSelf ? "text-white/80" : "text-slate-500 dark:text-slate-400"
            )}>
              <span>{time}</span>
              {isSelf && (
                read ? (
                  <CheckCheck className="h-2.5 w-2.5 text-cyan-200 stroke-[2.5]" />
                ) : (
                  <Check className="h-2.5 w-2.5 opacity-80 stroke-[2]" />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
