import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Package, Truck, CheckCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TrackingUpdate {
  status: string;
  location?: string;
  timestamp: string;
  note?: string;
}

interface DeliveryTrackingProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    current_location?: string | null;
    tracking_updates?: TrackingUpdate[] | null;
    estimated_arrival?: string | null;
    delivery_address?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  };
  showDetails?: boolean;
}

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

export function DeliveryTracking({ order, showDetails = true }: DeliveryTrackingProps) {
  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const trackingUpdates = (order.tracking_updates as TrackingUpdate[]) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Delivery Status</CardTitle>
            <CardDescription>{order.order_number}</CardDescription>
          </div>
          {order.estimated_arrival && order.status === "shipped" && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Est. {format(new Date(order.estimated_arrival), "MMM d, h:mm a")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {statusSteps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div
                      className={`absolute top-1/2 left-full w-full h-0.5 -translate-y-1/2 ${
                        idx < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ width: "calc(100% - 2rem)" }}
                    />
                  )}
                </div>
                <span className={`text-xs mt-1 text-center ${
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Location */}
        {order.current_location && order.status === "shipped" && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Current Location</p>
                <p className="text-sm text-muted-foreground">{order.current_location}</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {order.delivery_address && showDetails && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Delivery To</p>
                <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Updates */}
        {showDetails && trackingUpdates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tracking History</p>
            <div className="space-y-3">
              {trackingUpdates.map((update, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{update.status}</p>
                    {update.location && (
                      <p className="text-muted-foreground">{update.location}</p>
                    )}
                    {update.note && (
                      <p className="text-muted-foreground">{update.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivered confirmation */}
        {order.status === "delivered" && order.delivered_at && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm font-medium">
                Delivered on {format(new Date(order.delivered_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
