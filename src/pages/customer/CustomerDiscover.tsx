import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation, calculateDistance } from "@/hooks/useLocation";
import { useSmartMatching, detectLowQualitySignals, useAiMatchmaking } from "@/hooks/useSmartMatching";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  Navigation,
  Package,
  Wrench,
  Filter,
  Star,
  AlertTriangle,
  Sparkles,
  Loader2,
  Lightbulb,
  Send,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReputationBadge } from "@/components/ui/reputation-badge";

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
  verification_tier: "none" | "basic" | "verified" | "premium" | "elite" | null;
  total_reviews: number | null;
  total_completed_orders: number | null;
}

interface Product {
  id: string;
  name: string;
  business_id: string;
  price?: number | null;
  image_url?: string | null;
}

interface Service {
  id: string;
  name: string;
  business_id: string;
  images?: string[] | null;
  price_min?: number | null;
  price_max?: number | null;
}

interface EnrichedBusiness extends Business {
  is_saved: boolean;
  distance: number | null;
  products: Product[];
  services: Service[];
  warnings: string[];
}

interface RankedBusiness extends EnrichedBusiness {
  matchScore: number;
  trustScore: number;
}

interface SearchInsight {
  id: string;
  ai_match_score?: number;
  ai_insights?: string[];
}

interface SearchAssistPayload {
  aiResults: SearchInsight[];
  relatedItems: string[];
}

const tokenizeSearch = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const buildRelatedTerms = (term: string, businesses: EnrichedBusiness[]) => {
  const tokens = tokenizeSearch(term);
  const catalogTerms = Array.from(
    new Set(
      businesses.flatMap((business) => [
        business.company_name,
        business.industry ?? "",
        business.products_services ?? "",
        ...business.products.map((product) => product.name),
        ...business.services.map((service) => service.name),
      ]),
    ),
  )
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return catalogTerms
    .filter((item) => {
      const normalized = item.toLowerCase();
      return tokens.some((token) => normalized.includes(token) || token.includes(normalized));
    })
    .slice(0, 6);
};

