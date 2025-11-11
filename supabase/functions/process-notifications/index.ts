import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all news items from last 48 hours that haven't been sent to all users
    const { data: recentNews, error: newsError } = await supabase
      .from('discovery_stories')
      .select('*')
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (newsError) throw newsError

    // Get all users with FCM tokens
    const { data: usersWithTokens, error: usersError } = await supabase
      .from('user_fcm_tokens')
      .select('user_id, fcm_token')

    if (usersError) throw usersError

    const userIds = [...new Set(usersWithTokens.map(u => u.user_id))]

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .in('user_id', userIds)

    if (prefError) throw prefError

    // Get notification history to avoid duplicates
    const { data: history, error: histError } = await supabase
      .from('notification_history')
      .select('user_id, news_id')
      .gte('sent_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

    if (histError) throw histError

    const sentMap = new Map()
    history.forEach(h => {
      const key = `${h.user_id}_${h.news_id}`
      sentMap.set(key, true)
    })

    // Get daily counts
    const { data: dailyCounts, error: countError } = await supabase
      .from('user_daily_notification_count')
      .select('user_id, count')
      .eq('date', new Date().toISOString().split('T')[0])

    if (countError) throw countError

    const countMap = new Map()
    dailyCounts.forEach(dc => countMap.set(dc.user_id, dc.count))

    // Score and queue notifications
    const notifications = []
    const now = new Date()
    const currentHour = now.getHours()

    for (const user of usersWithTokens) {
      const userPref = preferences.find(p => p.user_id === user.user_id)
      if (!userPref || !userPref.enabled) continue

      // Check quiet hours
      const quietStart = parseInt(userPref.quiet_hours_start?.split(':')[0] || '22')
      const quietEnd = parseInt(userPref.quiet_hours_end?.split(':')[0] || '8')
      
      const isQuietHours = quietStart > quietEnd 
        ? (currentHour >= quietStart || currentHour < quietEnd)
        : (currentHour >= quietStart && currentHour < quietEnd)

      if (isQuietHours) continue

      // Check daily limit
      const todayCount = countMap.get(user.user_id) || 0
      if (todayCount >= userPref.max_daily_notifications) continue

      // Score each news item for this user
      for (const news of recentNews) {
        const key = `${user.user_id}_${news.id}`
        if (sentMap.has(key)) continue // Already sent

        if (!userPref.categories[news.category]) continue // Category disabled

        // Calculate relevance score based on recency
        const recencyScore = Math.max(0, 100 - (Date.now() - new Date(news.created_at).getTime()) / (1000 * 60 * 60)) // Decay over hours
        const relevanceScore = recencyScore

        // Determine priority
        let priority = 'LOW'
        if (relevanceScore > 70) priority = 'HIGH'
        else if (relevanceScore > 40) priority = 'MEDIUM'

        // Check priority threshold
        const thresholds: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        if (thresholds[priority] < thresholds[userPref.priority_threshold]) continue

        // Create notification title and body based on category
        let title = ''
        let body = ''
        
        if (news.category === 'Exams & Results') {
          title = `New Exam: ${news.headline}`
          body = news.summary || 'Tap to learn more'
        } else if (news.category === 'Government Schemes') {
          title = `New Scheme: ${news.headline}`
          body = news.summary || 'Tap to learn more'
        } else {
          title = `Update: ${news.headline}`
          body = news.summary || 'Tap to read details'
        }

        notifications.push({
          user_id: user.user_id,
          news_id: news.id,
          title: title.substring(0, 100),
          body: body.substring(0, 200),
          priority,
          relevance_score: relevanceScore,
          category: news.category,
          deep_link: `/story/${news.id}`,
          scheduled_for: new Date().toISOString(),
          status: 'pending'
        })
      }
    }

    // Insert into queue
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notification_queue')
        .insert(notifications)

      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        queued: notifications.length,
        message: `Queued ${notifications.length} notifications` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing notifications:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
