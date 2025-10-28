import { useEffect, useState, useCallback } from 'react';
import { websocketManager, WebSocketEvent, WebSocketMessage } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

interface UseRealTimeUpdatesOptions {
  events?: WebSocketEvent[] | 'all';
  showToast?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { events = 'all', showToast = true, onMessage } = options;
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      setLastMessage(message);

      if (onMessage) {
        onMessage(message);
      }

      if (showToast) {
        const toastConfig = getToastConfig(message);
        if (toastConfig) {
          toast(toastConfig);
        }
      }
    },
    [showToast, onMessage, toast]
  );

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (events === 'all') {
      const unsub = websocketManager.on('all', handleMessage);
      unsubscribers.push(unsub);
    } else {
      events.forEach((event) => {
        const unsub = websocketManager.on(event, handleMessage);
        unsubscribers.push(unsub);
      });
    }

    // Update connection status
    setIsConnected(websocketManager.isConnectedStatus());

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [events, handleMessage]);

  return {
    isConnected,
    lastMessage,
  };
};

function getToastConfig(message: WebSocketMessage): any {
  switch (message.event) {
    case 'deadline_approaching':
      return {
        title: '⏰ Deadline Approaching',
        description: `${message.data.title} - ${message.data.daysLeft} days left`,
        variant: 'default',
      };

    case 'new_scheme':
      return {
        title: '🎯 New Opportunity',
        description: `${message.data.title} is now available`,
      };

    case 'application_status_update':
      return {
        title: '📋 Application Update',
        description: `Your application status changed to ${message.data.status}`,
      };

    case 'result_published':
      return {
        title: '📊 Result Published',
        description: message.data.title,
      };

    case 'scheme_alert':
      return {
        title: '🔔 New Alert',
        description: message.data.message,
      };

    default:
      return null;
  }
}
