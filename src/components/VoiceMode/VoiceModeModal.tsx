import { useEffect, useState } from "react";
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
import { VoiceProgramCard } from "./VoiceProgramCard";
import { useVoiceMode } from "@/hooks/useVoiceMode";
import { useTextToSpeechService } from "@/hooks/useTextToSpeechService";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { supabase } from "@/integrations/supabase/client";
import { X, Keyboard, Globe, HelpCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceModeModal = ({ open, onOpenChange }: VoiceModeModalProps) => {
  const [displayedPrograms, setDisplayedPrograms] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const {
    voiceState,
    transcript,
    conversationContext,
    error,
    isSupported,
    startListening,
    stopListening,
    resetSession,
    sendMessage,
    handleVoiceCommand,
  } = useVoiceMode();

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeechService();
  const { getHelpText } = useVoiceCommands();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

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

  // Update displayed programs when context changes
  useEffect(() => {
    if (conversationContext.searchResults) {
      setDisplayedPrograms(conversationContext.searchResults);
    } else if (conversationContext.savedPrograms) {
      setDisplayedPrograms(conversationContext.savedPrograms);
    }
  }, [conversationContext.searchResults, conversationContext.savedPrograms]);

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

  const handleSaveProgram = async (program: any, index: number) => {
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save programs",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('applications').insert({
        user_id: userId,
        title: program.title,
        description: program.description,
        category: program.category,
        url: program.url,
        program_type: program.program_type,
        funding_amount: program.funding_amount,
        sector: program.sector,
        stage: program.stage,
        state_specific: program.state_specific,
      });

      if (error) throw error;

      toast({
        title: "Program saved!",
        description: `"${program.title}" has been added to your tracked applications.`,
      });

      // Speak confirmation
      speak(`I've saved ${program.title} to your tracked applications.`);
    } catch (error) {
      console.error('Error saving program:', error);
      toast({
        title: "Error",
        description: "Failed to save program. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = (action: string) => {
    if (voiceState !== 'idle' && voiceState !== 'listening') return;
    
    // Send the action as a voice command
    if (sendMessage && userId) {
      sendMessage(action, userId);
    }
  };

  const handleShowHelp = () => {
    const helpText = getHelpText();
    speak(helpText);
    toast({
      title: "Voice Commands",
      description: "I've spoken the available commands. You can also see them in the conversation.",
    });
  };

  const handleStartOver = () => {
    if (window.confirm("Are you sure you want to start a new conversation? This will clear your current chat history.")) {
      resetSession();
      toast({
        title: "Conversation reset",
        description: "Starting fresh! How can I help you?",
      });
    }
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
  const suggestedActions = displayedPrograms.length > 0
    ? ["Save first program", "Tell me about program 1", "Check eligibility"]
    : conversationContext.category
    ? ["Show more options", "Save this program", "Find similar"]
    : ["Find startup programs", "Show legal opportunities", "Search schemes"];

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
              {/* Help button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShowHelp}
                    >
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Voice commands help</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Start over button */}
              {conversationContext.conversationHistory.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartOver}
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Start new conversation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

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

        {/* Bottom Section - Programs & Conversation */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Display programs if available */}
          {displayedPrograms.length > 0 && (
            <div className="border-b p-4 bg-muted/30 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium mb-3">
                {conversationContext.searchResults ? "Search Results" : "Saved Programs"}
              </p>
              <div className="space-y-2">
                {displayedPrograms.slice(0, 3).map((program, index) => (
                  <VoiceProgramCard
                    key={program.id || index}
                    program={program}
                    index={index}
                    onSave={() => handleSaveProgram(program, index)}
                    onRemind={() => {
                      toast({
                        title: "Reminder feature",
                        description: "Voice reminders coming soon!",
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

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
                    onClick={() => handleQuickAction(action)}
                    disabled={voiceState === "processing" || voiceState === "speaking"}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert with Recovery Options */}
        {error && voiceState === "error" && (
          <div className="absolute bottom-4 left-4 right-4 animate-fade-in">
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <div className="flex gap-2 ml-4">
                  {error.includes("microphone") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open("https://support.google.com/chrome/answer/2693767", "_blank");
                      }}
                    >
                      Help
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      stopListening();
                    }}
                  >
                    Dismiss
                  </Button>
                  {!error.includes("microphone") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        startListening();
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
