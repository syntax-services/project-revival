import { useOffers } from "@/hooks/useOffers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  Wrench, 
  Briefcase, 
  Users, 
  MapPin, 
  Clock,
  MessageCircle,
  Image as ImageIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons = {
  product: Package,
  service: Wrench,
  employment: Briefcase,
  collaboration: Users,
};

const urgencyColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-accent text-accent-foreground",
  urgent: "bg-foreground text-background",
};

interface OffersListProps {
  showMyOffers?: boolean;
}

export function OffersList({ showMyOffers = false }: OffersListProps) {
  const { offers, myOffers, isLoading, cancelOffer } = useOffers();
  
  const displayOffers = showMyOffers ? myOffers : offers;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="dashboard-card animate-pulse">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (displayOffers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            {showMyOffers ? "You haven't created any requests yet" : "No open requests available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayOffers.map((offer) => {
        const Icon = typeIcons[offer.offer_type as keyof typeof typeIcons] || Package;
        const urgencyClass = offer.urgency 
          ? urgencyColors[offer.urgency as keyof typeof urgencyColors] 
          : "";

        return (
          <Card key={offer.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{offer.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">
                        {offer.offer_type}
                      </Badge>
                      {offer.urgency && (
                        <Badge className={`text-xs ${urgencyClass}`}>
                          {offer.urgency}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={offer.status === "open" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {offer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offer.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {offer.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(offer.budget_min || offer.budget_max) && (
                  <span>
                    Budget: ₦{offer.budget_min?.toLocaleString() || "0"} - ₦{offer.budget_max?.toLocaleString() || "∞"}
                  </span>
                )}
                {offer.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {offer.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Images preview */}
              {offer.images && offer.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {offer.images.slice(0, 3).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Reference ${idx + 1}`}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ))}
                  {offer.images.length > 3 && (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xs">
                      +{offer.images.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {offer.responses_count} response{offer.responses_count !== 1 ? "s" : ""}
                </span>

                {showMyOffers && offer.status === "open" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => cancelOffer.mutate(offer.id)}
                  >
                    Cancel Request
                  </Button>
                )}

                {!showMyOffers && offer.user_type === "customer" && (
                  <Button size="sm">Respond to Request</Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
