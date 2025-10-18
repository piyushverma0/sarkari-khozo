import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Send, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CSCLocatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CSCLocatorDialog = ({ open, onOpenChange }: CSCLocatorDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! Let's help you find your nearest Common Service Centre (CSC).\n\nCan you tell me which state you're in?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('find-nearest-csc', {
        body: { messages: newMessages }
      });

      if (error) throw error;

      setMessages([...newMessages, { role: "assistant", content: data.message }]);

      // If the response includes state and district info, show Google Maps button
      const hasLocationInfo = data.message.toLowerCase().includes('search') || 
                              data.message.toLowerCase().includes('google maps');
      
      if (hasLocationInfo) {
        // Extract state and district if possible for better search
        const stateMatch = newMessages.find(m => m.role === "user")?.content;
        if (stateMatch) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `Would you like to open Google Maps now to see CSC locations near you?`
            }]);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMaps = () => {
    // Extract location from conversation
    const userMessages = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
    const searchQuery = `Common Service Centre ${userMessages}`;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const hasLocationData = messages.some(m => 
    m.role === "assistant" && 
    (m.content.toLowerCase().includes('search') || m.content.toLowerCase().includes('google maps'))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="w-5 h-5 text-primary" />
            Find Nearest CSC
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          {hasLocationData && (
            <Button
              onClick={handleOpenMaps}
              className="w-full gap-2"
              variant="secondary"
            >
              <MapPin className="w-4 h-4" />
              Open in Google Maps
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your response..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSCLocatorDialog;
