import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Heart, Building2, MapPin, Briefcase } from "lucide-react";

interface Business {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
}

export default function CustomerDiscover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Get customer ID
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customer) {
          setCustomerId(customer.id);

          // Get saved business IDs
          const { data: saved } = await supabase
            .from("saved_businesses")
            .select("business_id")
            .eq("customer_id", customer.id);

          if (saved) {
            setSavedIds(new Set(saved.map((s) => s.business_id)));
          }
        }

        // Fetch all businesses
        const { data: businessList } = await supabase
          .from("businesses")
          .select("id, company_name, industry, business_location, products_services")
          .order("created_at", { ascending: false });

        if (businessList) {
          setBusinesses(businessList);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleSave = async (businessId: string) => {
    if (!customerId) return;

    const isSaved = savedIds.has(businessId);

    try {
      if (isSaved) {
        await supabase
          .from("saved_businesses")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", businessId);

        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });

        toast({ title: "Business removed from favorites" });
      } else {
        await supabase.from("saved_businesses").insert({
          customer_id: customerId,
          business_id: businessId,
        });

        setSavedIds((prev) => new Set(prev).add(businessId));

        toast({ title: "Business saved to favorites" });
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Please try again.",
      });
    }
  };

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.company_name.toLowerCase().includes(search.toLowerCase()) ||
      b.industry?.toLowerCase().includes(search.toLowerCase()) ||
      b.business_location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Discover Businesses
          </h1>
          <p className="mt-1 text-muted-foreground">
            Find businesses tailored to your preferences
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, industry, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Business Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                <div className="mt-4 h-10 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="dashboard-card text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium text-foreground">
              No businesses found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "Try adjusting your search terms"
                : "Check back later for new businesses"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <div key={business.id} className="dashboard-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {business.company_name}
                    </h3>
                    {business.industry && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        {business.industry}
                      </div>
                    )}
                    {business.business_location && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {business.business_location}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSave(business.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        savedIds.has(business.id)
                          ? "fill-pink-500 text-pink-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>
                {business.products_services && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {business.products_services}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
