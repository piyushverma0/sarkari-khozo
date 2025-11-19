// ===========================================================
// NOTIFY NEW STORIES EDGE FUNCTION
// ===========================================================
// This function checks for new stories in the Discover feed
// and sends notifications to users based on their preferences.
// Should be run by a cron job every 6-12 hours.
// ===========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Strategy: Send ONE story at a time to prevent notification spam
    // Step 1: Try to get fresh stories from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let { data: newStories, error: storiesError } = await supabaseClient
      .from("discovery_stories")
      .select(
        "id, headline, summary, excerpt, category, region, relevance_score, source_name, source_url, published_date, impact_statement, key_takeaways",
      )
      .gte("published_date", last24Hours)
      .eq("notified", false)
      .order("relevance_score", { ascending: false })
      .order("published_date", { ascending: false })
      .limit(1); // Process only ONE story per run

    if (storiesError) throw storiesError;

    // Step 2: Fallback to older stories (last 3 days) if no fresh content
    if (!newStories || newStories.length === 0) {
      console.log("No fresh stories found, checking last 3 days...");
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgoTimestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: fallbackStories, error: fallbackError } = await supabaseClient
        .from("discovery_stories")
        .select(
          "id, headline, summary, excerpt, category, region, relevance_score, source_name, source_url, published_date, impact_statement, key_takeaways, last_notified_at",
        )
        .gte("published_date", threeDaysAgo)
        .or(`notified.eq.false,last_notified_at.lt.${threeDaysAgoTimestamp},last_notified_at.is.null`)
        .order("relevance_score", { ascending: false })
        .order("published_date", { ascending: false })
        .limit(1);

      if (fallbackError) throw fallbackError;

      newStories = fallbackStories;
    }

    if (!newStories || newStories.length === 0) {
      return new Response(JSON.stringify({ message: "No stories available to notify (checked last 3 days)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found story to notify: "${newStories[0].headline}"`);

    // Get all users with their notification preferences
    const { data: users, error: usersError } = await supabaseClient
      .from("user_notification_preferences")
      .select("user_id, enabled, categories, priority_threshold, max_daily_notifications")
      .eq("enabled", true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = {
      notificationsCreated: 0,
      usersNotified: 0,
      storiesProcessed: 0,
    };

    // Process the single story
    const story = newStories[0];
    let usersNotifiedForStory = 0;

    // Determine story priority based on relevance score
    let priority = "MEDIUM";
    if (story.relevance_score >= 9) priority = "HIGH";
    else if (story.relevance_score >= 7) priority = "MEDIUM";
    else priority = "LOW";

    // Check each user's preferences
    for (const user of users) {
      try {
        // Check if user wants notifications for this category
        const categoryKey = story.category.toLowerCase();
        const categories = user.categories || {};

        if (categories[categoryKey] === false) {
          continue; // User doesn't want notifications for this category
        }

        // Check priority threshold
        const priorityOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
        const userThreshold = priorityOrder[user.priority_threshold as string] || 2;
        const storyPriority = priorityOrder[priority as string] || 2;

        if (storyPriority < userThreshold) {
          continue; // Story priority is below user's threshold
        }

        // Check daily limit
        const today = new Date().toISOString().split("T")[0];
        const { count } = await supabaseClient
          .from("application_notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .gte("created_at", today);

        if (count && count >= (user.max_daily_notifications || 7)) {
          continue; // User has reached daily limit
        }

        // Format enhanced notification with category badge
        const notificationTitle = formatNotificationTitle(story);
        const notificationMessage = formatNotificationMessage(story);
        const deepLink = `sarkarikhozo://discover/story/${story.id}`;

        // Create notification for this user
        const notification = {
          user_id: user.user_id,
          application_id: null, // No specific application for discover stories
          title: notificationTitle,
          message: notificationMessage,
          notification_type: "NEW_OPPORTUNITY",
          notification_channel: priority === "HIGH" ? "URGENT" : "GENERAL",
          priority: priority,
          scheduled_for: new Date().toISOString(),
          delivery_status: "PENDING",
          metadata: {
            story_id: story.id,
            category: story.category,
            headline: story.headline,
            summary: story.summary,
            impact_statement: story.impact_statement,
            key_takeaways: story.key_takeaways,
            region: story.region,
            relevance_score: story.relevance_score,
            source_name: story.source_name,
            source_url: story.source_url,
            deep_link: deepLink,
          },
        };

        const { error: insertError } = await supabaseClient.from("application_notifications").insert(notification);

        if (insertError) {
          console.error(`Failed to insert notification for user ${user.user_id}:`, insertError);
        } else {
          usersNotifiedForStory++;
          results.notificationsCreated++;
          console.log(`✅ Created notification for user ${user.user_id}`);
        }
      } catch (error) {
        console.error(`Error creating notification for user ${user.user_id}:`, error);
      }
    }

    // Mark story as notified and update last_notified_at
    await supabaseClient
      .from("discovery_stories")
      .update({
        notified: true,
        last_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", story.id);

    results.storiesProcessed++;
    results.usersNotified = usersNotifiedForStory;
    console.log(`Story "${story.headline}" - notified ${usersNotifiedForStory} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.storiesProcessed} stories`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error notifying new stories:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Get category badge emoji
 */
function getCategoryBadge(category: string): string {
  const badges: Record<string, string> = {
    exams: "📚",
    jobs: "💼",
    schemes: "🎁",
    policies: "📋",
    admissions: "🎓",
  };
  return badges[category.toLowerCase()] || "🔔";
}

/**
 * Format notification title with category badge and headline
 * Format: "📚 EXAM • SSC CGL 2024 Application Extended"
 */
function formatNotificationTitle(story: any): string {
  const badge = getCategoryBadge(story.category);
  const categoryTag = story.category.toUpperCase();
  const headline = story.headline;

  return `${badge} ${categoryTag} • ${headline}`;
}

/**
 * Format notification message with impact statement or summary
 * Prefer impact_statement (short, actionable), fallback to summary
 */
function formatNotificationMessage(story: any): string {
  // Prefer impact_statement (short, benefit-focused)
  if (story.impact_statement && story.impact_statement.trim().length > 0) {
    return story.impact_statement;
  }

  // Fallback to summary (truncate if needed)
  const summary = story.summary || story.excerpt || "";
  return summary.length > 200 ? summary.substring(0, 197) + "..." : summary;
}
