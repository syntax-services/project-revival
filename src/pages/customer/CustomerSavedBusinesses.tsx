import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer, useSavedBusinesses } from "@/hooks/useCustomer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/business/VerificationBadge";
import { 
  Heart, 
  MessageCircle, 
  Star, 
  MapPin, 
  Building2,
  Trash2 
} from "lucide-react";

export default function CustomerSavedBusinesses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: customer } = useCustomer();
  const { data: savedBusinesses = [], isLoading } = useSavedBusinesses(customer?.id);

  const unsaveBusiness = async (savedId: string) => {
    try {
      await supabase.from("saved_businesses").delete().eq("id", savedId);
      queryClient.invalidateQueries({ queryKey: ["saved-businesses"] });
      toast.success("Removed from saved");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const startChat = async (businessId: string) => {
    if (!customer?.id) return;

    try {
      let { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from("conversations").insert({ 
          customer_id: customer.id, 
          business_id: businessId 
        });
      }

      navigate("/customer/messages");
    } catch (error) {
      toast.error("Failed to start chat");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Saved Businesses</h1>
          <p className="mt-1 text-muted-foreground">
            Businesses you've saved for quick access
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="flex gap-4">
                  <div className="h-20 w-20 rounded-xl bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : savedBusinesses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium text-foreground">No saved businesses</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Save businesses from the Discover page for quick access
              </p>
              <Button 
                className="mt-4" 
                onClick={() => navigate("/customer/discover")}
              >
                Discover Businesses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedBusinesses.map((saved) => {
              const business = saved.businesses;
              if (!business) return null;

              return (
                <div key={saved.id} className="dashboard-card">
                  <div className="flex gap-4">
                    {/* Business Image */}
                    <div
                      className="h-20 w-20 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/business/${business.id}`)}
                    >
                      {business.cover_image_url ? (
                        <img
                          src={business.cover_image_url}
                          alt={business.company_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted-foreground/30">
                            {business.company_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Business Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="cursor-pointer"
                          onClick={() => navigate(`/business/${business.id}`)}
                        >
                          <h3 className="font-medium text-foreground truncate hover:text-foreground/80">
                            {business.company_name}
                          </h3>
                          {business.industry && (
                            <p className="text-sm text-muted-foreground truncate">
                              {business.industry}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => unsaveBusiness(saved.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {business.reputation_score && business.reputation_score > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-foreground text-foreground" />
                            {business.reputation_score.toFixed(1)}
                          </div>
                        )}
                        {business.business_type && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {business.business_type}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/business/${business.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => startChat(business.id)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
