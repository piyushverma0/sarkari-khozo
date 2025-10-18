import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ProgramChatDialogProps {
  program: {
    title: string;
    description: string;
    eligibility?: string;
    program_type?: string;
    funding_amount?: string;
    sector?: string;
    stage?: string;
    state_specific?: string;
    dpiit_required?: boolean;
    success_rate?: string;
    documents_required?: any;
    important_dates?: any;
  };
  trigger?: React.ReactNode;
}

const ProgramChatDialog = ({ program, trigger }: ProgramChatDialogProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm here to help you with **${program.title}**. You can ask me anything about this program, eligibility, application process, or similar programs.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context about the program
      const programContext = `
Program: ${program.title}
Type: ${program.program_type || 'N/A'}
Funding: ${program.funding_amount || 'N/A'}
Sector: ${program.sector || 'All Sectors'}
Stage: ${program.stage || 'All Stages'}
Location: ${program.state_specific || 'All India'}
DPIIT Required: ${program.dpiit_required ? 'Yes' : 'No'}
Success Rate: ${program.success_rate || 'N/A'}
Description: ${program.description}
Eligibility: ${program.eligibility || 'Not specified'}
`;

      // Create conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call chat edge function (we'll create this)
      const { data, error } = await supabase.functions.invoke('chat-with-program', {
        body: {
          programContext,
          conversationHistory,
          userMessage: input,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error in chat:', error);
      
      // Check for specific error types
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast({
          variant: 'destructive',
          title: 'Rate Limit Exceeded',
          description: 'Too many requests. Please try again in a few moments.',
        });
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast({
          variant: 'destructive',
          title: 'AI Credits Exhausted',
          description: 'Please add funds to your Lovable AI workspace.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to get response. Please try again.',
        });
      }

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try asking your question again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "How can I prepare for this program?",
    "What documents do I need?",
    `What's the success rate of ${program.title}?`,
    "Show similar programs",
  ];

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Chat with AI
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Program Assistant</DialogTitle>
                  <p className="text-sm text-muted-foreground">Ask me anything about {program.title}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 py-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(question)}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-6 py-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything about this program..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgramChatDialog;
