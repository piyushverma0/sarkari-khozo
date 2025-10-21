import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting send-pending-notifications cron job');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Fetch all pending notifications that are due
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('application_notifications')
      .select('*')
      .eq('delivery_status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(100); // Process max 100 at a time to avoid timeouts

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications to send');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingNotifications.length} pending notifications to process`);

    const results = {
      delivered: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        console.log(`Processing notification ${notification.id} for user ${notification.user_id}`);

        // For now, we're marking notifications as delivered to make them visible in-app
        // In a future enhancement, we can add Web Push notifications here
        
        // TODO: Add Web Push notification logic here
        // if (notificationPrefs.channels.includes('push')) {
        //   await sendWebPushNotification(notification);
        // }

        // Mark as delivered
        const { error: updateError } = await supabase
          .from('application_notifications')
          .update({
            delivery_status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`Error updating notification ${notification.id}:`, updateError);
          results.failed++;
          results.errors.push(`Failed to update notification ${notification.id}: ${updateError.message}`);
          
          // Mark as failed
          await supabase
            .from('application_notifications')
            .update({ delivery_status: 'failed' })
            .eq('id', notification.id);
        } else {
          console.log(`Successfully delivered notification ${notification.id}`);
          results.delivered++;
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        results.failed++;
        results.errors.push(`Error processing ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Mark as failed
        await supabase
          .from('application_notifications')
          .update({ delivery_status: 'failed' })
          .eq('id', notification.id);
      }
    }

    console.log(`Notification processing complete: ${results.delivered} delivered, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Notification processing complete',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-pending-notifications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
