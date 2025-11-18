import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateStatusRequest {
  applicationId: string;
  newStatus: string;
  changeReason?: string;
}

const VALID_STATUSES = [
  'discovered',
  'applied',
  'correction_window',
  'admit_card_released',
  'exam_completed',
  'result_pending',
  'result_released',
  'archived'
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  'discovered': ['applied', 'archived'],
  'applied': ['correction_window', 'admit_card_released', 'exam_completed', 'archived'],
  'correction_window': ['admit_card_released', 'exam_completed', 'archived'],
  'admit_card_released': ['exam_completed', 'archived'],
  'exam_completed': ['result_pending', 'result_released', 'archived'],
  'result_pending': ['result_released', 'archived'],
  'result_released': ['archived'],
  'archived': []
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { applicationId, newStatus, changeReason }: UpdateStatusRequest = await req.json();
    console.log(`Updating status for application ${applicationId} to ${newStatus}`);

    // Validate status
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    const currentStatus = application.application_status;

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    if (currentStatus !== newStatus && !allowedTransitions.includes(newStatus)) {
      console.warn(`Invalid transition from ${currentStatus} to ${newStatus}, but allowing anyway`);
    }

    // Update the application status
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        application_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application status:', updateError);
      throw updateError;
    }

    // Create status history entry
    const { error: historyError } = await supabase
      .from('application_status_history')
      .insert({
        application_id: applicationId,
        previous_status: currentStatus,
        new_status: newStatus,
        changed_by: 'user',
        change_reason: changeReason || `User changed status from ${currentStatus} to ${newStatus}`,
        metadata: { user_id: user.id }
      });

    if (historyError) {
      console.error('Error creating status history:', historyError);
    }

    // Create status change notification if it's a significant change
    const significantChanges = ['admit_card_released', 'result_released'];
    if (significantChanges.includes(newStatus)) {
      const statusMessages: Record<string, string> = {
        'admit_card_released': 'Admit card has been released! Download it now.',
        'result_released': 'Results have been announced! Check your results.'
      };

      await supabase
        .from('application_notifications')
        .insert({
          user_id: user.id,
          application_id: applicationId,
          notification_type: 'status_change',
          title: `${application.title} - Status Update`,
          message: statusMessages[newStatus] || `Status updated to ${newStatus}`,
          scheduled_for: new Date().toISOString(),
          delivery_status: 'pending',
          metadata: {
            previous_status: currentStatus,
            new_status: newStatus
          }
        });
    }

    // Archive old notifications if status is archived
    if (newStatus === 'archived') {
      await supabase
        .from('application_notifications')
        .update({ delivery_status: 'dismissed' })
        .eq('application_id', applicationId)
        .eq('delivery_status', 'pending');
    }

    console.log(`Successfully updated status for ${applicationId} from ${currentStatus} to ${newStatus}`);

    return new Response(
      JSON.stringify({
        message: 'Status updated successfully',
        previousStatus: currentStatus,
        newStatus: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-application-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
