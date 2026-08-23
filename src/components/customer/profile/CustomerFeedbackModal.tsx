import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function CustomerFeedbackModal({ isOpen, onOpenChange, userId }: CustomerFeedbackModalProps) {
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim() || !userId) {
      toast.error("Please fill out both the subject and your message.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from("user_feedbacks")
        .insert({
          user_id: userId,
          rating: feedbackRating,
          subject: feedbackSubject.trim(),
          message: feedbackMessage.trim(),
        });

      if (error) throw error;

      toast.success("Thank you! Your feedback has been sent directly to the String team. ");
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackRating(5);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Feedback submission error";
      toast.error(message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-primary/20 bg-card/95 backdrop-blur-2xl text-foreground rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
            Submit Platform Feedback
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Tell us how to improve String. Your feedback goes directly to our platform admin team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-3 text-left">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="text-lg transition-transform duration-200 active:scale-95 hover:scale-110"
                >
                  {star <= feedbackRating ? "" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject</Label>
            <Input
              placeholder="e.g. Navigation speed, Order chimes"
              value={feedbackSubject}
              onChange={(e) => setFeedbackSubject(e.target.value)}
              className="h-9 bg-muted/20 border-border/40 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Message</Label>
            <Textarea
              placeholder="Describe your experience or feature recommendations..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
              className="bg-muted/20 border-border/40 rounded-xl resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleFeedbackSubmit}
            disabled={submittingFeedback || !feedbackSubject || !feedbackMessage}
            className="bg-primary hover:bg-primary/95 text-white font-bold"
          >
            {submittingFeedback ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
