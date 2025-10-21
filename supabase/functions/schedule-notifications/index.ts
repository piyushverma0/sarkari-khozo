import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleNotificationsRequest {
  applicationId: string;
}

interface ImportantDate {
  date: string;
  type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { applicationId }: ScheduleNotificationsRequest = await req.json();
    console.log(`Scheduling notifications for application ${applicationId}, user ${user.id}`);

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    if (!application.applied_confirmed) {
      throw new Error('Application not confirmed by user');
    }

    const notificationPrefs = application.notification_preferences || {
      enabled: true,
      channels: ['push', 'in_app'],
      days_before: [7, 3, 1]
    };

    if (!notificationPrefs.enabled) {
      console.log('Notifications disabled for this application');
      return new Response(
        JSON.stringify({ message: 'Notifications disabled', scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const importantDates = application.important_dates || {};
    const daysBefore = notificationPrefs.days_before || [7, 3, 1];
    const notificationsToSchedule = [];

    // Parse and schedule notifications for each important date
    for (const [dateKey, dateValue] of Object.entries(importantDates)) {
      if (!dateValue || typeof dateValue !== 'string') continue;

      try {
        const targetDate = new Date(dateValue as string);
        if (isNaN(targetDate.getTime())) continue;

        // Schedule notifications for each configured day before
        for (const days of daysBefore) {
          const scheduledFor = new Date(targetDate);
          scheduledFor.setDate(scheduledFor.getDate() - days);

          // Only schedule future notifications
          if (scheduledFor > new Date()) {
            const dateTypeReadable = dateKey
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());

            notificationsToSchedule.push({
              user_id: user.id,
              application_id: applicationId,
              notification_type: 'deadline_reminder',
              title: `${application.title} - ${days} ${days === 1 ? 'day' : 'days'} to go!`,
              message: `${dateTypeReadable} is scheduled for ${targetDate.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}. Time to prepare!`,
              scheduled_for: scheduledFor.toISOString(),
              delivery_status: 'pending',
              metadata: {
                date_key: dateKey,
                target_date: targetDate.toISOString(),
                days_before: days
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error processing date ${dateKey}:`, error);
      }
    }

    if (notificationsToSchedule.length === 0) {
      console.log('No future notifications to schedule');
      return new Response(
        JSON.stringify({ message: 'No future notifications to schedule', scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scheduling ${notificationsToSchedule.length} notifications`);

    // Insert notifications with deduplication
    // First, delete existing pending notifications for this application
    const { error: deleteError } = await supabase
      .from('application_notifications')
      .delete()
      .eq('application_id', applicationId)
      .eq('delivery_status', 'pending');

    if (deleteError) {
      console.error('Error deleting old notifications:', deleteError);
    }

    // Insert new notifications
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('application_notifications')
      .insert(notificationsToSchedule)
      .select();

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      throw insertError;
    }

    console.log(`Successfully scheduled ${insertedNotifications?.length || 0} notifications`);

    return new Response(
      JSON.stringify({
        message: 'Notifications scheduled successfully',
        scheduled: insertedNotifications?.length || 0,
        notifications: insertedNotifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
