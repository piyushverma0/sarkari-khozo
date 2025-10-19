import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Message } from "@/hooks/useVoiceMode";
import { User, Bot, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceConversationViewProps {
  messages: Message[];
  currentTranscript?: string;
}

export const VoiceConversationView = ({ 
  messages,
  currentTranscript 
}: VoiceConversationViewProps) => {
  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={cn(
              "flex gap-3 animate-fade-in",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : message.role === "assistant"
                  ? "bg-muted text-foreground"
                  : "bg-secondary/50 text-muted-foreground italic"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
        ))}

        {/* System action messages */}
        {messages.some(m => m.role === "system") && (
          <div className="flex justify-center animate-fade-in">
            <Badge variant="secondary" className="gap-2">
              <CheckCircle className="h-3 w-3" />
              Action completed
            </Badge>
          </div>
        )}

        {/* Current transcript (live) */}
        {currentTranscript && (
          <div className="flex justify-end gap-3 animate-fade-in opacity-60">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-primary/50 text-primary-foreground border-2 border-primary border-dashed">
              <p className="text-sm">{currentTranscript}</p>
              <span className="text-xs opacity-70 mt-1 block">Listening...</span>
            </div>
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
