/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AdminOffersTabProps {
  allOffers: any[];
  refetchOffers: () => void;
}

export function AdminOffersTab({
  allOffers,
  refetchOffers,
}: AdminOffersTabProps) {
  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      const { error } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offer updated!");
      refetchOffers();
    },
    onError: (err: any) => {
      toast.error("Failed to update offer: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Offer Requests ({allOffers?.length || 0})</CardTitle>
          <CardDescription>Customer requests for products/services</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {allOffers?.map((offer: any) => (
                <div key={offer.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{offer.offer_type}</Badge>
                        <Badge variant={offer.status === 'open' ? 'secondary' : offer.status === 'fulfilled' ? 'default' : 'outline'}>
                          {offer.status}
                        </Badge>
                        {offer.urgency && <Badge variant="destructive">{offer.urgency}</Badge>}
                      </div>
                      <h4 className="font-medium">{offer.title}</h4>
                      {offer.description && (
                        <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                      )}
                      {offer.budget_min || offer.budget_max ? (
                        <p className="text-sm mt-1">
                          Budget: ₦{offer.budget_min?.toLocaleString() || 0} - ₦{offer.budget_max?.toLocaleString() || 'Any'}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {offer.images && offer.images[0] && (
                      <img src={offer.images[0]} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    )}
                  </div>
                  {offer.status === 'open' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateOfferMutation.mutate({ offerId: offer.id, status: 'fulfilled' })}
                      >
                        Mark Fulfilled
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOfferMutation.mutate({ offerId: offer.id, status: 'closed' })}
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
