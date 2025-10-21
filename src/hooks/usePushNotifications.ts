import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const usePushNotifications = (userId: string | undefined) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Check if already subscribed
          registration.pushManager.getSubscription()
            .then((subscription) => {
              setIsSubscribed(!!subscription);
            });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        return true;
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribe = async () => {
    if (!userId) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to enable notifications.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const hasPermission = permission === 'granted' || await requestPermission();
      
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Convert VAPID key to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Convert subscription to JSON
      const subscriptionJson = subscription.toJSON() as unknown as PushSubscription;

      // Save subscription to database
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: subscriptionJson as any })
        .eq('user_id', userId);

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive push notifications for your applications.',
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Subscription Failed',
        description: 'Failed to enable push notifications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from database
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('user_id', userId);

      if (error) throw error;

      setIsSubscribed(false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: 'Unsubscribe Failed',
        description: 'Failed to disable push notifications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
