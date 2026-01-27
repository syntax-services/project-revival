import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReviewStatsProps {
  reviews: Array<{ rating: number }>;
  averageRating: number;
}

export function ReviewStats({ reviews, averageRating }: ReviewStatsProps) {
  const totalReviews = reviews.length;

  const getRatingCount = (rating: number) =>
    reviews.filter((r) => r.rating === rating).length;

  const getRatingPercentage = (rating: number) =>
    totalReviews > 0 ? (getRatingCount(rating) / totalReviews) * 100 : 0;

  return (
    <div className="dashboard-card">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Average rating */}
        <div className="text-center sm:text-left">
          <div className="text-4xl font-bold text-foreground">
            {averageRating > 0 ? averageRating.toFixed(1) : "—"}
          </div>
          <div className="mt-1 flex items-center justify-center sm:justify-start gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-4 w-4",
                  star <= Math.round(averageRating)
                    ? "fill-foreground text-foreground"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Rating breakdown */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-6">{rating}</span>
              <Star className="h-3 w-3 text-muted-foreground" />
              <Progress value={getRatingPercentage(rating)} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground w-8">
                {getRatingCount(rating)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
