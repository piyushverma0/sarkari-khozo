// ===========================================================
// SEND PENDING NOTIFICATIONS EDGE FUNCTION
// ===========================================================
// This function is called by a cron job every hour to send
// scheduled notifications that are due.
// ===========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Firebase Cloud Messaging API endpoint
const FCM_API_URL = "https://fcm.googleapis.com/v1/projects/PROJECT_ID/messages:send";

/**
 * Send FCM push notification to a device
 */
async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
  try {
    // Get Firebase service account credentials from environment
    const firebaseCredentials = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!firebaseCredentials) {
      console.error("FIREBASE_SERVICE_ACCOUNT not set");
      return false;
    }

    const serviceAccount = JSON.parse(firebaseCredentials);

    // Get OAuth2 access token for Firebase Admin
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    if (!accessToken) {
      console.error("Failed to get Firebase access token");
      return false;
    }

    // Construct FCM message
    const message = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "news_updates",
          },
        },
      },
    };

    // Send to FCM
    const fcmUrl = FCM_API_URL.replace("PROJECT_ID", serviceAccount.project_id);
    const response = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("FCM send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return false;
  }
}

/**
 * Get OAuth2 access token for Firebase Admin
 */
async function getFirebaseAccessToken(serviceAccount: any): Promise<string | null> {
  try {
    const jwtHeader = btoa(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT",
      }),
    );

    const now = Math.floor(Date.now() / 1000);
    const jwtClaim = btoa(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      }),
    );

    // Note: For production, you should use a proper JWT signing library
    // This is a simplified implementation
    const signature = await signJWT(`${jwtHeader}.${jwtClaim}`, serviceAccount.private_key);
    const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      console.error("Failed to get access token:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Firebase access token:", error);
    return null;
  }
}

/**
 * Sign JWT with RS256
 */
async function signJWT(data: string, privateKey: string): Promise<string> {
  // Import the private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  // Sign the data
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(data));

  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

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

    const now = new Date().toISOString();

    // Fetch all pending notifications that are due
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from("application_notifications")
      .select("*")
      .eq("delivery_status", "PENDING")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(100); // Process up to 100 notifications at a time

    if (fetchError) throw fetchError;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${pendingNotifications.length} notifications to send`);

    const results = {
      delivered: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Check if user still has this application tracked
        const { data: application, error: appError } = await supabaseClient
          .from("applications")
          .select("id")
          .eq("id", notification.application_id)
          .maybeSingle();

        // If application was deleted, cancel the notification
        if (!application) {
          await supabaseClient
            .from("application_notifications")
            .update({
              delivery_status: "CANCELLED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", notification.id);

          console.log(`Cancelled notification ${notification.id} - application no longer exists`);
          continue;
        }

        // Get user's notification preferences
        const { data: preferences } = await supabaseClient
          .from("user_notification_preferences")
          .select("enabled, max_daily_notifications, quiet_hours_start, quiet_hours_end")
          .eq("user_id", notification.user_id)
          .maybeSingle();

        // Check if notifications are enabled for this user
        if (preferences && !preferences.enabled) {
          console.log(`Skipping notification ${notification.id} - notifications disabled for user`);
          continue;
        }

        // Check quiet hours
        const currentHour = new Date().getHours();
        const quietStart = preferences?.quiet_hours_start ? parseInt(preferences.quiet_hours_start.split(":")[0]) : 22;
        const quietEnd = preferences?.quiet_hours_end ? parseInt(preferences.quiet_hours_end.split(":")[0]) : 8;

        if (currentHour >= quietStart || currentHour < quietEnd) {
          console.log(`Skipping notification ${notification.id} - quiet hours`);
          // Reschedule for later
          const nextScheduled = new Date();
          nextScheduled.setHours(quietEnd, 0, 0, 0);
          if (nextScheduled <= new Date()) {
            nextScheduled.setDate(nextScheduled.getDate() + 1);
          }

          await supabaseClient
            .from("application_notifications")
            .update({
              scheduled_for: nextScheduled.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", notification.id);
          continue;
        }

        // Get user's FCM tokens
        const { data: fcmTokens, error: tokenError } = await supabaseClient
          .from("user_fcm_tokens")
          .select("fcm_token")
          .eq("user_id", notification.user_id);

        if (tokenError || !fcmTokens || fcmTokens.length === 0) {
          console.log(`No FCM tokens found for user ${notification.user_id}`);
          // Mark as failed - no token available
          await supabaseClient
            .from("application_notifications")
            .update({
              delivery_status: "FAILED",
              updated_at: new Date().toISOString(),
              metadata: {
                ...notification.metadata,
                error: "No FCM token available",
                failed_at: new Date().toISOString(),
              },
            })
            .eq("id", notification.id);
          results.failed++;
          continue;
        }

        // Send to all user's devices
        let sentToAnyDevice = false;
        for (const tokenData of fcmTokens) {
          const success = await sendFCMNotification(tokenData.fcm_token, notification.title, notification.message, {
            notification_id: notification.id,
            application_id: notification.application_id,
            type: notification.type,
            priority: notification.priority,
          });

          if (success) {
            sentToAnyDevice = true;
          }
        }

        // Update notification status
        if (sentToAnyDevice) {
          await supabaseClient
            .from("application_notifications")
            .update({
              delivery_status: "DELIVERED",
              delivered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", notification.id);

          results.delivered++;
          console.log(`Delivered notification ${notification.id}: ${notification.title}`);
        } else {
          throw new Error("Failed to send to any device");
        }
      } catch (error) {
        console.error(`Failed to deliver notification ${notification.id}:`, error);
        results.failed++;
        results.errors.push(`${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Mark notification as failed
        await supabaseClient
          .from("application_notifications")
          .update({
            delivery_status: "FAILED",
            updated_at: new Date().toISOString(),
            metadata: {
              ...notification.metadata,
              error: error instanceof Error ? error.message : 'Unknown error',
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", notification.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingNotifications.length} notifications`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error sending pending notifications:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ============================================================
// CRON JOB SETUP INSTRUCTIONS
// ============================================================
// 1. Deploy this function: supabase functions deploy send-pending-notifications
// 2. Set environment variable:
//    supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...",...}'
// 3. Set up a cron job in Supabase Dashboard:
//    - Go to Database > Cron Jobs (pg_cron extension)
//    - Create new cron job:
//      Name: send-pending-notifications
//      Schedule: */15 * * * * (every 15 minutes)
//      SQL: SELECT net.http_post(
//             url:='https://YOUR_PROJECT.supabase.co/functions/v1/send-pending-notifications',
//             headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
//           ) AS request_id;
// ============================================================
