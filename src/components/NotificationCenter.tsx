import { useState, useEffect } from "react";
import { Bell, Check, Eye, Trash2, ExternalLink, Calendar, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  application_id: string;
  notification_type: string;
  title: string;
  message: string;
  scheduled_for: string;
  delivered_at: string | null;
  delivery_status: string;
  metadata: any;
  created_at: string;
}

interface NotificationCenterProps {
  userId: string;
}

export const NotificationCenter = ({ userId }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('application_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      
      // Count unread (delivered but not dismissed)
      const unread = (data || []).filter(
        n => n.delivery_status === 'delivered' && !n.delivered_at
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('application_notifications')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('application_notifications')
        .update({ delivery_status: 'dismissed' })
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: "Notification dismissed",
      });
      
      fetchNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/category/general/application/${applicationId}`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'status_change':
        return <AlertCircle className="h-4 w-4 text-green-500" />;
      case 'new_date_added':
        return <Bell className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      deadline_reminder: { label: 'Reminder', variant: 'default' },
      status_change: { label: 'Update', variant: 'secondary' },
      new_date_added: { label: 'New Date', variant: 'outline' },
    };
    
    const badge = badges[type] || { label: 'Info', variant: 'outline' };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') {
      return n.delivery_status === 'delivered' && !n.delivered_at;
    }
    return n.delivery_status !== 'dismissed';
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Stay updated on your applications
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="all" className="mt-6" onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All ({notifications.filter(n => n.delivery_status !== 'dismissed').length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No notifications yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Confirm your applications to start receiving reminders
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`glass-card p-4 rounded-lg border transition-all hover:border-primary/50 ${
                        !notification.delivered_at ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {notification.title}
                            </h4>
                            {getNotificationBadge(notification.notification_type)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.scheduled_for), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleViewApplication(notification.application_id)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            {!notification.delivered_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => handleDismiss(notification.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    No unread notifications
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="glass-card p-4 rounded-lg border bg-primary/5 transition-all hover:border-primary/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {notification.title}
                            </h4>
                            {getNotificationBadge(notification.notification_type)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.scheduled_for), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleViewApplication(notification.application_id)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Read
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => handleDismiss(notification.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
