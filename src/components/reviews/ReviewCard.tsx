import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title: string | null;
    content: string | null;
    created_at: string;
    verified_purchase: boolean | null;
    reviewer_name?: string;
    response?: string | null;
    response_at?: string | null;
    images?: string[] | null;
  };
  showResponse?: boolean;
}

export function ReviewCard({ review, showResponse = true }: ReviewCardProps) {
  return (
    <div className="dashboard-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {/* Star rating */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= review.rating
                      ? "fill-foreground text-foreground"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            {review.verified_purchase && (
              <Badge variant="secondary" className="text-xs">
                Verified
              </Badge>
            )}
          </div>

          {review.title && (
            <h4 className="mt-2 font-medium text-foreground">{review.title}</h4>
          )}

          {review.content && (
            <p className="mt-1 text-sm text-muted-foreground">{review.content}</p>
          )}

          {review.images && review.images.length > 0 && (
            <div className="mt-3 flex gap-2">
              {review.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Review image ${idx + 1}`}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            {review.reviewer_name && <span>{review.reviewer_name}</span>}
            <span>•</span>
            <span>{format(new Date(review.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Business Response */}
      {showResponse && review.response && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground mb-1">Business Response</p>
            <p className="text-sm text-muted-foreground">{review.response}</p>
            {review.response_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                {format(new Date(review.response_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
