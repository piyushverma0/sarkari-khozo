import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: {
      applicationId?: string;
      url?: string;
      notificationType?: string;
    };
    actions?: Array<{
      action: string;
      title: string;
    }>;
  };
}

// Helper function to generate VAPID JWT
async function generateVAPIDAuthHeader(vapidPublicKey: string, vapidPrivateKey: string, endpoint: string) {
  const urlParts = new URL(endpoint);
  const audience = `${urlParts.protocol}//${urlParts.host}`;

  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12 hours
    sub: 'mailto:noreply@example.com'
  };

  // For simplicity, we'll use a basic implementation
  // In production, you'd want to use a proper JWT library
  const headerStr = btoa(JSON.stringify(header));
  const payloadStr = btoa(JSON.stringify(jwtPayload));
  
  return `vapid t=${headerStr}.${payloadStr}, k=${vapidPublicKey}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, payload }: PushNotificationPayload = await req.json();

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    console.log('Sending push notification to:', subscription.endpoint);

    // Prepare the payload
    const payloadString = JSON.stringify(payload);

    // Generate VAPID authorization header
    const authHeader = await generateVAPIDAuthHeader(vapidPublicKey, vapidPrivateKey, subscription.endpoint);

    // Send push notification using Web Push Protocol
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': payloadString.length.toString(),
        'TTL': '86400', // 24 hours
        'Authorization': authHeader,
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`
      },
      body: payloadString
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Push notification failed:', response.status, errorText);
      throw new Error(`Push notification failed: ${response.status} ${errorText}`);
    }

    console.log('Push notification sent successfully:', response.status);

    return new Response(
      JSON.stringify({ 
        success: true, 
        statusCode: response.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
