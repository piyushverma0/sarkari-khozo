import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { shareService, ShareData } from '@/lib/shareService';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareData;
}

export const ShareDialog = ({ open, onOpenChange, data }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleNativeShare = async () => {
    const result = await shareService.share(data);
    
    if (result.success) {
      toast({
        title: 'Shared successfully!',
        description: result.method === 'copy' ? 'Link copied to clipboard' : 'Shared successfully',
      });
      
      if (result.method === 'copy') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      
      onOpenChange(false);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        shareService.shareViaWhatsApp(data);
        toast({ title: 'Opening WhatsApp...' });
        onOpenChange(false);
      },
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        shareService.shareViaTelegram(data);
        toast({ title: 'Opening Telegram...' });
        onOpenChange(false);
      },
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      action: () => {
        shareService.shareViaTwitter(data);
        toast({ title: 'Opening Twitter...' });
        onOpenChange(false);
      },
    },
    {
      name: 'Facebook',
      icon: '👥',
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => {
        shareService.shareViaFacebook(data);
        toast({ title: 'Opening Facebook...' });
        onOpenChange(false);
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Opportunity
          </DialogTitle>
          <DialogDescription>
            Share this opportunity with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium text-sm mb-1">{data.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{data.text}</p>
          </div>

          {/* Native share button (if supported) */}
          {shareService.isNativeShareSupported() && (
            <Button
              onClick={handleNativeShare}
              className="w-full"
              size="lg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          )}

          {/* Share options grid */}
          <div className="grid grid-cols-2 gap-2">
            {shareOptions.map((option) => (
              <Button
                key={option.name}
                onClick={option.action}
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-xs">{option.name}</span>
              </Button>
            ))}
          </div>

          {/* Copy link button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleNativeShare}
              variant="secondary"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
