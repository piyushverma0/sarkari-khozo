// Send FCM Push Notification
// Sends actual push notifications via Firebase Cloud Messaging

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  notification_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { notification_id }: SendNotificationRequest = await req.json();

    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📨 Sending FCM notification:", notification_id);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch notification details
    const { data: notification, error: notificationError } = await supabase
      .from("application_notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (notificationError || !notification) {
      throw new Error(`Notification not found: ${notificationError?.message}`);
    }

    console.log("📋 Notification:", notification.title);

    // Fetch user's FCM token
    const { data: tokens, error: tokenError } = await supabase
      .from("user_fcm_tokens")
      .select("fcm_token")
      .eq("user_id", notification.user_id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      console.log("⚠️ No FCM token found for user:", notification.user_id);

      // Update notification status
      await supabase
        .from("application_notifications")
        .update({
          delivery_status: "FAILED",
          processing_error: "No FCM token found for user",
        })
        .eq("id", notification_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "No FCM token found",
          notification_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const fcmToken = tokens[0].fcm_token;
    console.log("🔑 FCM Token found for user");

    // Parse Firebase service account
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Prepare FCM message as DATA-ONLY (no notification field)
    // This ensures onMessageReceived() is ALWAYS called, even when app is in background
    // See: https://firebase.google.com/docs/cloud-messaging/android/receive#handling_messages
    const fcmMessage = {
      message: {
        token: fcmToken,
        data: {
          title: notification.title,
          body: notification.message,
          notification_id: notification.id,
          application_id: notification.application_id || "",
          type: notification.type,
          priority: notification.priority,
          channel: notification.notification_channel.toLowerCase(),
          click_action: "OPEN_APPLICATION",
        },
        android: {
          priority: notification.priority === "HIGH" || notification.priority === "URGENT" ? "high" : "normal",
        },
      },
    };

    // Send FCM notification
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmMessage),
      },
    );

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error("❌ FCM send failed:", fcmResult);

      // Update notification status
      await supabase
        .from("application_notifications")
        .update({
          delivery_status: "FAILED",
          processing_error: fcmResult.error?.message || "FCM send failed",
        })
        .eq("id", notification_id);

      throw new Error(`FCM send failed: ${fcmResult.error?.message}`);
    }

    console.log("✅ FCM notification sent successfully");

    // Update notification status
    await supabase
      .from("application_notifications")
      .update({
        delivery_status: "DELIVERED",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({
        success: true,
        notification_id,
        fcm_message_id: fcmResult.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error sending FCM notification:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to send notification";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Get Firebase access token using service account credentials
 * Uses JWT authentication as described in Firebase docs
 */
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  // Create JWT payload
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(signatureInput));

  // Encode signature
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenData.error_description}`);
  }

  return tokenData.access_token;
}

/**
 * Convert PEM private key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
