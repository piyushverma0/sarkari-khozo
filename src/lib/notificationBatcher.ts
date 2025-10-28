import { supabase } from '@/integrations/supabase/client';

export interface BatchedNotification {
  id: string;
  user_id: string;
  type: 'deadline' | 'new_scheme' | 'result' | 'application_status' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  data?: Record<string, any>;
  created_at: string;
  scheduled_for?: string;
}

export class NotificationBatcher {
  private static instance: NotificationBatcher;
  private batchQueue: Map<string, BatchedNotification[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): NotificationBatcher {
    if (!NotificationBatcher.instance) {
      NotificationBatcher.instance = new NotificationBatcher();
    }
    return NotificationBatcher.instance;
  }

  /**
   * Add notification to batch queue
   */
  async addToBatch(notification: Omit<BatchedNotification, 'id' | 'created_at'>): Promise<void> {
    const { user_id } = notification;

    // Get user preferences
    const preferences = await this.getUserPreferences(user_id);

    // Check if notification should be sent
    if (!this.shouldSendNotification(notification, preferences)) {
      console.log('Notification filtered out by preferences');
      return;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      // Schedule for later
      const scheduledFor = this.getNextAvailableTime(preferences);
      notification.scheduled_for = scheduledFor;
    }

    const fullNotification: BatchedNotification = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    // Get or create queue for user
    const queue = this.batchQueue.get(user_id) || [];
    queue.push(fullNotification);
    this.batchQueue.set(user_id, queue);

    // Store in database
    await this.storeNotificationInDB(fullNotification);

    // Schedule batch send based on preferences
    this.scheduleBatchSend(user_id, preferences);
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data?.preferences || {
        batch_notifications: false,
        batch_frequency: 'immediate',
        quiet_hours_enabled: false,
        only_high_priority: false,
      };
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return {
        batch_notifications: false,
        batch_frequency: 'immediate',
      };
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(
    notification: Partial<BatchedNotification>,
    preferences: any
  ): boolean {
    // Check priority filter
    if (preferences.only_high_priority && notification.priority !== 'high') {
      return false;
    }

    // Check category filters
    const typeMapping: Record<string, string> = {
      deadline: 'deadline_reminders',
      new_scheme: 'new_schemes',
      result: 'result_updates',
      application_status: 'application_status',
      recommendation: 'personalized_recommendations',
    };

    const prefKey = typeMapping[notification.type || ''];
    if (prefKey && preferences[prefKey] === false) {
      return false;
    }

    return true;
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(preferences: any): boolean {
    if (!preferences.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = preferences.quiet_hours_start || '22:00';
    const end = preferences.quiet_hours_end || '08:00';

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Get next available time outside quiet hours
   */
  private getNextAvailableTime(preferences: any): string {
    if (!preferences.quiet_hours_enabled) {
      return new Date().toISOString();
    }

    const now = new Date();
    const end = preferences.quiet_hours_end || '08:00';
    const [endHour, endMinute] = end.split(':').map(Number);

    const nextAvailable = new Date();
    nextAvailable.setHours(endHour, endMinute, 0, 0);

    // If end time has passed today, it's already available
    if (nextAvailable <= now) {
      return now.toISOString();
    }

    return nextAvailable.toISOString();
  }

  /**
   * Schedule batch send based on user preferences
   */
  private scheduleBatchSend(userId: string, preferences: any): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // If immediate or no batching, send now
    if (!preferences.batch_notifications || preferences.batch_frequency === 'immediate') {
      this.sendBatch(userId);
      return;
    }

    // Calculate delay based on frequency
    let delay = 0;
    switch (preferences.batch_frequency) {
      case 'hourly':
        delay = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        delay = this.getTimeUntilNextDaily(); // Next day at 9 AM
        break;
      case 'weekly':
        delay = this.getTimeUntilNextWeekly(); // Next Monday at 9 AM
        break;
    }

    const timer = setTimeout(() => {
      this.sendBatch(userId);
    }, delay);

    this.batchTimers.set(userId, timer);
  }

  /**
   * Calculate time until next daily digest (9 AM)
   */
  private getTimeUntilNextDaily(): number {
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime() - now.getTime();
  }

  /**
   * Calculate time until next weekly digest (Monday 9 AM)
   */
  private getTimeUntilNextWeekly(): number {
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);

    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);

    return next.getTime() - now.getTime();
  }

  /**
   * Send batched notifications
   */
  private async sendBatch(userId: string): Promise<void> {
    const queue = this.batchQueue.get(userId);
    if (!queue || queue.length === 0) return;

    try {
      // Group by priority
      const highPriority = queue.filter(n => n.priority === 'high');
      const others = queue.filter(n => n.priority !== 'high');

      // Send high priority immediately
      for (const notification of highPriority) {
        await this.sendSingleNotification(notification);
      }

      // Group others if more than 3
      if (others.length > 3) {
        await this.sendGroupedNotification(userId, others);
      } else {
        for (const notification of others) {
          await this.sendSingleNotification(notification);
        }
      }

      // Clear queue
      this.batchQueue.delete(userId);
      this.batchTimers.delete(userId);

      // Mark as sent in database
      await this.markNotificationsSent(queue.map(n => n.id));
    } catch (error) {
      console.error('Error sending batch:', error);
    }
  }

  /**
   * Send single notification
   */
  private async sendSingleNotification(notification: BatchedNotification): Promise<void> {
    try {
      // Try push notification first
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: notification.user_id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      });
    } catch (error) {
      console.error('Push notification failed, trying email:', error);
      
      // Fallback to email
      try {
        await this.sendEmailNotification(notification);
      } catch (emailError) {
        console.error('Email notification also failed:', emailError);
      }
    }
  }

  /**
   * Send grouped notification
   */
  private async sendGroupedNotification(
    userId: string,
    notifications: BatchedNotification[]
  ): Promise<void> {
    const title = `${notifications.length} New Updates`;
    const body = notifications.map(n => `• ${n.title}`).slice(0, 3).join('\n');

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title,
          body: body + (notifications.length > 3 ? '\n...and more' : ''),
          data: {
            type: 'batch',
            count: notifications.length,
            notifications: notifications.map(n => n.id),
          },
        },
      });
    } catch (error) {
      console.error('Failed to send grouped notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: BatchedNotification): Promise<void> {
    try {
      await supabase.functions.invoke('send-email-notification', {
        body: {
          userId: notification.user_id,
          subject: notification.title,
          body: notification.body,
          data: notification.data,
        },
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Store notification in database
   */
  private async storeNotificationInDB(notification: BatchedNotification): Promise<void> {
    try {
      await supabase.from('notification_queue').insert({
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        created_at: notification.created_at,
        scheduled_for: notification.scheduled_for,
        status: 'queued',
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  /**
   * Mark notifications as sent
   */
  private async markNotificationsSent(notificationIds: string[]): Promise<void> {
    try {
      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', notificationIds);
    } catch (error) {
      console.error('Failed to mark notifications as sent:', error);
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { data: scheduled, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'queued')
        .lte('scheduled_for', now);

      if (error) throw error;

      if (scheduled && scheduled.length > 0) {
        for (const notification of scheduled) {
          await this.sendSingleNotification(notification as BatchedNotification);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationBatcher = NotificationBatcher.getInstance();

// Start processing scheduled notifications every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    notificationBatcher.processScheduledNotifications();
  }, 60 * 1000);
}
