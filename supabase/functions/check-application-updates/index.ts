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
    console.log('Starting check-application-updates cron job');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate check threshold based on frequency
    const now = new Date();
    const dailyThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weeklyThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch applications that need checking
    const { data: applicationsToCheck, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('applied_confirmed', true)
      .or(`and(source_check_frequency.eq.daily,last_checked_at.lt.${dailyThreshold}),and(source_check_frequency.eq.weekly,last_checked_at.lt.${weeklyThreshold})`)
      .not('url', 'is', null)
      .limit(20); // Process max 20 applications at a time

    if (fetchError) {
      console.error('Error fetching applications:', fetchError);
      throw fetchError;
    }

    if (!applicationsToCheck || applicationsToCheck.length === 0) {
      console.log('No applications need checking at this time');
      return new Response(
        JSON.stringify({ message: 'No applications to check', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${applicationsToCheck.length} applications to check for updates`);

    const results = {
      checked: 0,
      updated: 0,
      failed: 0,
      changes_detected: [] as string[]
    };

    // Process each application
    for (const application of applicationsToCheck) {
      try {
        console.log(`Checking application ${application.id}: ${application.title}`);

        // Call process-query to get fresh data
        const { data: processedData, error: processError } = await supabase.functions.invoke(
          'process-query',
          {
            body: { 
              query: application.url || application.title,
              category: application.category 
            }
          }
        );

        if (processError) {
          console.error(`Error processing query for ${application.id}:`, processError);
          results.failed++;
          continue;
        }

        const freshData = processedData?.applications?.[0];
        if (!freshData) {
          console.log(`No fresh data returned for ${application.id}`);
          results.failed++;
          continue;
        }

        // Compare important dates
        const oldDates = application.important_dates || {};
        const newDates = freshData.important_dates || {};
        let changesDetected = false;
        const changeDetails = [];

        // Check for new or changed dates
        for (const [dateKey, newValue] of Object.entries(newDates)) {
          const oldValue = oldDates[dateKey];
          
          if (!oldValue && newValue) {
            // New date added
            changesDetected = true;
            changeDetails.push(`New date added: ${dateKey} - ${newValue}`);
          } else if (oldValue !== newValue) {
            // Date changed
            changesDetected = true;
            changeDetails.push(`Date changed: ${dateKey} from ${oldValue} to ${newValue}`);
          }
        }

        if (changesDetected) {
          console.log(`Changes detected for ${application.id}:`, changeDetails);
          results.changes_detected.push(`${application.title}: ${changeDetails.join(', ')}`);

          // Update the application with new data
          const { error: updateError } = await supabase
            .from('applications')
            .update({
              important_dates: newDates,
              ai_enrichment: freshData.ai_enrichment,
              last_checked_at: now.toISOString()
            })
            .eq('id', application.id);

          if (updateError) {
            console.error(`Error updating application ${application.id}:`, updateError);
            results.failed++;
            continue;
          }

          // Create status history entry
          await supabase
            .from('application_status_history')
            .insert({
              application_id: application.id,
              previous_status: application.application_status,
              new_status: application.application_status,
              changed_by: 'scraper',
              change_reason: 'Dates updated',
              metadata: { changes: changeDetails }
            });

          // Schedule change alert notification
          await supabase
            .from('application_notifications')
            .insert({
              user_id: application.user_id,
              application_id: application.id,
              notification_type: 'new_date_added',
              title: `${application.title} - Important Update!`,
              message: `Changes detected: ${changeDetails.join('; ')}`,
              scheduled_for: now.toISOString(),
              delivery_status: 'pending'
            });

          results.updated++;
        } else {
          // No changes, just update last_checked_at
          await supabase
            .from('applications')
            .update({ last_checked_at: now.toISOString() })
            .eq('id', application.id);
        }

        results.checked++;

        // Add delay to avoid overwhelming APIs (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error checking application ${application.id}:`, error);
        results.failed++;
      }
    }

    console.log(`Check complete: ${results.checked} checked, ${results.updated} updated, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Application check complete',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-application-updates:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
