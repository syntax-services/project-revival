import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessReviewsWithDetails, useRespondToReview } from "@/hooks/useReviews";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewStats } from "@/components/reviews/ReviewStats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, MessageCircle } from "lucide-react";

export default function BusinessReviews() {
  const { data: business } = useBusiness();
  const { data: reviews, isLoading } = useBusinessReviewsWithDetails(business?.id);
  const respondMutation = useRespondToReview();

  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [response, setResponse] = useState("");

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleRespond = async () => {
    if (!selectedReview || !response.trim()) return;
    await respondMutation.mutateAsync({
      reviewId: selectedReview.id,
      response: response.trim(),
    });
    setSelectedReview(null);
    setResponse("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reviews</h1>
          <p className="mt-1 text-muted-foreground">See what customers are saying</p>
        </div>

        {isLoading ? (
          <div className="dashboard-card animate-pulse h-32" />
        ) : !reviews || reviews.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium text-foreground">No reviews yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reviews will appear here after customers complete orders or jobs
            </p>
          </div>
        ) : (
          <>
            <ReviewStats reviews={reviews} averageRating={avgRating} />

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="relative">
                  <ReviewCard review={review} />
                  {!review.response && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-4 right-4"
                      onClick={() => {
                        setSelectedReview(review);
                        setResponse("");
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Respond
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Response Dialog */}
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedReview.rating
                            ? "fill-foreground text-foreground"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  {selectedReview.title && (
                    <p className="mt-2 font-medium text-foreground">{selectedReview.title}</p>
                  )}
                  {selectedReview.content && (
                    <p className="mt-1 text-sm text-muted-foreground">{selectedReview.content}</p>
                  )}
                </div>

                <Textarea
                  placeholder="Write your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="min-h-[100px]"
                />

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleRespond}
                    disabled={!response.trim() || respondMutation.isPending}
                  >
                    {respondMutation.isPending ? "Posting..." : "Post Response"}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedReview(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
