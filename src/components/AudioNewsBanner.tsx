import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Share2, ChevronDown, ChevronUp, RefreshCw, Radio, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAudioNewsBulletin } from "@/hooks/useAudioNewsBulletin";
import reporterImage from "@/assets/reporter-on-air.jpg";

export const AudioNewsBanner = () => {
  const { bulletin, isLoading, error, trackView, refetch } = useAudioNewsBulletin();
  const { toast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showStoryList, setShowStoryList] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullRefreshing, setIsFullRefreshing] = useState(false);
  
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
      console.log('Setting up audio element with base64 data');
      const audio = audioRef.current;
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(bulletin.audio_base64), c => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        audio.src = URL.createObjectURL(audioBlob);
        console.log('Audio source set successfully');
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
      
      return () => {
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      };
    } else {
      console.log('Audio setup skipped:', { 
        hasAudioRef: !!audioRef.current, 
        hasAudioBase64: !!bulletin?.audio_base64 
      });
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

  const handleGenerateBulletin = async () => {
    try {
      setIsGenerating(true);
      
      toast({
        title: "बुलेटिन बन रहा है...",
        description: "कृपया थोड़ा इंतज़ार करें। यह 30-60 सेकंड ले सकता है।",
      });

      const { data, error } = await supabase.functions.invoke(
        'generate-audio-news-bulletin',
        { body: {} }
      );

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "✅ बुलेटिन तैयार है!",
        description: "आपका ऑडियो न्यूज़ बुलेटिन सफलतापूर्वक बन गया है।",
      });

      // Automatically refresh to show new bulletin
      await refetch();
      
    } catch (error) {
      console.error('Error generating bulletin:', error);
      toast({
        title: "❌ त्रुटि",
        description: error instanceof Error ? error.message : "बुलेटिन बनाने में समस्या आई। कृपया दोबारा कोशिश करें।",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFullRefresh = async () => {
    try {
      setIsFullRefreshing(true);
      
      toast({
        title: "🔄 ताज़ा खबरें खोज रहे हैं...",
        description: "नई खबरें खोजी जा रही हैं और बुलेटिन बनाया जा रहा है। कृपया 30-60 सेकंड प्रतीक्षा करें।",
      });

      // Step 1: Fetch latest news articles
      const { error: scrapeError } = await supabase.functions.invoke(
        'scrape-news-sources',
        { body: {} }
      );

      if (scrapeError) {
        console.error('Scraping error:', scrapeError);
        // Don't throw - continue with existing articles
      }

      // Step 2: Wait for articles to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 3: Generate new bulletin with fresh articles
      const { data, error: bulletinError } = await supabase.functions.invoke(
        'generate-audio-news-bulletin',
        { body: {} }
      );

      if (bulletinError) throw bulletinError;
      if (data?.error) throw new Error(data.error);

      // Step 4: Fetch the new bulletin
      await refetch();

      toast({
        title: "✅ बुलेटिन अपडेट हो गया!",
        description: "नवीनतम खबरों के साथ आपका ऑडियो बुलेटिन तैयार है।",
      });

    } catch (error) {
      console.error('Full refresh error:', error);
      toast({
        title: "❌ अपडेट में समस्या",
        description: "कुछ गड़बड़ हुई। कृपया कुछ देर बाद फिर से कोशिश करें।",
        variant: "destructive",
      });
    } finally {
      setIsFullRefreshing(false);
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
        className="w-full py-8 px-4 animate-fade-in"
        role="region"
        aria-label="Audio news bulletin loading"
      >
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row gap-6 items-center bg-background rounded-2xl overflow-hidden shadow-lg">
            <Skeleton className="w-full md:w-2/5 h-80" />
            <div className="w-full md:w-3/5 p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!bulletin) {
    console.log('AudioNewsBanner: No bulletin data available');
    return (
      <section 
        className="w-full py-8 px-4 animate-fade-in"
        role="region"
        aria-label="Audio news bulletin"
      >
        <div className="container max-w-6xl">
          <div className="rounded-2xl shadow-xl overflow-hidden border border-border transition-all hover:shadow-2xl">
            <div className="flex flex-col md:flex-row">
              {/* Reporter Image Section */}
              <div className="relative w-full md:w-2/5 h-[220px] md:h-[260px]">
                <img
                  src={reporterImage}
                  alt="Hindi News Reporter"
                  className="w-full h-full object-cover"
                />
                <Badge 
                  variant="secondary" 
                  className="absolute top-3 right-3 text-xs px-2 py-0.5"
                  aria-label="No bulletin available"
                >
                  अभी उपलब्ध नहीं
                </Badge>
              </div>

              {/* Content Section */}
              <div className="w-full md:w-3/5 p-5 md:p-7 space-y-4 flex flex-col justify-center">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 font-devanagari">
                    आज की मुख्य खबरें
                  </h2>
                  <p className="text-sm text-muted-foreground font-devanagari">
                    आज का ऑडियो बुलेटिन अभी तक नहीं बना है
                  </p>
                </div>
                <p className="text-sm text-muted-foreground font-devanagari">
                  नीचे दिए गए बटन पर क्लिक करें और ताज़ा खबरों का हिंदी ऑडियो बुलेटिन बनाएं।
                </p>
                <Button 
                  onClick={handleGenerateBulletin}
                  disabled={isGenerating}
                  className="w-fit"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      बुलेटिन बन रहा है...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 mr-2" />
                      ऑडियो बुलेटिन बनाएं
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  console.log('AudioNewsBanner: Bulletin available', { 
    id: bulletin.id, 
    hasAudioBase64: !!bulletin.audio_base64,
    audioBase64Length: bulletin.audio_base64?.length 
  });

  const sortedScripts = [...(bulletin.audio_news_scripts || [])].sort(
    (a, b) => a.story_order - b.story_order
  );

  return (
    <section 
      className="w-full py-8 px-4 animate-fade-in"
      role="region"
      aria-label="Audio news bulletin"
    >
      <div className="container max-w-6xl">
        {/* Main Banner */}
        <div className="bg-background rounded-2xl shadow-xl overflow-hidden border border-border transition-all hover:shadow-2xl">
          <div className="flex flex-col md:flex-row">
            {/* Reporter Image Section */}
            <div className="relative w-full md:w-2/5 h-[180px] sm:h-[220px] md:h-[260px]">
              <img
                src={reporterImage}
                alt="Hindi News Reporter"
                className="w-full h-full object-cover"
              />
              <Badge 
                variant="destructive" 
                className="absolute top-2 right-2 sm:top-3 sm:right-3 text-xs px-2 py-0.5 animate-pulse"
                aria-label="Live broadcast"
              >
                🔴 LIVE
              </Badge>
            </div>

            {/* Audio Player Section */}
            <div className="w-full md:w-3/5 p-4 sm:p-5 md:p-7 space-y-3 bg-gradient-to-br from-amber-900/15 via-orange-950/20 to-stone-900/25 backdrop-blur-sm">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 font-devanagari">
                  {bulletin.title}
                </h2>
                <p className="text-xs text-muted-foreground font-devanagari">{getCurrentDateInHindi()}</p>
              </div>

              {/* Audio Element */}
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                aria-label="Audio news bulletin player"
              />

              {/* Main Player Controls */}
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full"
                    aria-label="Audio progress"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Play/Pause Button */}
                  <Button
                    size="lg"
                    onClick={togglePlayPause}
                    className="h-12 w-12 rounded-full flex-shrink-0"
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </Button>

                  {/* Speed Control */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm text-muted-foreground font-devanagari">गति:</span>
                    <div className="flex gap-1" role="group" aria-label="Playback speed controls">
                      {[0.75, 1, 1.25, 1.5].map((rate) => (
                        <Button
                          key={rate}
                          size="sm"
                          variant={playbackRate === rate ? "default" : "outline"}
                          onClick={() => handleSpeedChange(rate)}
                          className="h-9 px-3 text-xs"
                          aria-label={`Playback speed ${rate}x`}
                          aria-pressed={playbackRate === rate}
                        >
                          {rate}x
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Download, Share & Refresh */}
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownload}
                      aria-label="Download audio"
                      className="h-9 w-9 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleShare}
                      aria-label="Share audio"
                      className="h-9 w-9 p-0"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleFullRefresh}
                      disabled={isFullRefreshing}
                      aria-label="Refresh with latest news"
                      title="Check for new articles and generate fresh bulletin"
                      className="h-9 w-9 p-0"
                    >
                      <RefreshCw className={`h-4 w-4 ${isFullRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Toggle Story List Button */}
              <Button
                variant="outline"
                onClick={() => setShowStoryList(!showStoryList)}
                className="w-full transition-all font-devanagari text-sm"
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
                    className={`w-full text-left p-4 rounded-lg transition-all hover:scale-[1.02] ${
                      currentStoryIndex === index 
                        ? "bg-primary/15 border-2 border-primary shadow-lg hover:bg-primary/20" 
                        : "bg-background hover:bg-accent/50 border border-transparent"
                    }`}
                    role="listitem"
                    aria-label={`Story ${script.story_order}: ${script.discovery_stories?.headline}`}
                    aria-current={currentStoryIndex === index ? "true" : "false"}
                  >
                    <div className="flex items-start gap-3">
                      <Badge 
                        variant={currentStoryIndex === index ? "default" : "outline"} 
                        className="mt-0.5"
                      >
                        {script.story_order}
                      </Badge>
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${currentStoryIndex === index ? "text-foreground" : ""}`}>
                          {script.discovery_stories?.headline || "Loading..."}
                        </p>
                        <p className={`text-xs mt-1 font-devanagari ${currentStoryIndex === index ? "text-foreground/80" : "text-muted-foreground"}`}>
                          {script.hindi_script}
                        </p>
                        <p className={`text-xs mt-1 font-devanagari ${currentStoryIndex === index ? "text-foreground/70" : "text-muted-foreground"}`}>
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
