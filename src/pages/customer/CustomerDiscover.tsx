import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation, calculateDistance } from "@/hooks/useLocation";
import {
  Search,
  Heart,
  Building2,
  MapPin,
  Briefcase,
  Star,
  MessageCircle,
  Navigation,
  Package,
  Wrench,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Business {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  business_type: string | null;
  reputation_score: number | null;
  verified: boolean | null;
}

interface EnrichedBusiness extends Business {
  likes_count: number;
  is_liked: boolean;
  is_saved: boolean;
  distance: number | null;
  products_count: number;
  services_count: number;
}

export default function CustomerDiscover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { location, requestLocation, loading: locationLoading } = useUserLocation();
  
  const [businesses, setBusinesses] = useState<EnrichedBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("distance");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("id, latitude, longitude")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customer) {
          setCustomerId(customer.id);
          if (customer.latitude && customer.longitude) {
            setUserLocation({ lat: customer.latitude, lng: customer.longitude });
          }
        }

        const { data: businessList } = await supabase
          .from("businesses")
          .select("id, company_name, industry, business_location, products_services, cover_image_url, latitude, longitude, business_type, reputation_score, verified")
          .order("created_at", { ascending: false });

        if (businessList && customer) {
          const enriched = await Promise.all(
            businessList.map(async (biz) => {
              const [likesRes, likedRes, savedRes, productsRes, servicesRes] = await Promise.all([
                supabase.from("business_likes").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
                supabase.from("business_likes").select("id").eq("business_id", biz.id).eq("customer_id", customer.id).maybeSingle(),
                supabase.from("saved_businesses").select("id").eq("business_id", biz.id).eq("customer_id", customer.id).maybeSingle(),
                supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", biz.id),
                supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", biz.id),
              ]);

              let distance: number | null = null;
              if (customer.latitude && customer.longitude && biz.latitude && biz.longitude) {
                distance = calculateDistance(customer.latitude, customer.longitude, biz.latitude, biz.longitude);
              }

              return {
                ...biz,
                likes_count: likesRes.count || 0,
                is_liked: !!likedRes.data,
                is_saved: !!savedRes.data,
                distance,
                products_count: productsRes.count || 0,
                services_count: servicesRes.count || 0,
              };
            })
          );

          setBusinesses(enriched);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, location]);

  const toggleSave = async (businessId: string) => {
    if (!customerId) return;

    const business = businesses.find((b) => b.id === businessId);
    if (!business) return;

    try {
      if (business.is_saved) {
        await supabase.from("saved_businesses").delete().eq("customer_id", customerId).eq("business_id", businessId);
        setBusinesses((prev) => prev.map((b) => b.id === businessId ? { ...b, is_saved: false } : b));
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from("saved_businesses").insert({ customer_id: customerId, business_id: businessId });
        setBusinesses((prev) => prev.map((b) => b.id === businessId ? { ...b, is_saved: true } : b));
        toast({ title: "Saved to favorites" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const toggleLike = async (businessId: string) => {
    if (!customerId) return;

    const business = businesses.find((b) => b.id === businessId);
    if (!business) return;

    try {
      if (business.is_liked) {
        await supabase.from("business_likes").delete().eq("customer_id", customerId).eq("business_id", businessId);
        setBusinesses((prev) => prev.map((b) => b.id === businessId ? { ...b, is_liked: false, likes_count: b.likes_count - 1 } : b));
      } else {
        await supabase.from("business_likes").insert({ customer_id: customerId, business_id: businessId });
        setBusinesses((prev) => prev.map((b) => b.id === businessId ? { ...b, is_liked: true, likes_count: b.likes_count + 1 } : b));
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const startChat = async (businessId: string) => {
    if (!customerId) return;

    try {
      let { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from("conversations").insert({ customer_id: customerId, business_id: businessId });
      }

      navigate("/customer/messages");
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to start chat" });
    }
  };

  // Filter and sort
  let filteredBusinesses = businesses.filter((b) => {
    const matchesSearch = 
      b.company_name.toLowerCase().includes(search.toLowerCase()) ||
      b.industry?.toLowerCase().includes(search.toLowerCase()) ||
      b.business_location?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (typeFilter === "goods") return b.business_type === "goods" || b.products_count > 0;
    if (typeFilter === "services") return b.business_type === "services" || b.services_count > 0;
    
    return true;
  });

  // Sort
  filteredBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (sortBy === "distance") {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    }
    if (sortBy === "rating") {
      return (b.reputation_score || 0) - (a.reputation_score || 0);
    }
    if (sortBy === "popular") {
      return b.likes_count - a.likes_count;
    }
    return 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Discover</h1>
          <p className="mt-1 text-muted-foreground">Find products and services near you</p>
        </div>

        {!userLocation && (
          <div className="dashboard-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Navigation className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Enable location</p>
                <p className="text-sm text-muted-foreground">See nearby businesses first</p>
              </div>
            </div>
            <Button variant="outline" onClick={requestLocation} disabled={locationLoading}>
              {locationLoading ? "Getting..." : "Enable"}
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, industry, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="goods">Products</SelectItem>
              <SelectItem value="services">Services</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? "es" : ""} found
        </p>

        {/* Business Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-32 -mx-5 -mt-5 mb-4 rounded-t-xl bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium text-foreground">No businesses found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "Try adjusting your search terms" : "Check back later for new businesses"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <div key={business.id} className="dashboard-card group overflow-hidden">
                <div
                  className="relative -mx-5 -mt-5 mb-4 h-32 bg-gradient-to-br from-muted to-muted/50 cursor-pointer"
                  onClick={() => navigate(`/business/${business.id}`)}
                >
                  {business.cover_image_url ? (
                    <img src={business.cover_image_url} alt={business.company_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground/30">{business.company_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {business.distance !== null && (
                      <span className="bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-foreground">
                        {business.distance < 1 ? `${Math.round(business.distance * 1000)}m` : `${business.distance.toFixed(1)}km`}
                      </span>
                    )}
                    {business.verified && (
                      <Badge variant="default" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/business/${business.id}`)}>
                    <h3 className="font-medium text-foreground hover:text-foreground/80 transition-colors truncate">
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
                      </div>
                    )}
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => toggleSave(business.id)} className="flex-shrink-0">
                    <Heart className={cn("h-4 w-4 transition-colors", business.is_saved && "fill-foreground")} />
                  </Button>
                </div>

                {/* Type indicators */}
                <div className="flex gap-2 mt-3">
                  {business.products_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {business.products_count} products
                    </Badge>
                  )}
                  {business.services_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Wrench className="h-3 w-3 mr-1" />
                      {business.services_count} services
                    </Badge>
                  )}
                </div>

                {/* Rating & Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <button onClick={() => toggleLike(business.id)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Star className={cn("h-4 w-4", business.is_liked && "fill-foreground text-foreground")} />
                    <span>{business.likes_count} {business.likes_count === 1 ? "like" : "likes"}</span>
                  </button>

                  <Button variant="outline" size="sm" onClick={() => startChat(business.id)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
