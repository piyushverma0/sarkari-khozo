import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get OAuth2 access token for FCM v1 API
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  
  const now = Math.floor(Date.now() / 1000)
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`
  
  // Import private key
  const pemKey = serviceAccount.private_key
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  )

  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
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

    // Get service account from secrets
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
    }
    const serviceAccount = JSON.parse(serviceAccountJson)
    const projectId = serviceAccount.project_id

    // Get access token
    const accessToken = await getAccessToken(serviceAccount)

    // Get pending notifications (limit to 100 per batch)
    const { data: pendingNotifications, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('relevance_score', { ascending: false })
      .limit(100)

    if (queueError) throw queueError

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No pending notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get FCM tokens for these users
    const userIds = [...new Set(pendingNotifications.map(n => n.user_id))]
    const { data: tokens, error: tokenError } = await supabase
      .from('user_fcm_tokens')
      .select('user_id, fcm_token')
      .in('user_id', userIds)

    if (tokenError) throw tokenError

    const tokenMap = new Map()
    tokens.forEach(t => {
      if (!tokenMap.has(t.user_id)) {
        tokenMap.set(t.user_id, [])
      }
      tokenMap.get(t.user_id).push(t.fcm_token)
    })

    let sentCount = 0
    let failedCount = 0

    // Send notifications
    for (const notification of pendingNotifications) {
      const userTokens = tokenMap.get(notification.user_id) || []
      
      for (const token of userTokens) {
        try {
          // FCM v1 API message format
          const message = {
            message: {
              token: token,
              notification: {
                title: notification.title,
                body: notification.body
              },
              data: {
                news_id: notification.news_id,
                category: notification.category,
                deep_link: notification.deep_link || '',
                priority: notification.priority
              },
              android: {
                priority: notification.priority === 'HIGH' ? 'high' : 'normal',
                notification: {
                  channel_id: 'news_updates',
                  click_action: notification.deep_link || '',
                  sound: 'default'
                }
              }
            }
          }

          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(message)
            }
          )

          if (response.ok) {
            sentCount++
            
            // Update notification status
            await supabase
              .from('notification_queue')
              .update({ status: 'sent' })
              .eq('id', notification.id)

            // Add to history
            await supabase
              .from('notification_history')
              .insert({
                user_id: notification.user_id,
                news_id: notification.news_id,
                title: notification.title
              })

            // Increment daily count
            await supabase.rpc('increment_daily_notification_count', {
              p_user_id: notification.user_id
            })

          } else {
            const errorData = await response.text()
            console.error('FCM error:', errorData)
            failedCount++
            
            await supabase
              .from('notification_queue')
              .update({ status: 'failed' })
              .eq('id', notification.id)
          }

        } catch (error) {
          console.error('Send error:', error)
          failedCount++
          
          await supabase
            .from('notification_queue')
            .update({ status: 'failed' })
            .eq('id', notification.id)
        }
      }
    }

    // Update analytics
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('notification_analytics')
      .upsert({
        date: today,
        total_sent: sentCount,
        total_failed: failedCount
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        message: `Sent ${sentCount} notifications, ${failedCount} failed` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
