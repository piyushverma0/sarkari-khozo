import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of old notifications');

    // Delete notifications older than 90 days that have been delivered
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: deletedNotifications, error: deleteError } = await supabaseClient
      .from('application_notifications')
      .delete()
      .eq('delivery_status', 'delivered')
      .lt('delivered_at', ninetyDaysAgo.toISOString())
      .select();

    if (deleteError) {
      console.error('Error deleting old notifications:', deleteError);
      throw deleteError;
    }

    // Delete failed notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: deletedFailed, error: failedError } = await supabaseClient
      .from('application_notifications')
      .delete()
      .eq('delivery_status', 'failed')
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();

    if (failedError) {
      console.error('Error deleting failed notifications:', failedError);
      throw failedError;
    }

    console.log(`Cleanup completed: ${deletedNotifications?.length || 0} delivered, ${deletedFailed?.length || 0} failed notifications deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedDelivered: deletedNotifications?.length || 0,
        deletedFailed: deletedFailed?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-old-notifications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
