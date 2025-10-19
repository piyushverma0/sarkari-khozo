import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { VoiceConversationView } from "./VoiceConversationView";
import { useVoiceMode } from "@/hooks/useVoiceMode";
import { useTextToSpeechService } from "@/hooks/useTextToSpeechService";
import { X, Keyboard, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface VoiceModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceModeModal = ({ open, onOpenChange }: VoiceModeModalProps) => {
  const {
    voiceState,
    transcript,
    conversationContext,
    error,
    isSupported,
    startListening,
    stopListening,
    resetSession,
  } = useVoiceMode();

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeechService();

  // Auto-start listening when modal opens
  useEffect(() => {
    if (open && isSupported) {
      startListening();
    }

    return () => {
      if (open) {
        stopListening();
        stopSpeaking();
      }
    };
  }, [open, isSupported]);

  // Speak assistant responses
  useEffect(() => {
    const lastMessage = conversationContext.conversationHistory[
      conversationContext.conversationHistory.length - 1
    ];

    if (lastMessage && lastMessage.role === "assistant" && !isSpeaking) {
      speak(lastMessage.content);
    }
  }, [conversationContext.conversationHistory, speak, isSpeaking]);

  const handleClose = () => {
    stopListening();
    stopSpeaking();
    resetSession();
    onOpenChange(false);
  };

  const handleSwitchToTyping = () => {
    stopListening();
    stopSpeaking();
    toast({
      title: "Switched to typing mode",
      description: "You can now type your messages in the regular interface.",
    });
    onOpenChange(false);
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Voice Mode Not Supported</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Your browser doesn't support voice recognition. Please try using Chrome, Edge, or Safari.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const statusText = {
    idle: "Ready to start",
    initializing: "Initializing microphone...",
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Speaking...",
    error: error || "An error occurred",
  }[voiceState];

  // Generate suggested follow-ups based on context
  const suggestedActions = [
    "Tell me more",
    "Show more options",
    "Set a reminder",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Top Section */}
        <DialogHeader className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">Voice Mode</DialogTitle>
              <Badge 
                variant={voiceState === "listening" ? "default" : "secondary"}
                className="animate-pulse"
              >
                {statusText}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Language toggle (placeholder for future) */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                disabled
                title="Language switching coming soon"
              >
                <Globe className="h-4 w-4" />
                EN
              </Button>

              {/* Switch to typing */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchToTyping}
                className="gap-2"
              >
                <Keyboard className="h-4 w-4" />
                Type Instead
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Center Section - Visualizer */}
        <div className="flex-shrink-0 p-8 border-b bg-muted/30">
          <VoiceVisualizer state={voiceState} />
          
          {/* Live transcript */}
          {transcript && voiceState === "listening" && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">You said:</p>
              <p className="text-lg font-medium">{transcript}</p>
            </div>
          )}
        </div>

        {/* Bottom Section - Conversation */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <VoiceConversationView
            messages={conversationContext.conversationHistory}
            currentTranscript={voiceState === "listening" ? transcript : undefined}
          />

          {/* Suggested Actions */}
          {conversationContext.conversationHistory.length > 0 && (
            <div className="border-t p-4 bg-background flex-shrink-0">
              <p className="text-xs text-muted-foreground mb-2">Suggested actions:</p>
              <div className="flex gap-2 flex-wrap">
                {suggestedActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // This would trigger the action
                      toast({
                        title: "Action triggered",
                        description: `"${action}" - feature coming soon`,
                      });
                    }}
                    disabled={voiceState !== "idle"}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && voiceState === "error" && (
          <div className="absolute bottom-4 left-4 right-4 animate-fade-in">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
