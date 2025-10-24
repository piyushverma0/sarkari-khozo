import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download, Share2, ChevronDown, ChevronUp, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAudioNewsBulletin } from "@/hooks/useAudioNewsBulletin";
import reporterImage from "@/assets/reporter-gayatri.jpg";

export const AudioNewsBanner = () => {
  const { bulletin, isLoading, error, trackView } = useAudioNewsBulletin();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showStoryList, setShowStoryList] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Track view when audio starts playing
  useEffect(() => {
    if (isPlaying && bulletin && !hasTrackedView) {
      trackView(bulletin.id);
      setHasTrackedView(true);
    }
  }, [isPlaying, bulletin, hasTrackedView, trackView]);

  // Set up audio element
  useEffect(() => {
    if (audioRef.current && bulletin?.audio_base64) {
      const audio = audioRef.current;
      const audioBlob = new Blob(
        [Uint8Array.from(atob(bulletin.audio_base64), c => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      audio.src = URL.createObjectURL(audioBlob);
      
      return () => {
        URL.revokeObjectURL(audio.src);
      };
    }
  }, [bulletin]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.volume = value[0];
      setVolume(value[0]);
    }
  };

  const handleSpeedChange = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handleDownload = () => {
    if (bulletin?.audio_base64) {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(bulletin.audio_base64), c => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bulletin.title}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "डाउनलोड शुरू हो गया" });
    }
  };

  const handleShare = async () => {
    const shareText = `${bulletin?.title} - सुनें आज की मुख्य खबरें`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: window.location.href });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "लिंक कॉपी हो गया" });
    }
  };

  const seekToStory = (index: number) => {
    // Estimate time based on story order (each story ~6 seconds, opening ~3 seconds)
    const estimatedTime = 3 + (index * 6);
    if (audioRef.current) {
      audioRef.current.currentTime = estimatedTime;
      setCurrentTime(estimatedTime);
      setCurrentStoryIndex(index);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getCurrentDateInHindi = () => {
    const date = new Date();
    return date.toLocaleDateString("hi-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <section 
        className="w-full py-8 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-fade-in"
        role="region"
        aria-label="Audio news bulletin loading"
      >
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <Skeleton className="w-full md:w-2/5 h-80 rounded-lg" />
            <div className="w-full md:w-3/5 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !bulletin) {
    return (
      <section 
        className="w-full py-8 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10"
        role="region"
        aria-label="Audio news bulletin error"
      >
        <div className="container max-w-6xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground font-devanagari">{error || "अभी कोई बुलेटिन उपलब्ध नहीं है"}</p>
          </div>
        </div>
      </section>
    );
  }

  const sortedScripts = [...(bulletin.audio_news_scripts || [])].sort(
    (a, b) => a.story_order - b.story_order
  );

  return (
    <section 
      className="w-full py-8 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-fade-in"
      role="region"
      aria-label="Audio news bulletin"
    >
      <div className="container max-w-6xl">
        {/* Main Banner */}
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-border transition-all hover:shadow-2xl">
          <div className="flex flex-col md:flex-row">
            {/* Reporter Image Section */}
            <div className="relative w-full md:w-2/5 min-h-[300px] md:min-h-[400px]">
              <img
                src={reporterImage}
                alt="Gayatri - Hindi News Reporter"
                className="w-full h-full object-cover"
              />
              <Badge 
                variant="destructive" 
                className="absolute top-4 right-4 text-sm px-3 py-1 animate-pulse"
                aria-label="Live broadcast"
              >
                🔴 LIVE
              </Badge>
            </div>

            {/* Audio Player Section */}
            <div className="w-full md:w-3/5 p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-devanagari">
                  आज की 10 खबरें - 1 मिनट में
                </h2>
                <p className="text-sm text-muted-foreground font-devanagari">{getCurrentDateInHindi()}</p>
              </div>

              {/* Audio Element */}
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                aria-label="Audio news bulletin player"
              />

              {/* Play/Pause Controls */}
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="h-16 w-16 rounded-full transition-transform hover:scale-105"
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>

                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full"
                    aria-label="Audio progress"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span aria-label={`Current time ${formatTime(currentTime)}`}>{formatTime(currentTime)}</span>
                    <span aria-label={`Total duration ${formatTime(duration)}`}>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Secondary Controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Volume Control */}
                <div className="flex items-center gap-2 min-w-[150px]">
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                    aria-label="Volume control"
                  />
                </div>

                {/* Speed Control */}
                <div className="flex gap-1" role="group" aria-label="Playback speed controls">
                  {[1, 1.25, 1.5].map((rate) => (
                    <Button
                      key={rate}
                      size="sm"
                      variant={playbackRate === rate ? "default" : "outline"}
                      onClick={() => handleSpeedChange(rate)}
                      className="text-xs transition-all"
                      aria-label={`Playback speed ${rate}x`}
                      aria-pressed={playbackRate === rate}
                    >
                      {rate}x
                    </Button>
                  ))}
                </div>

                {/* Download & Share */}
                <div className="flex gap-2 ml-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDownload}
                    aria-label="Download audio"
                    className="transition-all hover:scale-105"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleShare}
                    aria-label="Share audio"
                    className="transition-all hover:scale-105"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Toggle Story List Button */}
              <Button
                variant="outline"
                onClick={() => setShowStoryList(!showStoryList)}
                className="w-full transition-all font-devanagari"
                aria-expanded={showStoryList}
                aria-controls="story-list"
              >
                📋 सभी खबरें देखें
                {showStoryList ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Story List */}
          {showStoryList && (
            <div 
              id="story-list" 
              className="border-t border-border p-6 bg-muted/30 animate-fade-in"
              role="region"
              aria-label="News story list"
            >
              <h3 className="font-semibold text-lg mb-4 font-devanagari">आज की खबरें:</h3>
              <div className="space-y-2" role="list">
                {sortedScripts.map((script, index) => (
                  <button
                    key={script.id}
                    onClick={() => seekToStory(index)}
                    className={`w-full text-left p-4 rounded-lg transition-all hover:bg-accent/50 hover:scale-[1.02] ${
                      currentStoryIndex === index ? "bg-accent border-2 border-primary" : "bg-background"
                    }`}
                    role="listitem"
                    aria-label={`Story ${script.story_order}: ${script.discovery_stories?.headline}`}
                    aria-current={currentStoryIndex === index ? "true" : "false"}
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        {script.story_order}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {script.discovery_stories?.headline || "Loading..."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-devanagari">
                          {script.hindi_script}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-devanagari">
                          समय: ~{formatTime(3 + (index * 6))}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Waveform Animation (when playing) */}
        {isPlaying && (
          <div 
            className="flex justify-center gap-1 mt-4" 
            role="status" 
            aria-label="Audio playing"
            aria-live="polite"
          >
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
