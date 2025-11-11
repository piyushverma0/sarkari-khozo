// ===========================================================
// NOTIFY NEW STORIES EDGE FUNCTION
// ===========================================================
// This function checks for new stories in the Discover feed
// and sends notifications to users based on their preferences.
// Should be run by a cron job every 6-12 hours.
// ===========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get stories from the last 24 hours that haven't been notified
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: newStories, error: storiesError } = await supabaseClient
      .from('discovery_stories')
      .select('id, headline, summary, category, region, relevance_score, source_name, published_date')
      .gte('published_date', last24Hours)
      .eq('notified', false)
      .order('relevance_score', { ascending: false })
      .order('published_date', { ascending: false })
      .limit(50) // Process top 50 stories

    if (storiesError) throw storiesError

    if (!newStories || newStories.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new stories to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${newStories.length} new stories to process`)

    // Get all users with their notification preferences
    const { data: users, error: usersError } = await supabaseClient
      .from('user_notification_preferences')
      .select('user_id, enabled, categories, priority_threshold, max_daily_notifications')
      .eq('enabled', true)

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with notifications enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = {
      notificationsCreated: 0,
      usersNotified: 0,
      storiesProcessed: 0
    }

    // Process each story
    for (const story of newStories) {
      let usersNotifiedForStory = 0

      // Determine story priority based on relevance score
      let priority = 'MEDIUM'
      if (story.relevance_score >= 9) priority = 'HIGH'
      else if (story.relevance_score >= 7) priority = 'MEDIUM'
      else priority = 'LOW'

      // Check each user's preferences
      for (const user of users) {
        try {
          // Check if user wants notifications for this category
          const categoryKey = story.category.toLowerCase()
          const categories = user.categories || {}

          if (categories[categoryKey] === false) {
            continue // User doesn't want notifications for this category
          }

          // Check priority threshold
          const priorityOrder: Record<string, number> = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4 }
          const userThreshold = priorityOrder[user.priority_threshold] || 2
          const storyPriority = priorityOrder[priority] || 2

          if (storyPriority < userThreshold) {
            continue // Story priority is below user's threshold
          }

          // Check daily limit
          const today = new Date().toISOString().split('T')[0]
          const { count } = await supabaseClient
            .from('application_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .gte('created_at', today)

          if (count && count >= (user.max_daily_notifications || 7)) {
            continue // User has reached daily limit
          }

          // Create notification for this user
          const notification = {
            user_id: user.user_id,
            application_id: '', // No specific application for discover stories
            title: getNotificationTitle(story.category),
            message: `${story.headline.substring(0, 100)}${story.headline.length > 100 ? '...' : ''}`,
            type: 'NEW_OPPORTUNITY',
            notification_channel: priority === 'HIGH' ? 'URGENT' : 'GENERAL',
            priority: priority,
            scheduled_for: new Date().toISOString(),
            delivery_status: 'PENDING',
            metadata: {
              story_id: story.id,
              category: story.category,
              region: story.region,
              relevance_score: story.relevance_score,
              source_name: story.source_name
            }
          }

          const { error: insertError } = await supabaseClient
            .from('application_notifications')
            .insert(notification)

          if (!insertError) {
            usersNotifiedForStory++
            results.notificationsCreated++
          }

        } catch (error) {
          console.error(`Error creating notification for user ${user.user_id}:`, error)
        }
      }

      // Mark story as notified
      await supabaseClient
        .from('discovery_stories')
        .update({ notified: true, updated_at: new Date().toISOString() })
        .eq('id', story.id)

      results.storiesProcessed++
      if (usersNotifiedForStory > 0) {
        results.usersNotified += usersNotifiedForStory
        console.log(`Story "${story.headline}" - notified ${usersNotifiedForStory} users`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.storiesProcessed} stories`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error notifying new stories:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * Get notification title based on category
 */
function getNotificationTitle(category: string): string {
  const titles: Record<string, string> = {
    'Exams': '📚 New Exam Notification',
    'Jobs': '💼 New Job Opportunity',
    'Schemes': '🎁 New Government Scheme',
    'Policies': '📋 New Policy Update',
    'Admissions': '🎓 New Admission Notification'
  }

  return titles[category] || '🔔 New Opportunity'
}
