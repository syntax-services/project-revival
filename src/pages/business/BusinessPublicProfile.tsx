import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  Briefcase,
  Globe,
  Package,
  Wrench,
  ShoppingCart,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ShareButton } from "@/components/common/ShareButton";

interface Business {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  website: string | null;
  cover_image_url: string | null;
  business_type: string | null;
  reputation_score: number | null;
  verified: boolean | null;
  verification_tier: VerificationTier | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  in_stock: boolean;
  category: string | null;
  commission_percent: number | null;
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
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function BusinessPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast: showToast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Service request state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);

  // Dynamic OpenGraph and Twitter Metadata for Store Link Previews
  usePageMeta({
    title: business?.company_name || "Campus Store",
    description: business?.products_services || business?.industry || "Verified campus merchant on String",
    image: business?.cover_image_url || null,
    url: window.location.href,
    type: "profile",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

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

          const savedRes = await supabase.from("saved_businesses").select("id").eq("customer_id", customer.id).eq("business_id", id).maybeSingle();

          setIsSaved(!!savedRes.data);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user, profile]);

  const toggleSave = async () => {
    if (!customerId || !id) return;

    try {
      if (isSaved) {
        await supabase.from("saved_businesses").delete().eq("customer_id", customerId).eq("business_id", id);
        setIsSaved(false);
        showToast({ title: "Removed from favorites" });
      } else {
        await supabase.from("saved_businesses").insert({ customer_id: customerId, business_id: id });
        setIsSaved(true);
        showToast({ title: "Saved to favorites" });
      }
    } catch (error) {
      showToast({ variant: "destructive", title: "Action failed" });
    }
  };


  const startChat = async () => {
    if (!customerId || !id) {
      showToast({ variant: "destructive", title: "Please log in as a customer to message" });
      return;
    }

    try {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", id)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from("conversations").insert({ customer_id: customerId, business_id: id });
      }

      navigate("/customer/messages");
    } catch (error) {
      showToast({ variant: "destructive", title: "Failed to start chat" });
    }
  };

  // Cart functions
  const addToCart = (product: Product) => {
    if (!product.in_stock) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  const proceedToCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    navigate("/customer/orders");
  };

  // Service request functions
  const openServiceRequest = (service: Service) => {
    setSelectedService(service);
    setJobTitle(`Request for ${service.name}`);
  };

  const submitJobRequest = async () => {
    if (!customerId || !id || !selectedService) return;

    setSubmittingJob(true);
    try {
      const { error } = await supabase.from("jobs").insert({
        customer_id: customerId,
        business_id: id,
        service_id: selectedService.id,
        title: jobTitle,
        description: jobDescription || null,
        location: jobLocation || null,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
      });

      if (error) throw error;

      toast.success("Service request submitted!");
      setSelectedService(null);
      setJobTitle("");
      setJobDescription("");
      setJobLocation("");
      setBudgetMin("");
      setBudgetMax("");
      navigate("/customer/jobs");
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setSubmittingJob(false);
    }
  };

  const getPriceDisplay = (service: Service) => {
    if (service.price_type === "quote") return "Quote on request";
    if (service.price_type === "hourly" && service.price_min) return `\u20A6${Number(service.price_min).toLocaleString()}/hr`;
    if (service.price_type === "range" && service.price_min && service.price_max) {
      return `\u20A6${Number(service.price_min).toLocaleString()} - \u20A6${Number(service.price_max).toLocaleString()}`;
    }
    if (service.price_min) return `\u20A6${Number(service.price_min).toLocaleString()}`;
    return "—";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-foreground border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Business not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const businessType = business.business_type || "goods";
  const showProducts = products.length > 0 || businessType === "goods" || businessType === "both";
  const showServices = services.length > 0 || businessType === "services" || businessType === "both";

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Cover Image */}
        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {business.cover_image_url ? (
            <img src={business.cover_image_url} alt={business.company_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl font-bold text-muted-foreground/30">{business.company_name.charAt(0)}</span>
            </div>
          )}
          {business.verification_tier && (
            <div className="absolute top-3 left-3">
              <ReputationBadge tier={(business.verification_tier || 'none') as 'none' | 'basic' | 'verified' | 'premium' | 'elite'} />
            </div>
          )}
        </div>

        {/* Business Info */}
        <div className="dashboard-card">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{business.company_name}</h1>
                {business.reputation_score && business.reputation_score > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-primary/10 px-2.5 py-0.75 rounded-full shrink-0">
                    <span>Reputation: {business.reputation_score.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {business.industry && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{business.industry}</span>
                  </div>
                )}
                {business.business_location && (
                  <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>
                      {business.business_location.includes(",") && !isNaN(Number(business.business_location.split(",")[0]))
                        ? "Verified Coordinates"
                        : business.business_location}
                    </span>
                    {business.latitude && business.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline ml-1 inline-flex items-center gap-0.5"
                      >
                        · Navigate via Google Maps ↗
                      </a>
                    )}
                  </div>
                )}
                {business.website && (
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:underline">
                    <Globe className="h-4 w-4" />
                    <span>{business.website}</span>
                  </a>
                )}
              </div>
            </div>

              <div className="flex flex-wrap gap-2">
                {business.business_location && (
                  <Button
                    variant="outline"
                    asChild
                  >
                    <a
                      href={business.latitude && business.longitude 
                        ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.business_location)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-primary animate-pulse" />
                      View on Map
                    </a>
                  </Button>
                )}
                {profile?.user_type === "customer" && (
                  <>
                    <Button variant="outline" onClick={toggleSave}>
                      <Heart className={cn("h-4 w-4 mr-2", isSaved && "fill-foreground")} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button onClick={startChat}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                <ShareButton
                  title={business.company_name}
                  text={`Check out ${business.company_name} on String Campus Marketplace!`}
                  url={window.location.href}
                  imageUrl={business.cover_image_url}
                  variant="button"
                  label="Share Store"
                />
              </div>
          </div>

          {business.products_services && (
            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="font-medium text-foreground mb-2">About</h2>
              <p className="text-muted-foreground">{business.products_services}</p>
            </div>
          )}
        </div>

        {/* Products & Services Lists */}
        <div className="space-y-12">
          {showProducts && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Products ({products.length})</h2>
              </div>
              {products.length === 0 ? (
                <div className="dashboard-card text-center py-8">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No products listed</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <div key={product.id} className="dashboard-card">
                      {product.image_url && (
                        <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden rounded-t-lg">
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground">{product.name}</h3>
                        <ShareButton
                          title={product.name}
                          text={`Check out ${product.name} from ${business.company_name} on String!`}
                          url={`${window.location.origin}/business/${business.id}?product=${product.id}`}
                          imageUrl={product.image_url}
                          variant="icon"
                        />
                      </div>
                      {product.category && (
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      )}
                      {product.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        {product.price && (
                          <span className="font-semibold text-foreground">{'\u20A6'}{Number(product.price).toLocaleString()}</span>
                        )}
                        <Badge variant={product.in_stock ? "default" : "secondary"}>
                          {product.in_stock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      {profile?.user_type === "customer" && product.in_stock && (
                        <Button className="w-full mt-3 font-semibold rounded-xl" onClick={startChat} size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Contact Business Owner
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showServices && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Services ({services.length})</h2>
              </div>
              {services.length === 0 ? (
                <div className="dashboard-card text-center py-8">
                  <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No services listed</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map((service) => (
                    <div key={service.id} className="dashboard-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground">{service.name}</h3>
                              <Badge variant={service.is_available ? "default" : "secondary"}>
                                {service.is_available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                            <ShareButton
                              title={service.name}
                              text={`Check out ${service.name} from ${business.company_name} on String!`}
                              url={`${window.location.origin}/business/${business.id}?service=${service.id}`}
                              variant="icon"
                            />
                          </div>
                          {service.category && (
                            <p className="text-xs text-muted-foreground">{service.category}</p>
                          )}
                          {service.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                          )}
                          <p className="mt-2 font-medium text-foreground">{getPriceDisplay(service)}</p>
                          {service.duration_estimate && (
                            <p className="text-xs text-muted-foreground">Est. duration: {service.duration_estimate}</p>
                          )}
                        </div>
                      </div>
                      {profile?.user_type === "customer" && service.is_available && (
                        <Button className="w-full mt-3" onClick={() => openServiceRequest(service)} size="sm">
                          Request Service
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Cart Button & Dialog removed for MVP chat handshake model */}
      </div>

      {/* Service Request Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Service</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedService.name}</p>
                <p className="text-sm text-muted-foreground">{getPriceDisplay(selectedService)}</p>
              </div>

              <div>
                <Label htmlFor="jobTitle">Request Title</Label>
                <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="jobDesc">Description</Label>
                <Textarea id="jobDesc" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Describe what you need done" className="mt-1" rows={3} />
              </div>

              <div>
                <Label htmlFor="jobLoc">Location</Label>
                <Input id="jobLoc" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Where is the work needed?" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="budgetMin">Budget Min (₦)</Label>
                  <Input id="budgetMin" type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="budgetMax">Budget Max (₦)</Label>
                  <Input id="budgetMax" type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="mt-1" />
                </div>
              </div>

              <Button className="w-full" onClick={submitJobRequest} disabled={submittingJob || !jobTitle}>
                {submittingJob ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
