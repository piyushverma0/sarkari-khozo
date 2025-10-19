import { useEffect, useRef } from "react";
import { VoiceState } from "@/hooks/useVoiceMode";
import { Mic, Loader2 } from "lucide-react";

interface VoiceVisualizerProps {
  state: VoiceState;
}

export const VoiceVisualizer = ({ state }: VoiceVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const drawWaveform = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      if (state === "listening") {
        // Draw pulsing green waveform for listening
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "hsl(142, 76%, 36%)"); // green
        gradient.addColorStop(0.5, "hsl(142, 76%, 46%)");
        gradient.addColorStop(1, "hsl(142, 76%, 36%)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();

        const amplitude = 40 + Math.sin(time * 0.003) * 20;
        const frequency = 0.02;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * frequency + time * 0.005) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      } else if (state === "speaking") {
        // Draw animated sound waves for speaking
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "hsl(221, 83%, 53%)"); // blue
        gradient.addColorStop(0.5, "hsl(221, 83%, 63%)");
        gradient.addColorStop(1, "hsl(221, 83%, 53%)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        // Multiple waves
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const amplitude = 30 - i * 8 + Math.sin(time * 0.004 + i) * 10;
          const frequency = 0.015 + i * 0.005;

          for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin(x * frequency + time * 0.006 + i * Math.PI / 3) * amplitude;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(drawWaveform);
    };

    if (state === "listening" || state === "speaking") {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {state === "idle" && (
          <Mic className="h-20 w-20 text-muted-foreground" />
        )}
        {state === "initializing" && (
          <Loader2 className="h-20 w-20 text-primary animate-spin" />
        )}
        {state === "processing" && (
          <Loader2 className="h-20 w-20 text-primary animate-spin" />
        )}
        {(state === "listening" || state === "speaking") && (
          <Mic className={`h-20 w-20 ${state === "listening" ? "text-green-600" : "text-blue-600"}`} />
        )}
        {state === "error" && (
          <Mic className="h-20 w-20 text-destructive" />
        )}
      </div>

      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="opacity-80"
        aria-hidden="true"
      />

      {/* Accessibility status */}
      <div className="sr-only" role="status" aria-live="polite">
        {state === "idle" && "Voice mode inactive"}
        {state === "initializing" && "Initializing microphone"}
        {state === "listening" && "Listening to your voice"}
        {state === "processing" && "Processing your request"}
        {state === "speaking" && "Assistant is speaking"}
        {state === "error" && "Voice mode error"}
      </div>
    </div>
  );
};
