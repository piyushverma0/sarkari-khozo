import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type WebSocketEvent =
  | 'deadline_approaching'
  | 'new_scheme'
  | 'application_status_update'
  | 'result_published'
  | 'scheme_alert';

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  timestamp: string;
}

export type WebSocketCallback = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  private userId: string | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize WebSocket connection for a user
   */
  async connect(userId: string): Promise<void> {
    if (this.isConnected && this.userId === userId) {
      console.log('Already connected');
      return;
    }

    this.userId = userId;

    try {
      // Subscribe to user-specific channel
      const userChannel = supabase.channel(`user:${userId}`);

      // Subscribe to application updates
      userChannel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'applications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this.handleMessage({
              event: 'application_status_update',
              data: payload.new,
              timestamp: new Date().toISOString(),
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to user channel');
            this.isConnected = true;
          }
        });

      this.channels.set(`user:${userId}`, userChannel);

      // Subscribe to general updates channel
      const generalChannel = supabase.channel('general_updates');

      // New schemes
      generalChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'applications',
          },
          (payload) => {
            this.handleMessage({
              event: 'new_scheme',
              data: payload.new,
              timestamp: new Date().toISOString(),
            });
          }
        )
        .subscribe();

      this.channels.set('general_updates', generalChannel);

      // Subscribe to deadline alerts (broadcast)
      const deadlineChannel = supabase.channel('deadline_alerts');
      
      deadlineChannel
        .on('broadcast', { event: 'deadline_approaching' }, (payload) => {
          this.handleMessage({
            event: 'deadline_approaching',
            data: payload.payload,
            timestamp: new Date().toISOString(),
          });
        })
        .subscribe();

      this.channels.set('deadline_alerts', deadlineChannel);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  async disconnect(): Promise<void> {
    try {
      for (const [key, channel] of this.channels) {
        await supabase.removeChannel(channel);
      }
      this.channels.clear();
      this.callbacks.clear();
      this.isConnected = false;
      this.userId = null;
      console.log('WebSocket disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket:', error);
    }
  }

  /**
   * Subscribe to specific events
   */
  on(event: WebSocketEvent | 'all', callback: WebSocketCallback): () => void {
    const callbacks = this.callbacks.get(event) || new Set();
    callbacks.add(callback);
    this.callbacks.set(event, callbacks);

    // Return unsubscribe function
    return () => {
      const cbs = this.callbacks.get(event);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          this.callbacks.delete(event);
        }
      }
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Call event-specific callbacks
    const eventCallbacks = this.callbacks.get(message.event);
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => callback(message));
    }

    // Call 'all' callbacks
    const allCallbacks = this.callbacks.get('all');
    if (allCallbacks) {
      allCallbacks.forEach((callback) => callback(message));
    }
  }

  /**
   * Send broadcast message
   */
  async broadcast(channelName: string, event: string, payload: any): Promise<void> {
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        console.warn(`Channel ${channelName} not found`);
        return;
      }

      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }

  /**
   * Check connection status
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }
}

// Export singleton
export const websocketManager = WebSocketManager.getInstance();

// Auto-connect when user is logged in
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      websocketManager.connect(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      websocketManager.disconnect();
    }
  });
}
