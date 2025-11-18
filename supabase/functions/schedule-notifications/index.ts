// ===========================================================
// SCHEDULE NOTIFICATIONS EDGE FUNCTION
// ===========================================================
// This function schedules notifications when a user tracks an application.
// It creates deadline reminder notifications based on important dates.
// ===========================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleNotificationsRequest {
  applicationId: string;
  userId: string;
}

interface ImportantDates {
  application_start?: string;
  application_end?: string;
  admit_card_date?: string;
  exam_date?: string;
  result_date?: string;
  correction_window_start?: string;
  correction_window_end?: string;
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

    const { applicationId, userId } = (await req.json()) as ScheduleNotificationsRequest;

    if (!applicationId || !userId) {
      throw new Error("applicationId and userId are required");
    }

    // Fetch application details
    const { data: application, error: appError } = await supabaseClient
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError) throw appError;

    // Get notification preferences for this application
    const { data: preferences } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .maybeSingle();

    // Use default preferences if none exist
    const reminderDays = preferences?.reminder_days || [7, 3, 1];
    const deadlineRemindersEnabled = preferences?.deadline_reminders !== false;

    if (!deadlineRemindersEnabled) {
      return new Response(JSON.stringify({ message: "Deadline reminders are disabled for this application" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const importantDates: ImportantDates = application.important_dates || {};
    const notifications = [];

    // Schedule notifications for application deadline
    if (importantDates.application_end) {
      const deadline = new Date(importantDates.application_end);

      for (const days of reminderDays) {
        const scheduledDate = new Date(deadline);
        scheduledDate.setDate(scheduledDate.getDate() - days);

        // Only schedule if the notification date is in the future
        if (scheduledDate > new Date()) {
          notifications.push({
            user_id: userId,
            application_id: applicationId,
            title: `${days} day${days > 1 ? "s" : ""} until application deadline`,
            message: `The application deadline for "${application.title}" is in ${days} day${days > 1 ? "s" : ""}. Don't forget to submit your application!`,
            type: "DEADLINE_REMINDER",
            notification_channel: days === 1 ? "URGENT" : "GENERAL",
            priority: days === 1 ? "URGENT" : days === 3 ? "HIGH" : "MEDIUM",
            scheduled_for: scheduledDate.toISOString(),
            delivery_status: "PENDING",
            metadata: {
              deadline_type: "application_end",
              days_until_deadline: days.toString(),
              deadline_date: importantDates.application_end,
            },
          });
        }
      }
    }

    // Schedule notifications for correction window deadline
    if (importantDates.correction_window_end) {
      const deadline = new Date(importantDates.correction_window_end);

      for (const days of [3, 1]) {
        // Only 3 and 1 day reminders for correction window
        const scheduledDate = new Date(deadline);
        scheduledDate.setDate(scheduledDate.getDate() - days);

        if (scheduledDate > new Date()) {
          notifications.push({
            user_id: userId,
            application_id: applicationId,
            title: `Correction window closing in ${days} day${days > 1 ? "s" : ""}`,
            message: `The correction window for "${application.title}" closes in ${days} day${days > 1 ? "s" : ""}. Review your application now!`,
            type: "DEADLINE_REMINDER",
            notification_channel: "URGENT",
            priority: "HIGH",
            scheduled_for: scheduledDate.toISOString(),
            delivery_status: "PENDING",
            metadata: {
              deadline_type: "correction_window_end",
              days_until_deadline: days.toString(),
              deadline_date: importantDates.correction_window_end,
            },
          });
        }
      }
    }

    // Schedule notification for admit card release (1 day before)
    if (importantDates.admit_card_date) {
      const admitCardDate = new Date(importantDates.admit_card_date);
      const scheduledDate = new Date(admitCardDate);
      scheduledDate.setDate(scheduledDate.getDate() - 1);

      if (scheduledDate > new Date()) {
        notifications.push({
          user_id: userId,
          application_id: applicationId,
          title: "Admit card releasing tomorrow",
          message: `The admit card for "${application.title}" is expected to be released tomorrow. Check the official website!`,
          type: "STATUS_UPDATE",
          notification_channel: "UPDATES",
          priority: "HIGH",
          scheduled_for: scheduledDate.toISOString(),
          delivery_status: "PENDING",
          metadata: {
            event_type: "admit_card_date",
            event_date: importantDates.admit_card_date,
          },
        });
      }
    }

    // Schedule notification for exam date (1 day before)
    if (importantDates.exam_date) {
      const examDate = new Date(importantDates.exam_date);
      const scheduledDate = new Date(examDate);
      scheduledDate.setDate(scheduledDate.getDate() - 1);

      if (scheduledDate > new Date()) {
        notifications.push({
          user_id: userId,
          application_id: applicationId,
          title: "Exam tomorrow",
          message: `Your exam for "${application.title}" is scheduled for tomorrow. Good luck!`,
          type: "DEADLINE_REMINDER",
          notification_channel: "URGENT",
          priority: "URGENT",
          scheduled_for: scheduledDate.toISOString(),
          delivery_status: "PENDING",
          metadata: {
            event_type: "exam_date",
            event_date: importantDates.exam_date,
          },
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseClient.from("application_notifications").insert(notifications);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled ${notifications.length} notification(s)`,
        notifications: notifications.map((n) => ({
          title: n.title,
          scheduled_for: n.scheduled_for,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error scheduling notifications:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
