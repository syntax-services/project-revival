import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search,
  Building2,
  Package,
  Wrench,
  Filter,
  Star,
  MessageCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerificationBadge } from "@/components/business/VerificationBadge";

interface Business {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  cover_image_url: string | null;
  business_type: string | null;
  reputation_score: number | null;
  verification_tier: string | null;
  total_reviews: number | null;
}

interface Product {
  id: string;
  name: string;
  business_id: string;
  price: number | null;
  image_url: string | null;
}

interface Service {
  id: string;
  name: string;
  business_id: string;
  price_min: number | null;
  images: string[] | null;
}

export default function BusinessDiscover() {
  const { user } = useAuth();
  const { data: myBusiness } = useBusiness();
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"businesses" | "products" | "services">("businesses");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [businessesRes, productsRes, servicesRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, user_id, company_name, industry, business_location, cover_image_url, business_type, reputation_score, verification_tier, total_reviews")
            .neq("id", myBusiness?.id || "")
            .order("reputation_score", { ascending: false, nullsFirst: false }),
          supabase
            .from("products")
            .select("id, name, business_id, price, image_url")
            .eq("in_stock", true)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("services")
            .select("id, name, business_id, price_min, images")
            .eq("is_available", true)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (businessesRes.data) {
          // Filter out own business
          setBusinesses(businessesRes.data.filter(b => b.id !== myBusiness?.id));
        }
        if (productsRes.data) setProducts(productsRes.data);
        if (servicesRes.data) setServices(servicesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [myBusiness?.id]);

  // Start B2B conversation
  const startB2BChat = async (otherBusinessUserId: string, otherBusinessName: string) => {
    if (!myBusiness?.id || !user?.id) {
      toast.error("You need a business profile to message");
      return;
    }

    // For B2B messaging, we'll create a notification to the other business
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: otherBusinessUserId,
        title: "New Business Inquiry",
        message: `${myBusiness.company_name} wants to connect with you. Check your messages!`,
        type: "message",
      });

      if (error) throw error;
      
      toast.success(`Message request sent to ${otherBusinessName}`);
      navigate("/business/messages");
    } catch (error) {
      toast.error("Failed to start conversation");
    }
  };

  // Filter based on search
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.company_name.toLowerCase().includes(search.toLowerCase()) ||
      b.industry?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === "goods") return b.business_type === "goods" || b.business_type === "both";
    if (typeFilter === "services") return b.business_type === "services" || b.business_type === "both";
    return true;
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Discover</h1>
          <p className="mt-1 text-muted-foreground">Find businesses, products, and services</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="businesses">Businesses</SelectItem>
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="services">Services</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === "businesses" && (
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
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-32 -mx-5 -mt-5 mb-4 rounded-t-xl bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : viewMode === "businesses" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.length === 0 ? (
              <div className="col-span-full dashboard-card text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium">No businesses found</h3>
              </div>
            ) : (
              filteredBusinesses.map((business) => (
                <div key={business.id} className="dashboard-card group overflow-hidden">
                  <div className="relative -mx-5 -mt-5 mb-4 h-32 bg-gradient-to-br from-muted to-muted/50">
                    {business.cover_image_url ? (
                      <img
                        src={business.cover_image_url}
                        alt={business.company_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl font-bold text-muted-foreground/30">
                          {business.company_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <VerificationBadge 
                        tier={(business.verification_tier as "none" | "verified" | "premium") || "none"} 
                        size="sm"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground">{business.company_name}</h3>
                    {business.reputation_score && business.reputation_score > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-foreground text-foreground" />
                        <span className="text-sm">{Number(business.reputation_score).toFixed(1)}</span>
                      </div>
                    )}
                    {business.industry && (
                      <p className="text-sm text-muted-foreground mt-1">{business.industry}</p>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => startB2BChat(business.user_id, business.company_name)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : viewMode === "products" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full dashboard-card text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium">No products found</h3>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="dashboard-card">
                  <div className="relative -mx-5 -mt-5 mb-4 h-32 bg-muted rounded-t-xl overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium">{product.name}</h3>
                  {product.price && (
                    <p className="text-sm font-medium mt-1">₦{product.price.toLocaleString()}</p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.length === 0 ? (
              <div className="col-span-full dashboard-card text-center py-12">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium">No services found</h3>
              </div>
            ) : (
              filteredServices.map((service) => (
                <div key={service.id} className="dashboard-card">
                  <div className="relative -mx-5 -mt-5 mb-4 h-32 bg-muted rounded-t-xl overflow-hidden">
                    {service.images && service.images.length > 0 ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Wrench className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium">{service.name}</h3>
                  {service.price_min && (
                    <p className="text-sm font-medium mt-1">From ₦{service.price_min.toLocaleString()}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}