import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Briefcase, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BusinessCardProps {
  business: {
    id: string;
    company_name: string;
    industry: string | null;
    business_location: string | null;
    products_services: string | null;
    cover_image_url: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  distance?: number | null;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onStartChat: (id: string) => void;
}

export function BusinessCard({
  business,
  likesCount,
  isLiked,
  isSaved,
  distance,
  onToggleSave,
  onToggleLike,
  onStartChat,
}: BusinessCardProps) {
  return (
    <div className="dashboard-card group overflow-hidden">
      {/* Cover Image */}
      <div className="relative -mx-5 -mt-5 mb-4 h-32 bg-gradient-to-br from-primary/20 to-primary/5">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={business.company_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-bold text-primary/30">
              {business.company_name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between">
        <Link to={`/business/${business.id}`} className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground hover:text-primary transition-colors truncate">
            {business.company_name}
          </h3>
          {business.industry && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Briefcase className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{business.industry}</span>
            </div>
          )}
          {business.business_location && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{business.business_location}</span>
              {distance !== null && distance !== undefined && (
                <span className="text-xs text-primary ml-1">
                  ({distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`})
                </span>
              )}
            </div>
          )}
        </Link>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleSave(business.id)}
          className="flex-shrink-0"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isSaved
                ? "fill-pink-500 text-pink-500"
                : "text-muted-foreground"
            )}
          />
        </Button>
      </div>

      {business.products_services && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {business.products_services}
        </p>
      )}

      {/* Rating & Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={() => onToggleLike(business.id)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Star
            className={cn(
              "h-4 w-4",
              isLiked && "fill-yellow-500 text-yellow-500"
            )}
          />
          <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onStartChat(business.id)}
          className="google-input-button"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          Message
        </Button>
      </div>
    </div>
  );
}
