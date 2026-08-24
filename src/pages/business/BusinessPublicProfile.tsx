import { RareBadgeIcon } from "@/components/ui/RareBadgeIcon";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  Briefcase,
  Globe,
  Package,
  Wrench,
  Search,
  ShieldCheck,
  Star,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ShareButton } from "@/components/common/ShareButton";
import { getMaskedAssetUrl } from "@/lib/assetMask";

interface Business {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  website: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  business_type: string | null;
  reputation_score: number | null;
  verified: boolean | null;
  verification_tier: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  compare_at_price?: number | null;
  image_url: string | null;
  images?: string[] | null;
  in_stock: boolean;
  category: string | null;
  is_rare: boolean | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_type: string;
  price_min: number | null;
  price_max: number | null;
  duration_estimate: string | null;
  is_available: boolean | null;
  images?: string[] | null;
}

export default function BusinessPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "products" | "services">("all");

  // Service request state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);

  // Dynamic OpenGraph, Twitter, and Schema.org LocalBusiness Structured Data
  usePageMeta({
    title: business?.company_name ? `${business.company_name} | Verified Campus Store` : "Campus Store",
    description: business?.products_services 
      ? `${business.company_name} on String: ${business.products_services}. Located in ${business.business_location || "Nigeria"}.`
      : `Explore verified products and services from ${business?.company_name || "campus merchant"} on String.`,
    image: business?.cover_image_url || business?.logo_url || "https://www.string.com.ng/String-logo-dark.png",
    url: `https://www.string.com.ng/business/${id}`,
    type: "business.business",
    keywords: [
      business?.company_name || "business",
      business?.industry || "campus merchant",
      business?.business_location || "Nigeria",
      "String store",
      "campus market"
    ],
    breadcrumbs: [
      { name: "Home", url: "https://www.string.com.ng/" },
      { name: "Discover", url: "https://www.string.com.ng/customer/discover" },
      { name: business?.company_name || "Store", url: `https://www.string.com.ng/business/${id}` }
    ],
    structuredData: business ? {
      "@context": "https://schema.org/",
      "@type": "Store",
      "name": business.company_name,
      "image": business.cover_image_url || business.logo_url || "https://www.string.com.ng/String-logo-dark.png",
      "description": business.products_services || `${business.company_name} on String`,
      "url": `https://www.string.com.ng/business/${business.id}`,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "NG",
        "addressLocality": business.business_location || "Nigeria"
      },
      ...(business.latitude && business.longitude ? {
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": business.latitude,
          "longitude": business.longitude
        }
      } : {}),
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": `${business.company_name} Catalog`,
        "itemListElement": products.slice(0, 10).map((p) => ({
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": p.name,
            "description": p.description || p.name,
            "url": `https://www.string.com.ng/product/${p.id}`,
            "offers": {
              "@type": "Offer",
              "price": p.price || 0,
              "priceCurrency": "NGN"
            }
          }
        }))
      }
    } : undefined,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const [businessRes, productsRes, servicesRes] = await Promise.all([
          supabase.from("public_businesses").select("*").eq("id", id).single(),
          supabase.from("products").select("*").eq("business_id", id).order("created_at", { ascending: false }),
          supabase.from("services").select("*").eq("business_id", id).order("created_at", { ascending: false }),
        ]);

        if (businessRes.data) setBusiness(businessRes.data as unknown as Business);
        if (productsRes.data) setProducts(productsRes.data as unknown as Product[]);
        if (servicesRes.data) setServices(servicesRes.data as unknown as Service[]);

        if (user && profile?.user_type === "customer") {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (customer) {
            setCustomerId(customer.id);
            const { data: savedData } = await supabase
              .from("saved_businesses")
              .select("id")
              .eq("customer_id", customer.id)
              .eq("business_id", id)
              .maybeSingle();

            setIsSaved(!!savedData);
          }
        }
      } catch (err) {
        console.error("Failed to load storefront data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, profile]);

  const toggleSave = async () => {
    if (!user) {
      toast.info("Please sign in to save businesses to your favorites");
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!customerId || !id) return;

    try {
      if (isSaved) {
        await supabase.from("saved_businesses").delete().eq("customer_id", customerId).eq("business_id", id);
        setIsSaved(false);
        toast.success("Removed from favorites");
      } else {
        await supabase.from("saved_businesses").insert({ customer_id: customerId, business_id: id });
        setIsSaved(true);
        toast.success("Saved to favorites");
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const startChat = async (itemContext?: string) => {
    if (!id) return;

    if (!user) {
      toast.info("Please sign in to message this business");
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const queryParams = new URLSearchParams({ biz: id });
    if (itemContext) {
      queryParams.set("product", itemContext);
    }
    navigate(`/customer/messages?${queryParams.toString()}`);
  };

  const openServiceRequest = (service: Service) => {
    if (!user) {
      toast.info("Please sign in to request a service");
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSelectedService(service);
    setJobTitle(`Request for ${service.name}`);
    setBudgetMin(service.price_min?.toString() || "");
    setBudgetMax(service.price_max?.toString() || "");
  };

  const submitJobRequest = async () => {
    if (!customerId || !selectedService || !business) return;

    setSubmittingJob(true);
    try {
      const { error } = await supabase.from("job_requests").insert({
        customer_id: customerId,
        business_id: business.id,
        service_id: selectedService.id,
        title: jobTitle,
        description: jobDescription,
        location: jobLocation,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Service request submitted! The merchant will review and message you.");
      setSelectedService(null);
      setJobTitle("");
      setJobDescription("");
      setJobLocation("");
      setBudgetMin("");
      setBudgetMax("");
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setSubmittingJob(false);
    }
  };

  const getPriceDisplay = (service: Service) => {
    if (service.price_type === "fixed" && service.price_min) {
      return `₦${Number(service.price_min).toLocaleString()}`;
    }
    if (service.price_type === "starting_at" && service.price_min) {
      return `From ₦${Number(service.price_min).toLocaleString()}`;
    }
    if (service.price_type === "range" && service.price_min && service.price_max) {
      return `₦${Number(service.price_min).toLocaleString()} - ₦${Number(service.price_max).toLocaleString()}`;
    }
    if (service.price_type === "negotiable") {
      return "Price on Request";
    }
    return "Contact for Pricing";
  };

  // Filtered items
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)) || (s.category && s.category.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-xs font-semibold text-muted-foreground">Loading storefront...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto text-muted-foreground">
            <Store className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Storefront Not Found</h2>
          <p className="text-xs text-muted-foreground">The business you are looking for may have updated its profile or is currently inactive.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-2xl text-xs font-semibold">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const showProductsTab = products.length > 0;
  const showServicesTab = services.length > 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-24 lg:pb-12">
        
        {/* Navigation & Breadcrumb Header */}
        <div className="flex items-center justify-between gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="rounded-2xl text-xs font-semibold hover:bg-muted/40 gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <ShareButton
              title={business.company_name}
              text={`Check out ${business.company_name} on String Campus Marketplace!`}
              url={window.location.href}
              imageUrl={business.cover_image_url || business.logo_url}
              variant="button"
              label="Share"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BESPOKE STOREFRONT HERO BANNER */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl overflow-hidden border border-border/40 bg-card shadow-sm transition-all duration-300">
          
          {/* Cover Header Image */}
          <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden bg-muted/40">
            {business.cover_image_url ? (
              <img 
                src={getMaskedAssetUrl(business.cover_image_url)} 
                alt={business.company_name} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-primary/10 via-card to-primary/5 flex items-center justify-center">
                <Store className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
            
            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            
            {/* Top Verification & Reputation Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {business.verification_tier && (
                <ReputationBadge tier={(business.verification_tier || 'none') as 'none' | 'basic' | 'verified' | 'premium' | 'elite'} />
              )}
              {business.verified && (
                <Badge className="bg-primary/90 hover:bg-primary text-white border-0 text-[10px] font-bold gap-1 shadow-sm px-2.5 py-0.5 rounded-full backdrop-blur-md">
                  <ShieldCheck className="h-3 w-3" /> Verified Merchant
                </Badge>
              )}
            </div>
          </div>

          {/* Business Profile Content Info */}
          <div className="px-5 pb-6 pt-0 relative -mt-14 sm:-mt-16 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              
              {/* Avatar + Main Identity */}
              <div className="flex items-end gap-3.5">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl bg-background border-2 border-background shadow-xl overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-border/30">
                  {business.logo_url ? (
                    <img 
                      src={getMaskedAssetUrl(business.logo_url)} 
                      alt={business.company_name} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
                      {business.company_name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                      {business.company_name}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {business.industry && (
                      <span className="inline-flex items-center gap-1 font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                        <Briefcase className="h-3 w-3 text-primary" /> {business.industry}
                      </span>
                    )}

                    {business.reputation_score !== null && business.reputation_score > 0 && (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <Star className="h-3 w-3 fill-amber-500" /> {business.reputation_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSave}
                  className="rounded-2xl text-xs font-bold gap-1.5 h-10 px-3.5 active:scale-95 transition-all"
                >
                  <Heart className={cn("h-4 w-4", isSaved ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                  {isSaved ? "Saved" : "Save"}
                </Button>

                <Button
                  onClick={() => startChat()}
                  size="sm"
                  className="rounded-2xl text-xs font-black gap-2 h-10 px-4 shadow-md active:scale-95 transition-all"
                >
                  <MessageCircle className="h-4 w-4" /> Message Merchant
                </Button>
              </div>
            </div>

            {/* Location & Navigation Metadata */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 text-xs text-muted-foreground border-t border-border/20">
              {business.business_location && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {business.business_location.includes(",") && !isNaN(Number(business.business_location.split(",")[0]))
                      ? "Verified Campus Coordinates"
                      : business.business_location}
                  </span>
                  {business.latitude && business.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary hover:underline ml-1 inline-flex items-center gap-0.5"
                    >
                      · Directions ↗
                    </a>
                  )}
                </div>
              )}

              {business.website && (
                <a
                  href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
                >
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{business.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* About Merchant Snippet */}
            {business.products_services && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-1 max-w-3xl">
                {business.products_services}
              </p>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INVENTORY FILTER & TABS */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/30 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                  activeTab === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Items ({products.length + services.length})
              </button>

              {showProductsTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                    activeTab === "products"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Package className="h-3.5 w-3.5 text-primary" /> Products ({products.length})
                </button>
              )}

              {showServicesTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab("services")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                    activeTab === "services"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Services ({services.length})
                </button>
              )}
            </div>

            {/* Fast Search input */}
            {(products.length > 3 || services.length > 3) && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store inventory..."
                  className="h-9 pl-9 pr-3 text-xs rounded-2xl bg-muted/20 border-border/40 focus-visible:ring-primary/20"
                />
              </div>
            )}
          </div>

          {/* ======================================================================= */}
          {/* PRODUCT CARDS GRID */}
          {/* ======================================================================= */}
          {(activeTab === "all" || activeTab === "products") && showProductsTab && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5 uppercase">
                  <Package className="h-4 w-4 text-primary" /> Products
                </h2>
                <span className="text-[11px] font-bold text-muted-foreground">{filteredProducts.length} items</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center space-y-2">
                  <Package className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">No matching products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const displayImage = product.image_url || (product.images && product.images[0]);
                    return (
                      <div
                        key={product.id}
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="group relative flex flex-col rounded-2xl sm:rounded-3xl border border-border/30 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98]"
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square w-full overflow-hidden bg-muted/20">
                          {displayImage ? (
                            <img
                              src={getMaskedAssetUrl(displayImage)}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                              <Package className="h-10 w-10" />
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {!product.in_stock && (
                              <span className="px-2 py-0.5 rounded-md bg-destructive/90 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
                                Sold Out
                              </span>
                            )}
                            {product.is_rare && (
                              <div title="Rare Product" className="bg-background/80 p-1 rounded-full shadow-sm backdrop-blur-md border border-primary/20 flex items-center justify-center">
                                <RareBadgeIcon className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Quick Share action */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <ShareButton
                              title={product.name}
                              text={`Check out ${product.name} from ${business.company_name} on String!`}
                              url={`${window.location.origin}/product/${product.id}`}
                              imageUrl={product.image_url}
                              variant="icon"
                            />
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                          <div className="space-y-1">
                            {product.category && (
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {product.category}
                              </span>
                            )}
                            <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>
                          </div>

                          <div className="pt-1 flex items-center justify-between border-t border-border/20">
                            <div>
                              <span className="text-xs sm:text-sm font-black text-foreground">
                                ₦{Number(product.price || 0).toLocaleString()}
                              </span>
                              {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                                <span className="text-[10px] text-muted-foreground line-through ml-1.5">
                                  ₦{Number(product.compare_at_price).toLocaleString()}
                                </span>
                              )}
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                startChat(product.name);
                              }}
                              className="h-7 px-2 text-[10px] font-bold rounded-xl text-primary hover:bg-primary/10"
                            >
                              Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* SERVICE CARDS GRID */}
          {/* ======================================================================= */}
          {(activeTab === "all" || activeTab === "services") && showServicesTab && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5 uppercase">
                  <Wrench className="h-4 w-4 text-primary" /> Services
                </h2>
                <span className="text-[11px] font-bold text-muted-foreground">{filteredServices.length} offerings</span>
              </div>

              {filteredServices.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center space-y-2">
                  <Wrench className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">No matching services found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredServices.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => navigate(`/service/${service.id}`)}
                      className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-border/30 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 p-4 cursor-pointer active:scale-[0.99] space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            {service.category && (
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {service.category}
                              </span>
                            )}
                            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {service.name}
                            </h3>
                          </div>

                          <Badge variant={service.is_available ? "outline" : "secondary"} className="text-[9px] font-bold shrink-0">
                            {service.is_available ? "Available" : "Busy"}
                          </Badge>
                        </div>

                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs sm:text-sm font-black text-foreground">
                            {getPriceDisplay(service)}
                          </span>
                          {service.duration_estimate && (
                            <p className="text-[10px] text-muted-foreground">Est: {service.duration_estimate}</p>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openServiceRequest(service);
                          }}
                          className="h-8 rounded-xl text-xs font-bold px-3 shadow-sm"
                        >
                          Request
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state when business has no listings at all */}
          {!showProductsTab && !showServicesTab && (
            <div className="rounded-3xl border border-dashed border-border/40 p-12 text-center space-y-3">
              <Store className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Storefront Catalogue Empty</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                This merchant has not added items yet. You can still message them directly for custom inquiries.
              </p>
              <Button onClick={() => startChat()} className="rounded-2xl text-xs font-bold mt-2">
                <MessageCircle className="h-3.5 w-3.5 mr-2" /> Message Merchant
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SERVICE REQUEST DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Service Quote</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-muted/30 border border-border/30 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-foreground">{selectedService.name}</p>
                <p className="text-xs font-black text-primary">{getPriceDisplay(selectedService)}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobTitle" className="text-xs font-bold">Request Title</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="rounded-xl text-xs h-10 bg-muted/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobDesc" className="text-xs font-bold">Description & Requirements</Label>
                <Textarea
                  id="jobDesc"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Provide specific details about what you need done..."
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobLoc" className="text-xs font-bold">Campus / Location</Label>
                <Input
                  id="jobLoc"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="e.g. Faculty of Science / Hostel Block B"
                  className="rounded-xl text-xs h-10 bg-muted/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="budgetMin" className="text-xs font-bold">Budget Min (₦)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    className="rounded-xl text-xs h-10 bg-muted/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budgetMax" className="text-xs font-bold">Budget Max (₦)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    className="rounded-xl text-xs h-10 bg-muted/20"
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 rounded-2xl text-xs font-black active:scale-95 transition-all shadow-md mt-2"
                onClick={submitJobRequest}
                disabled={submittingJob || !jobTitle}
              >
                {submittingJob ? "Submitting..." : "Submit Service Request"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
