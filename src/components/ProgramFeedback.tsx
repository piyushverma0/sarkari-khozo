import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProgramFeedbackProps {
  programTitle: string;
  programUrl?: string;
}

export const ProgramFeedback = ({ programTitle, programUrl }: ProgramFeedbackProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isRelevant, setIsRelevant] = useState<boolean | null>(null);
  const [didApply, setDidApply] = useState<"yes" | "no" | "planning" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to submit feedback");
        return;
      }

      const { error } = await supabase
        .from("program_feedback")
        .insert({
          user_id: user.id,
          program_title: programTitle,
          program_url: programUrl,
          is_relevant: isRelevant,
          did_apply: didApply,
          feedback_text: feedbackText || null,
        });

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      setShowDialog(false);
      
      // Reset form
      setIsRelevant(null);
      setDidApply(null);
      setFeedbackText("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <ThumbsUp className="h-4 w-4" />
        Share Feedback
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Program Feedback</DialogTitle>
            <DialogDescription>
              Help us improve by sharing your experience with {programTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Relevance Question */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Was this program relevant to you?</p>
              <div className="flex gap-2">
                <Button
                  variant={isRelevant === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsRelevant(true)}
                  className="flex-1 gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant={isRelevant === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsRelevant(false)}
                  className="flex-1 gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
              </div>
            </div>

            {/* Application Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Did you apply to this program?</p>
              <div className="flex gap-2">
                <Button
                  variant={didApply === "yes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDidApply("yes")}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant={didApply === "planning" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDidApply("planning")}
                  className="flex-1 gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Planning to
                </Button>
                <Button
                  variant={didApply === "no" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDidApply("no")}
                  className="flex-1 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  No
                </Button>
              </div>
            </div>

            {/* Optional Text Feedback */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                How did it go? (Optional)
              </p>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your experience, tips, or any additional feedback..."
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (isRelevant === null && didApply === null)}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
