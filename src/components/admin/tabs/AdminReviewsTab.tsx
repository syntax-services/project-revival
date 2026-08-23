/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

interface AdminReviewsTabProps {
  allReviews: any[];
  loadingReviews: boolean;
  refetchReviews: () => void;
}

export function AdminReviewsTab({
  allReviews,
  loadingReviews,
  refetchReviews,
}: AdminReviewsTabProps) {
  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted successfully! Ratings recalibrated. ");
      refetchReviews();
    },
    onError: (err: any) => {
      toast.error("Failed to delete review: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>All Reviews ({allReviews?.length || 0})</CardTitle>
          <CardDescription>Monitor customer reviews and business responses</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReviews ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="md" label="Loading reviews..." />
            </div>
          ) : (
            <>
              {/* Desktop Layout */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {allReviews?.map((review: any) => (
                      <div key={review.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`}
                                  />
                                ))}
                              </div>
                              {review.verified_purchase && (
                                <Badge variant="secondary">Verified</Badge>
                              )}
                            </div>
                            {review.title && <p className="font-medium mt-1">{review.title}</p>}
                            {review.content && <p className="text-sm text-muted-foreground mt-1">{review.content}</p>}
                            <p className="text-xs text-muted-foreground mt-2">
                              For: {review.businesses?.company_name} • {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this review? This action is permanent and will instantly recalibrate business ratings.")) {
                                deleteReviewMutation.mutate(review.id);
                              }
                            }}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl"
                            title="Delete Review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {review.response && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium">Business Response:</p>
                            <p className="text-sm text-muted-foreground">{review.response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {allReviews?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No reviews found</p>
                )}
                {allReviews?.map((review: any) => (
                  <div key={review.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-500' : 'text-muted'}`}>★</span>
                        ))}
                        {review.verified_purchase && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">Verified</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this review? This action is permanent and will instantly recalibrate business ratings.")) {
                            deleteReviewMutation.mutate(review.id);
                          }
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl h-8 w-8 p-0"
                        title="Delete Review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">For: {review.businesses?.company_name}</p>
                      {review.title && <p className="font-medium text-sm">{review.title}</p>}
                      {review.content && <p className="text-sm text-muted-foreground line-clamp-3">{review.content}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                    {review.response && (
                      <div className="p-3 bg-muted/50 rounded-xl">
                        <p className="text-xs font-medium">Business Response:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{review.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
