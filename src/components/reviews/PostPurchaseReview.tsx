import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/hooks/useCustomer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostPurchaseReviewProps {
  orderId: string;
  businessId: string;
  businessName: string;
}

export function PostPurchaseReview({ orderId, businessId, businessName }: PostPurchaseReviewProps) {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if already reviewed
  const { data: existingReview } = useQuery({
    queryKey: ["order-review", orderId],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("reviews")
        .select("id")
        .eq("order_id", orderId)
        .eq("reviewer_id", customer.id)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id && !!orderId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error("Not logged in");
      if (rating === 0) throw new Error("Please select a rating");

      const { error } = await supabase.from("reviews").insert({
        order_id: orderId,
        business_id: businessId,
        reviewer_id: customer.id,
        reviewer_type: "customer",
        rating,
        title: title.trim() || null,
        content: content.trim() || null,
        verified_purchase: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-review", orderId] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      toast.success("Review submitted! Thank you for your feedback.");
      setOpen(false);
      setRating(0);
      setTitle("");
      setContent("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitReview.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  if (existingReview) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Star className="h-4 w-4 fill-foreground text-foreground" />
        Reviewed
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Star className="h-4 w-4" />
          Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate your experience</DialogTitle>
          <DialogDescription>
            Share your feedback about {businessName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Star Rating */}
          <div>
            <Label>Your Rating *</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="review-title">Title (optional)</Label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-foreground"
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="review-content">Your Review (optional)</Label>
            <Textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell others about your experience..."
              rows={4}
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving || rating === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
