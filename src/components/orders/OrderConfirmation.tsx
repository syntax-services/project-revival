import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderConfirmationProps {
  orderId: string;
  businessId: string;
  customerId: string;
  orderNumber: string;
  onConfirmed?: () => void;
}

export function OrderConfirmation({ 
  orderId, 
  businessId, 
  customerId, 
  orderNumber,
  onConfirmed 
}: OrderConfirmationProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "delivered",
          delivered_at: new Date().toISOString()
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      toast.success("Order confirmed as delivered!");
      setShowConfirmDialog(false);
      setShowReviewDialog(true);
    },
    onError: () => {
      toast.error("Failed to confirm order");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reviews")
        .insert({
          business_id: businessId,
          order_id: orderId,
          reviewer_id: customerId,
          reviewer_type: "customer",
          rating,
          content: reviewContent || null,
          verified_purchase: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      toast.success("Thank you for your review!");
      setShowReviewDialog(false);
      onConfirmed?.();
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const skipReview = () => {
    setShowReviewDialog(false);
    onConfirmed?.();
  };

  return (
    <>
      <Button 
        size="sm" 
        onClick={() => setShowConfirmDialog(true)}
        className="gap-2"
      >
        <CheckCircle className="h-4 w-4" />
        Confirm Receipt
      </Button>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Receipt</DialogTitle>
            <DialogDescription>
              Have you received order <span className="font-medium">{orderNumber}</span>? 
              This action confirms that the order has been delivered to you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => confirmMutation.mutate()} 
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, I received it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              How was your experience with this order?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
                  >
                    <Star 
                      className={`h-8 w-8 transition-colors ${
                        (hoverRating || rating) >= star 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="review">Your review (optional)</Label>
              <Textarea
                id="review"
                placeholder="Tell us about your experience..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={skipReview}>
              Skip
            </Button>
            <Button 
              onClick={() => reviewMutation.mutate()} 
              disabled={rating === 0 || reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}