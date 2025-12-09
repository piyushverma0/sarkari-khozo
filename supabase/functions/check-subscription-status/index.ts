/**
 * Edge Function: check-subscription-status
 *
 * Purpose: Check user's subscription status and feature access
 *
 * This function:
 * 1. Retrieves user's subscription from database
 * 2. Checks if subscription is still valid
 * 3. Returns subscription status and feature limits
 * 4. Optionally triggers verification with Google Play
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckStatusRequest {
  userId: string;
  forceRefresh?: boolean;
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

    // Parse request body
    const body: CheckStatusRequest = await req.json();
    const { userId, forceRefresh = false } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Checking subscription status for user ${userId}`);

    // ========================================================================
    // STEP 1: Get subscription from database
    // ========================================================================
    const { data: subscription, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    // If no subscription exists, create default free subscription
    if (!subscription) {
      console.log("No subscription found, creating free subscription");

      const { data: newSubscription, error: createError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          subscription_status: "free",
          plan_type: "free",
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return new Response(
        JSON.stringify({
          isPremium: false,
          subscriptionStatus: "free",
          planType: "free",
          expiryDate: null,
          autoRenewing: false,
          featureUsage: await getFeatureUsage(supabase, userId),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // STEP 2: Check if subscription is still valid
    // ========================================================================
    const now = new Date();
    let currentStatus = subscription.subscription_status;
    let isPremium = false;

    if (subscription.subscription_end_date) {
      const expiryDate = new Date(subscription.subscription_end_date);

      if (expiryDate > now && currentStatus === "premium") {
        isPremium = true;
      } else if (expiryDate <= now && currentStatus === "premium") {
        // Subscription expired
        console.log("Subscription expired, updating status");
        currentStatus = "expired";

        await supabase
          .from("user_subscriptions")
          .update({
            subscription_status: "expired",
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    // ========================================================================
    // STEP 3: Get feature usage
    // ========================================================================
    const featureUsage = await getFeatureUsage(supabase, userId);

    // ========================================================================
    // STEP 4: Optional - Force refresh from Google Play
    // ========================================================================
    if (forceRefresh && subscription.purchase_token && isPremium) {
      console.log("Force refresh requested, would verify with Google Play");
      // TODO: Implement Google Play verification
    }

    // ========================================================================
    // STEP 5: Return response
    // ========================================================================
    return new Response(
      JSON.stringify({
        isPremium,
        subscriptionStatus: currentStatus,
        planType: subscription.plan_type,
        expiryDate: subscription.subscription_end_date,
        autoRenewing: subscription.auto_renewing,
        pricingRegion: subscription.pricing_region,
        lastVerified: subscription.last_verified_at,
        featureUsage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error checking subscription status:", error);
    return new Response(
      JSON.stringify({
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
 * Get feature usage counts for the user
 */
async function getFeatureUsage(supabase: any, userId: string) {
  const { data: usage, error } = await supabase
    .from("user_feature_usage")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching feature usage:", error);
  }

  // Default limits for free users
  const FREE_LIMIT = 1;

  return {
    pdf_notes: {
      used: usage?.pdf_notes_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.pdf_notes_first_used_at,
    },
    docx_notes: {
      used: usage?.docx_notes_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.pdf_notes_first_used_at,
    },
    youtube_notes: {
      used: usage?.youtube_notes_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.youtube_notes_first_used_at,
    },
    article_notes: {
      used: usage?.article_notes_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.pdf_notes_first_used_at,
    },
    record_lecture: {
      used: usage?.record_lecture_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.record_lecture_first_used_at,
    },
    upload_audio: {
      used: usage?.upload_audio_count || 0,
      limit: FREE_LIMIT,
      firstUsed: usage?.pdf_notes_first_used_at,
    },
  };
}
