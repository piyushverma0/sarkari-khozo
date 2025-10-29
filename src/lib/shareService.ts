/**
 * Share Service
 * 
 * Handles sharing schemes/exams via Web Share API and fallback methods.
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category?: string;
}

export interface ShareAnalytics {
  itemId: string;
  shareMethod: 'native' | 'copy' | 'whatsapp' | 'telegram' | 'twitter' | 'facebook';
  timestamp: string;
}

class ShareService {
  private static instance: ShareService;
  private supportsNativeShare: boolean = false;

  private constructor() {
    if (typeof navigator !== 'undefined') {
      this.supportsNativeShare = 'share' in navigator;
    }
  }

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  /**
   * Share using Web Share API or fallback
   */
  async share(data: ShareData): Promise<{ success: boolean; method: string }> {
    try {
      // Try native share first
      if (this.supportsNativeShare) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });

        await this.trackShare(data.url, 'native');
        return { success: true, method: 'native' };
      }

      // Fallback: Copy to clipboard
      return await this.copyToClipboard(data);
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }

      console.error('Share error:', error);
      
      // Try clipboard fallback
      return await this.copyToClipboard(data);
    }
  }

  /**
   * Copy link to clipboard
   */
  private async copyToClipboard(data: ShareData): Promise<{ success: boolean; method: string }> {
    try {
      const shareText = `${data.title}\n\n${data.text}\n\n${data.url}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        await this.trackShare(data.url, 'copy');
        return { success: true, method: 'copy' };
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        await this.trackShare(data.url, 'copy');
        return { success: true, method: 'copy' };
      }

      return { success: false, method: 'failed' };
    } catch (error) {
      console.error('Clipboard error:', error);
      return { success: false, method: 'failed' };
    }
  }

  /**
   * Share via WhatsApp
   */
  shareViaWhatsApp(data: ShareData): void {
    const text = encodeURIComponent(`${data.title}\n\n${data.text}\n\n${data.url}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    
    window.open(whatsappUrl, '_blank');
    this.trackShare(data.url, 'whatsapp');
  }

  /**
   * Share via Telegram
   */
  shareViaTelegram(data: ShareData): void {
    const text = encodeURIComponent(data.text);
    const url = encodeURIComponent(data.url);
    const telegramUrl = `https://t.me/share/url?url=${url}&text=${text}`;
    
    window.open(telegramUrl, '_blank');
    this.trackShare(data.url, 'telegram');
  }

  /**
   * Share via Twitter
   */
  shareViaTwitter(data: ShareData): void {
    const text = encodeURIComponent(`${data.title}\n${data.text}`);
    const url = encodeURIComponent(data.url);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    
    window.open(twitterUrl, '_blank');
    this.trackShare(data.url, 'twitter');
  }

  /**
   * Share via Facebook
   */
  shareViaFacebook(data: ShareData): void {
    const url = encodeURIComponent(data.url);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    
    window.open(facebookUrl, '_blank');
    this.trackShare(data.url, 'facebook');
  }

  /**
   * Generate shareable link
   */
  generateShareLink(itemId: string, type: 'scheme' | 'exam' | 'job' | 'startup'): string {
    const baseUrl = window.location.origin;
    
    // Add UTM parameters for tracking
    const params = new URLSearchParams({
      utm_source: 'share',
      utm_medium: 'social',
      utm_campaign: 'discovery',
    });

    return `${baseUrl}/application/${itemId}?${params.toString()}`;
  }

  /**
   * Generate share text
   */
  generateShareText(
    title: string,
    type: 'scheme' | 'exam' | 'job' | 'startup',
    deadline?: string
  ): string {
    const typeText = {
      scheme: 'government scheme',
      exam: 'exam',
      job: 'job opportunity',
      startup: 'startup program',
    }[type];

    let text = `Check out this ${typeText}: ${title}`;

    if (deadline) {
      const deadlineDate = new Date(deadline);
      const daysLeft = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 0 && daysLeft <= 30) {
        text += ` - Apply within ${daysLeft} days!`;
      }
    }

    text += '\n\nFound on Sarkari Khozo - Your gateway to government opportunities.';

    return text;
  }

  /**
   * Track share analytics
   */
  private async trackShare(
    url: string,
    method: 'native' | 'copy' | 'whatsapp' | 'telegram' | 'twitter' | 'facebook'
  ): Promise<void> {
    try {
      // Extract item ID from URL
      const urlObj = new URL(url);
      const itemId = urlObj.pathname.split('/').pop();

      if (!itemId) return;

      // Track in analytics (this could be sent to your analytics service)
      const analytics: ShareAnalytics = {
        itemId,
        shareMethod: method,
        timestamp: new Date().toISOString(),
      };

      // Store in localStorage for now (could be sent to backend)
      const shares = JSON.parse(localStorage.getItem('share_analytics') || '[]');
      shares.push(analytics);
      localStorage.setItem('share_analytics', JSON.stringify(shares.slice(-100))); // Keep last 100

      // Could also send to backend
      console.log('Share tracked:', analytics);
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  }

  /**
   * Get share count for an item
   */
  getShareCount(itemId: string): number {
    try {
      const shares = JSON.parse(localStorage.getItem('share_analytics') || '[]');
      return shares.filter((s: ShareAnalytics) => s.itemId === itemId).length;
    } catch {
      return 0;
    }
  }

  /**
   * Check if native share is supported
   */
  isNativeShareSupported(): boolean {
    return this.supportsNativeShare;
  }

  /**
   * Get share button data
   */
  getShareOptions(): Array<{
    name: string;
    icon: string;
    color: string;
    action: (data: ShareData) => void;
  }> {
    return [
      {
        name: 'WhatsApp',
        icon: 'whatsapp',
        color: '#25D366',
        action: (data) => this.shareViaWhatsApp(data),
      },
      {
        name: 'Telegram',
        icon: 'telegram',
        color: '#0088cc',
        action: (data) => this.shareViaTelegram(data),
      },
      {
        name: 'Twitter',
        icon: 'twitter',
        color: '#1DA1F2',
        action: (data) => this.shareViaTwitter(data),
      },
      {
        name: 'Facebook',
        icon: 'facebook',
        color: '#4267B2',
        action: (data) => this.shareViaFacebook(data),
      },
      {
        name: 'Copy Link',
        icon: 'copy',
        color: '#6B7280',
        action: (data) => this.copyToClipboard(data),
      },
    ];
  }
}

// Export singleton
export const shareService = ShareService.getInstance();
