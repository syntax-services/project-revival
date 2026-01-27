import { useMemo } from "react";
import { calculateDistance } from "@/hooks/useLocation";

interface BaseBusiness {
  id: string;
  company_name: string;
  latitude: number | null;
  longitude: number | null;
  reputation_score: number | null;
  verified: boolean | null;
  business_type: string | null;
  total_reviews?: number | null;
  total_completed_orders?: number | null;
}

interface MatchingOptions {
  userLatitude?: number | null;
  userLongitude?: number | null;
  preferredType?: "goods" | "services" | "all";
  maxDistance?: number; // km
}

type ScoredBusiness<T extends BaseBusiness> = T & {
  matchScore: number;
  distance: number | null;
  trustScore: number;
}

export function useSmartMatching<T extends BaseBusiness>(
  businesses: T[],
  options: MatchingOptions = {}
): ScoredBusiness<T>[] {
  const { userLatitude, userLongitude, preferredType = "all", maxDistance } = options;

  return useMemo(() => {
    const scoredBusinesses: ScoredBusiness<T>[] = businesses.map((business) => {
      // Calculate distance
      let distance: number | null = null;
      if (userLatitude && userLongitude && business.latitude && business.longitude) {
        distance = calculateDistance(
          userLatitude,
          userLongitude,
          business.latitude,
          business.longitude
        );
      }

      // Trust score (0-100)
      let trustScore = 50; // Base score

      // Verified bonus
      if (business.verified) trustScore += 15;

      // Reputation score contribution (0-20)
      if (business.reputation_score) {
        trustScore += Math.min((business.reputation_score / 5) * 20, 20);
      }

      // Review count bonus (up to 10)
      if (business.total_reviews) {
        trustScore += Math.min(business.total_reviews / 10, 10);
      }

      // Completed orders bonus (up to 5)
      if (business.total_completed_orders) {
        trustScore += Math.min(business.total_completed_orders / 20, 5);
      }

      trustScore = Math.min(trustScore, 100);

      // Match score calculation
      let matchScore = 0;

      // Trust component (40% weight)
      matchScore += trustScore * 0.4;

      // Distance component (30% weight) - closer is better
      if (distance !== null) {
        const distanceScore = Math.max(0, 100 - distance * 2); // Decreases by 2 per km
        matchScore += distanceScore * 0.3;
      } else {
        matchScore += 50 * 0.3; // Neutral if no location
      }

      // Type match component (20% weight)
      if (preferredType === "all") {
        matchScore += 100 * 0.2;
      } else if (business.business_type === preferredType || business.business_type === "both") {
        matchScore += 100 * 0.2;
      } else {
        matchScore += 30 * 0.2;
      }

      // Activity bonus (10% weight)
      const hasRecentActivity = (business.total_reviews || 0) > 0 || (business.total_completed_orders || 0) > 0;
      matchScore += (hasRecentActivity ? 100 : 50) * 0.1;

      return {
        ...business,
        matchScore: Math.round(matchScore),
        distance,
        trustScore: Math.round(trustScore),
      };
    });

    // Filter by max distance if specified
    let filtered = scoredBusinesses;
    if (maxDistance !== undefined && userLatitude && userLongitude) {
      filtered = scoredBusinesses.filter(
        (b) => b.distance === null || b.distance <= maxDistance
      );
    }

    // Sort by match score
    return filtered.sort((a, b) => b.matchScore - a.matchScore);
  }, [businesses, userLatitude, userLongitude, preferredType, maxDistance]);
}

// Helper to detect potentially low-quality businesses
export function detectLowQualitySignals(business: {
  reputation_score: number | null;
  verified: boolean | null;
  total_reviews?: number | null;
  total_completed_orders?: number | null;
}): string[] {
  const warnings: string[] = [];

  if (business.reputation_score !== null && business.reputation_score < 2.5) {
    warnings.push("Low rating");
  }

  if (!business.verified) {
    warnings.push("Not verified");
  }

  const reviews = business.total_reviews || 0;
  const orders = business.total_completed_orders || 0;

  if (reviews === 0 && orders === 0) {
    warnings.push("New business");
  }

  if (reviews > 0 && business.reputation_score !== null && business.reputation_score < 3) {
    warnings.push("Mixed reviews");
  }

  return warnings;
}
