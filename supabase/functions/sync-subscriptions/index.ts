/**
 * Edge Function: sync-subscriptions
 *
 * Purpose: Scheduled job to sync subscription statuses and handle expirations
 *
 * This function should be triggered by a cron job (e.g., daily at 2 AM)
 * to check all active subscriptions and update their status.
 *
 * It handles:
 * 1. Checking expired subscriptions
 * 2. Updating subscription statuses
 * 3. Sending notifications for expiring subscriptions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncOptions {
  dryRun?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse options
    let options: SyncOptions = { dryRun: false };
    try {
      options = await req.json();
    } catch {
      // No body or invalid JSON, use defaults
    }

    const { dryRun = false } = options;

    console.log(`Starting subscription sync (dryRun: ${dryRun})`);

    const now = new Date();
    const results = {
      processedCount: 0,
      expiredCount: 0,
      updatedCount: 0,
      notifiedCount: 0,
      errors: [] as string[],
    };

    // ========================================================================
    // STEP 1: Find expired premium subscriptions
    // ========================================================================
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("subscription_status", "premium")
      .lt("subscription_end_date", now.toISOString());

    if (expiredError) {
      throw expiredError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired subscriptions`);

    // Update expired subscriptions
    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      for (const subscription of expiredSubscriptions) {
        results.processedCount++;

        try {
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from("user_subscriptions")
              .update({
                subscription_status: "expired",
                updated_at: now.toISOString(),
              })
              .eq("id", subscription.id);

            if (updateError) {
              throw updateError;
            }

            results.updatedCount++;
            results.expiredCount++;
            console.log(`Updated subscription ${subscription.id} to expired`);
          } else {
            console.log(`[DRY RUN] Would update subscription ${subscription.id} to expired`);
          }
        } catch (error: any) {
          const errorMsg = `Error updating subscription ${subscription.id}: ${error?.message || "Unknown error"}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    // ========================================================================
    // STEP 2: Check subscriptions expiring soon (within 3 days)
    // ========================================================================
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringSoon, error: expiringError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("subscription_status", "premium")
      .gt("subscription_end_date", now.toISOString())
      .lt("subscription_end_date", threeDaysFromNow.toISOString())
      .eq("auto_renewing", false); // Only notify if not auto-renewing

    if (expiringError) {
      console.error("Error fetching expiring subscriptions:", expiringError);
    }

    // Send notification for expiring subscriptions
    if (expiringSoon && expiringSoon.length > 0) {
      console.log(`Found ${expiringSoon.length} subscriptions expiring soon`);

      for (const subscription of expiringSoon) {
        try {
          if (!dryRun) {
            await sendExpiryNotification(
              supabase,
              subscription.user_id,
              subscription.subscription_end_date
            );

            results.notifiedCount++;
            console.log(`Notified user ${subscription.user_id} about expiring subscription`);
          } else {
            console.log(`[DRY RUN] Would notify user ${subscription.user_id} about expiring subscription`);
          }
        } catch (error: any) {
          const errorMsg = `Error notifying user ${subscription.user_id}: ${error?.message || "Unknown error"}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    // ========================================================================
    // STEP 3: Return results
    // ========================================================================
    console.log("Sync completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        dryRun,
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in subscription sync:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Send notification to user about expiring subscription
 */
async function sendExpiryNotification(
  supabase: any,
  userId: string,
  expiryDate: string
) {
  const expiryDateObj = new Date(expiryDate);
  const daysRemaining = Math.ceil(
    (expiryDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Insert into application_notifications table
  const { error } = await supabase.from("application_notifications").insert({
    user_id: userId,
    title: "Premium Subscription Expiring Soon",
    message: `Your Premium subscription will expire in ${daysRemaining} days. Renew now to continue enjoying unlimited access to all features.`,
    notification_type: "SUBSCRIPTION_EXPIRING",
    notification_channel: "URGENT",
    priority: "HIGH",
    scheduled_for: new Date().toISOString(),
    metadata: {
      expiryDate: expiryDate,
      daysRemaining: daysRemaining,
      action: "renew_subscription",
    },
  });

  if (error) {
    throw error;
  }
}