const buildLocalSearchAssist = (term: string, candidates: RankedBusiness[], businesses: EnrichedBusiness[]): SearchAssistPayload => {
  const aiResults = candidates.slice(0, 6).map((business) => {
    const insights: string[] = [];

    if (business.distance !== null) {
      insights.push(
        business.distance < 1
          ? "Very close to your location."
          : `${business.distance.toFixed(1)}km away from you.`,
      );
    }

    if (business.products.some((product) => product.name.toLowerCase().includes(term.toLowerCase()))) {
      insights.push("Has a matching product listed right now.");
    }

    if (business.services.some((service) => service.name.toLowerCase().includes(term.toLowerCase()))) {
      insights.push("Has a matching service available.");
    }

    if (business.verified) {
      insights.push("Verified business profile.");
    }

    if ((business.total_completed_orders || 0) > 0) {
      insights.push(`Completed ${business.total_completed_orders} orders on String.`);
    }

    return {
      id: business.id,
      ai_match_score: business.matchScore,
      ai_insights: insights.slice(0, 3),
    };
  });

  return {
    aiResults,
    relatedItems: buildRelatedTerms(term, businesses),
  };
};

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
  const [sortBy, setSortBy] = useState<string>("smart");

  const aiMatchmaking = useAiMatchmaking();
  const [searchInsights, setSearchInsights] = useState<SearchInsight[]>([]);
  const [relatedItems, setRelatedItems] = useState<string[]>([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestedItem, setSuggestedItem] = useState("");
  const [suggestionDetails, setSuggestionDetails] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

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
          .from("public_businesses")
          .select(`
            id, company_name, industry, business_location, products_services, 
            cover_image_url, latitude, longitude, business_type, 
            reputation_score, verified, verification_tier, total_reviews, total_completed_orders,
            products(id, name, business_id, price, image_url),
            services(id, name, business_id, images, price_min, price_max),
            saved_businesses!left(id)
          `)
          .eq("saved_businesses.customer_id", customer?.id || "")
          .order("created_at", { ascending: false });

        if (businessList) {
          const enriched = businessList.map((biz: EnrichedBusiness & { saved_businesses?: { id: string }[] }) => {
            let distance: number | null = null;
            if (customer?.latitude && customer?.longitude && biz.latitude && biz.longitude) {
              distance = calculateDistance(customer.latitude, customer.longitude, biz.latitude, biz.longitude);
            }

            const warnings = detectLowQualitySignals(biz);

            return {
              ...biz,
              is_saved: biz.saved_businesses?.length > 0,
              distance,
              products: biz.products?.slice(0, 5) || [],
              services: biz.services?.slice(0, 5) || [],
              warnings,
            };
          });

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

  const startChat = async (businessId: string) => {
    if (!customerId) return;

    try {
      const { data: existingConv } = await supabase
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

  const smartMatched = useSmartMatching<EnrichedBusiness>(businesses, {
    userLatitude: userLocation?.lat,
    userLongitude: userLocation?.lng,
    preferredType: typeFilter === "all" ? "all" : (typeFilter as "goods" | "services"),
  }) as RankedBusiness[];

  let filteredBusinesses: RankedBusiness[] = smartMatched.filter((b) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      b.company_name.toLowerCase().includes(searchLower) ||
      b.industry?.toLowerCase().includes(searchLower) ||
      b.business_location?.toLowerCase().includes(searchLower) ||
      b.products.some((p) => p.name.toLowerCase().includes(searchLower)) ||
      b.services.some((s) => s.name.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    if (typeFilter === "goods") return b.business_type === "goods" || b.products.length > 0;
    if (typeFilter === "services") return b.business_type === "services" || b.services.length > 0;

    return true;
  });

  if (sortBy !== "smart") {
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
        return (b.total_completed_orders || 0) - (a.total_completed_orders || 0);
      }
      return 0;
    });
  }

  const openSuggestionDialog = () => {
    const trimmedSearch = search.trim();
    setSuggestedItem(trimmedSearch);
    setSuggestionDetails("");
    setSuggestionOpen(true);
  };

  const applySearchAssist = (result: SearchAssistPayload, title: string, description: string) => {
    setSearchInsights(result.aiResults);
    setRelatedItems(result.relatedItems);
    toast({ title, description });
  };

  const handleSearchAssist = () => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      toast({ title: "Enter what you want to find first" });
      return;
    }

    const rankedCandidates = filteredBusinesses.length > 0 ? filteredBusinesses : smartMatched.slice(0, 8);
    const localFallback = buildLocalSearchAssist(trimmedSearch, rankedCandidates, businesses);

    aiMatchmaking.mutate(
      {
        userPreferences: { search_term: trimmedSearch, type_filter: typeFilter },
        businesses: rankedCandidates,
      },
      {
        onSuccess: (results) => {
          applySearchAssist(
            {
              aiResults: results.aiResults.length > 0 ? results.aiResults : localFallback.aiResults,
              relatedItems: results.relatedItems.length > 0 ? results.relatedItems : localFallback.relatedItems,
            },
            "Search highlights ready",
            "We ranked the closest businesses and related search terms for you.",
          );
        },
        onError: () => {
          applySearchAssist(
            localFallback,
            localFallback.aiResults.length > 0 ? "Showing the closest matches we found" : "No exact match yet",
            localFallback.aiResults.length > 0
              ? "Search assistance is using your current catalog and location data."
              : "You can suggest this item so businesses know what customers want next.",
          );
        },
      },
    );
  };

  const handleSuggestionSubmit = async () => {
    const normalizedSuggestedItem = suggestedItem.trim() || search.trim();

    if (!user || !normalizedSuggestedItem) {
      toast({
        title: "Add the item you want",
        description: "Tell us what product or service you could not find.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingSuggestion(true);

    try {
      const { error } = await supabase.from("item_search_suggestions").insert({
        user_id: user.id,
        customer_id: customerId,
        search_term: search.trim() || normalizedSuggestedItem,
        suggested_item: normalizedSuggestedItem,
        details: suggestionDetails.trim() || null,
      });

      if (error) throw error;

      setSuggestionOpen(false);
      setSuggestedItem("");
      setSuggestionDetails("");
      toast({
        title: "Suggestion sent",
        description: "Thanks. We will use this to guide what sellers add next.",
      });
    } catch (error) {
      console.error("Error submitting item suggestion:", error);
      toast({
        title: "We could not save your suggestion",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmittingSuggestion(false);
    }
  };

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

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search businesses, products, or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-11"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSearchAssist}
              disabled={aiMatchmaking.isPending || !search.trim()}
              className="h-12 flex-1 bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {aiMatchmaking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {aiMatchmaking.isPending ? "Searching..." : "Search String"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Cannot find what you need?</p>
            <p className="text-sm text-muted-foreground">
              Suggest the item or service and we will use it to guide what sellers add next.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0 border-0 bg-background/80 shadow-sm hover:bg-background"
            onClick={openSuggestionDialog}
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Suggest item
          </Button>
        </div>

        {relatedItems.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="whitespace-nowrap text-sm font-medium text-foreground">
              <Search className="mr-1 inline h-4 w-4 text-primary" />
              Related searches:
            </span>
            {relatedItems.map((item, idx) => (
              <button
                key={idx}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer whitespace-nowrap"
                onClick={() => setSearch(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}

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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">
                <span className="flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  Best Match
                </span>
              </SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground font-medium">
          {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? "es" : ""} found
        </p>

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
          <div className="dashboard-card text-center py-16">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="mt-4 font-semibold text-foreground text-lg">No businesses found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              {search ? "No matches found for your current search. Try different keywords or filters." : "We're expanding! Check back soon for new businesses in your area."}
            </p>
            {search.trim() && (
              <div className="mt-5">
                <Button onClick={openSuggestionDialog} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Suggest "{search.trim()}"
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <div key={business.id} className="dashboard-card group overflow-hidden border-border/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div
                  className="relative -mx-5 -mt-5 mb-4 h-32 bg-gradient-to-br from-muted/50 to-muted transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                  onClick={() => navigate(`/business/${business.id}`)}
                >
                  {business.cover_image_url ? (
                    <img src={business.cover_image_url} alt={business.company_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <span className="text-4xl font-bold text-slate-300 dark:text-slate-700">{business.company_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 flex-wrap">
                    {business.distance !== null && (
                      <span className="bg-background/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-foreground shadow-sm">
                        {business.distance < 1 ? `${Math.round(business.distance * 1000)}m` : `${business.distance.toFixed(1)}km`}
                      </span>
                    )}
                    {business.verification_tier && (
                      <ReputationBadge tier={(business.verification_tier || 'none') as 'none' | 'basic' | 'verified' | 'premium' | 'elite'} className="scale-75 origin-top-right shadow-sm" />
                    )}
                  </div>
                  
                  {business.warnings.length > 0 && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{business.warnings[0]}</span>
                      </div>
                    </div>
                  )}

                  {searchInsights.find((item) => item.id === business.id)?.ai_match_score !== undefined && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="default" className="border-0 bg-primary text-[10px] font-bold text-primary-foreground shadow-lg">
                        {searchInsights.find((item) => item.id === business.id)?.ai_match_score}% Search Match
                      </Badge>
                    </div>
                  )}
                </div>

                {searchInsights.find((item) => item.id === business.id)?.ai_insights && (
                  <div className="mb-3 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Sparkles className="h-3 w-3" /> Search highlights
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {searchInsights.find((item) => item.id === business.id)?.ai_insights?.map((insight, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-primary">-</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="cursor-pointer" onClick={() => navigate(`/business/${business.id}`)}>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg truncate">
                    {business.company_name}
                  </h3>
                  {business.reputation_score !== null && business.reputation_score > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-foreground">{business.reputation_score.toFixed(1)}</span>
                      {business.total_reviews !== null && business.total_reviews > 0 && (
                        <span className="text-xs text-muted-foreground leading-none">({business.total_reviews} reviews)</span>
                      )}
                    </div>
                  )}
                  {business.industry && (
                    <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide truncate opacity-70">{business.industry}</p>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {business.products && business.products.length > 0 && (
                    <div className="flex gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5 opacity-40 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {business.products.map((product) => (
                          <Badge key={product.id} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none font-medium">
                            {product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {business.services && business.services.length > 0 && (
                    <div className="flex gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground mt-0.5 opacity-40 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {business.services.map((service) => (
                          <Badge key={service.id} variant="outline" className="text-[10px] border-dashed font-medium">
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                  <button
                    onClick={() => toggleSave(business.id)}
                    className={`text-xs font-bold uppercase tracking-widest transition-colors ${business.is_saved ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {business.is_saved ? "Saved" : "Save"}
                  </button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startChat(business.id)}
                    className="text-xs font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary"
                  >
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
        <DialogContent className="border-0 bg-background shadow-2xl sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">Suggest a missing item</DialogTitle>
            <DialogDescription className="leading-6">
              Tell us what product or service you could not find. We will use this demand signal to guide what sellers add next.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="suggested-item" className="text-sm font-medium text-foreground">
                Product or service name
              </label>
              <Input
                id="suggested-item"
                value={suggestedItem}
                onChange={(event) => setSuggestedItem(event.target.value)}
                placeholder="Example: smoked turkey, event MC, solar battery"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="suggestion-details" className="text-sm font-medium text-foreground">
                Extra details
              </label>
              <Textarea
                id="suggestion-details"
                value={suggestionDetails}
                onChange={(event) => setSuggestionDetails(event.target.value)}
                placeholder="Add size, location, preferred quality, budget, or anything else that helps."
                className="min-h-[120px] border-0 bg-muted/40 shadow-none focus-visible:ring-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-0 bg-muted hover:bg-muted/80" onClick={() => setSuggestionOpen(false)}>
              Maybe later
            </Button>
            <Button onClick={handleSuggestionSubmit} disabled={submittingSuggestion} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submittingSuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
