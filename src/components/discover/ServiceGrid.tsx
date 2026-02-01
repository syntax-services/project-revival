import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Star, MessageSquare, Crown, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  price_min?: number | null;
  price_max?: number | null;
  price_type?: string;
  duration_estimate?: string | null;
  business_id: string;
  is_promoted?: boolean;
  business?: {
    id: string;
    company_name: string;
    reputation_score?: number | null;
    verification_tier?: string;
  };
}

interface ServiceGridProps {
  services: Service[];
  onMessageBusiness: (businessId: string) => void;
}

export function ServiceGrid({ services, onMessageBusiness }: ServiceGridProps) {
  const navigate = useNavigate();

  // Sort promoted services first
  const sortedServices = [...services].sort((a, b) => {
    if (a.is_promoted && !b.is_promoted) return -1;
    if (!a.is_promoted && b.is_promoted) return 1;
    return 0;
  });

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-medium">No services found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedServices.map((service) => (
        <Card
          key={service.id}
          className={`overflow-hidden hover:shadow-lg transition-shadow ${
            service.is_promoted ? "ring-2 ring-yellow-500/50" : ""
          }`}
        >
          {/* Service Image */}
          <div
            className="relative h-40 bg-gradient-to-br from-muted to-muted/50 cursor-pointer"
            onClick={() => navigate(`/business/${service.business_id}`)}
          >
            {service.images && service.images[0] ? (
              <img
                src={service.images[0]}
                alt={service.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Wrench className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Promoted Badge */}
            {service.is_promoted && (
              <Badge className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500">
                <Crown className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}

            {/* Price Badge */}
            {(service.price_min || service.price_max) && (
              <Badge variant="secondary" className="absolute top-2 right-2">
                {service.price_min && service.price_max
                  ? `₦${service.price_min.toLocaleString()} - ₦${service.price_max.toLocaleString()}`
                  : service.price_min
                  ? `From ₦${service.price_min.toLocaleString()}`
                  : `Up to ₦${service.price_max?.toLocaleString()}`}
              </Badge>
            )}
          </div>

          <CardContent className="p-4">
            {/* Service Info */}
            <h3 className="font-medium text-foreground line-clamp-1">{service.name}</h3>
            
            {service.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {service.description}
              </p>
            )}

            {/* Duration */}
            {service.duration_estimate && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{service.duration_estimate}</span>
              </div>
            )}

            {/* Business Info */}
            {service.business && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium hover:underline cursor-pointer"
                      onClick={() => navigate(`/business/${service.business_id}`)}
                    >
                      {service.business.company_name}
                    </p>
                    {service.business.reputation_score && service.business.reputation_score > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-foreground text-foreground" />
                        <span className="text-xs">{service.business.reputation_score.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMessageBusiness(service.business_id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
