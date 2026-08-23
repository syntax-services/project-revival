import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Heart, Bookmark, Share2, Store, MessageCircle, 
  ShieldCheck, CheckCircle2, Wrench, Clock, MapPin, Loader2, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { useProductSocial } from "@/hooks/useProductSocial";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ShareButton } from "@/components/common/ShareButton";

interface ServiceDetailData {
  id: string;
  name: string;
  description: string | null;
  price_type: string;
  price_min: number | null;
  price_max: number | null;
  duration_estimate: string | null;
  category: string | null;
  images: string[] | null;
  tags: string[] | null;
  is_available: boolean;
  business_id: string;
  created_at: string;
  business?: {
    id: string;
    company_name: string;
    logo_url: string | null;
    verified: boolean | null;
    business_location: string | null;
    user_id: string;
  };
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [service, setService] = useState<ServiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const { liked, saved, toggleLike, toggleSave } = useProductSocial(id);

  // Dynamic OpenGraph, Twitter, and Schema.org Service Structured Data
  usePageMeta({
    title: service?.name ? `${service.name} | ${service.business?.company_name || "Campus Service Provider"}` : "Campus Service",
    description: service?.description 
      ? `${service.description.slice(0, 155)}... Provided by ${service.business?.company_name || "verified campus professional"} on String.`
      : `Book ${service?.name || "this service"} from ${service?.business?.company_name || "a verified campus provider"} on String.`,
    image: (service?.images && service.images[0]) || service?.business?.logo_url || null,
    url: `https://www.string.com.ng/service/${id}`,
    type: "product",
    keywords: [
      service?.name || "service",
      service?.category || "campus service",
      service?.business?.company_name || "provider",
      ...(service?.tags || []),
      "String Nigeria",
      "campus freelancers"
    ],
    breadcrumbs: [
      { name: "Home", url: "https://www.string.com.ng/" },
      { name: "Discover", url: "https://www.string.com.ng/customer/discover?type=services" },
      { name: service?.category || "Services", url: `https://www.string.com.ng/customer/discover?type=services&cat=${encodeURIComponent(service?.category || "all")}` },
      { name: service?.name || "Service", url: `https://www.string.com.ng/service/${id}` }
    ],
    structuredData: service ? {
      "@context": "https://schema.org/",
      "@type": "Service",
      "name": service.name,
      "image": (service.images && service.images[0]) || service.business?.logo_url || "https://www.string.com.ng/String-logo-dark.png",
      "description": service.description || `Book ${service.name} on String.`,
      "serviceType": service.category || "Professional & Campus Service",
      "provider": {
        "@type": "LocalBusiness",
        "name": service.business?.company_name || "String Service Provider",
        "image": service.business?.logo_url || undefined,
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "NG",
          "addressLocality": service.business?.business_location || "Nigeria"
        }
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "NGN",
        "price": service.price_min || 0,
        "availability": service.is_available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    } : undefined,
  });

  useEffect(() => {
    async function loadService() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("services")
          .select(`
            *,
            business:businesses(id, company_name, logo_url, verified, business_location, user_id)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching service:", error);
        }

        if (data) {
          setService(data as any);
        }
      } catch (err) {
        console.error("Failed to load service:", err);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: service?.name || "Service on String",
        text: `Check out ${service?.name} on String!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleStartChat = () => {
    if (!service?.business?.id) return;
    if (!user) {
      toast.info("Please sign in to message this provider and request quotes.");
      navigate(`/auth?redirect=${encodeURIComponent(`/service/${service.id}`)}`);
      return;
    }
    navigate(`/customer/messages?biz=${service.business.id}&service=${encodeURIComponent(service.name)}`);
  };

  const galleryImages = service?.images && service.images.length > 0 ? service.images : [];

  const formatPrice = () => {
    if (!service) return "";
    if (service.price_type === "quote") return "Quote on Request";
    if (service.price_type === "range" && service.price_min && service.price_max) {
      return `₦${service.price_min.toLocaleString()} – ₦${service.price_max.toLocaleString()}`;
    }
    if (service.price_min) {
      return `₦${service.price_min.toLocaleString()}${service.price_type === "hourly" ? " / hr" : ""}`;
    }
    return "Negotiable";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading service details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!service) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold">Service Not Found</h2>
          <p className="text-xs text-muted-foreground">This service may no longer be available.</p>
          <Button onClick={() => navigate(-1)} variant="secondary" className="rounded-2xl text-xs font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feed
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-24 text-left space-y-6 pt-2">
        {/* Top Action Nav */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm" 
            className="rounded-2xl gap-2 font-bold text-xs hover:bg-muted/40"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleLike}
              variant="outline"
              size="icon"
              className={`rounded-full h-9 w-9 transition-colors ${
                liked ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-muted-foreground"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </Button>

            <Button
              onClick={toggleSave}
              variant="outline"
              size="icon"
              className={`rounded-full h-9 w-9 transition-colors ${
                saved ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            </Button>

            <ShareButton
              title={service.name}
              text={`Check out ${service.name} by ${service.business?.company_name || "Campus Service"} on String!`}
              url={window.location.href}
              imageUrl={galleryImages[0] || service.business?.logo_url}
              className="h-9 w-9 rounded-full border border-border/40 text-muted-foreground hover:text-foreground"
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-muted/30 border border-border/40 shadow-md">
              {galleryImages.length > 0 ? (
                <img
                  src={getMaskedAssetUrl(galleryImages[selectedImageIdx])}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Wrench className="h-10 w-10 opacity-30" />
                  <span className="text-xs">No image provided</span>
                </div>
              )}

              {/* Co-Branded Storefront Avatar Badge at Bottom-Right of Service Image */}
              {service.business?.logo_url && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/business/${service.business?.id}`);
                  }}
                  className="absolute bottom-3.5 right-3.5 h-10 w-10 rounded-full border-2 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
                  title={`Visit Store: ${service.business.company_name}`}
                >
                  <img
                    src={getMaskedAssetUrl(service.business.logo_url)}
                    alt={service.business.company_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`relative h-16 w-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all ${
                      idx === selectedImageIdx ? "border-primary ring-2 ring-primary/20 scale-95" : "border-border/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={getMaskedAssetUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service Details */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] font-bold rounded-full px-2.5 py-0.5">
                  {service.category || "Professional Services"}
                </Badge>
                {service.is_available ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold rounded-full px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-bold rounded-full px-2.5 py-0.5">
                    Currently Booked
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                {service.name}
              </h1>

              <div className="mt-3">
                <span className="text-2xl font-black text-foreground">
                  {formatPrice()}
                </span>
              </div>
            </div>

            {/* Provider Banner */}
            {service.business && (
              <div className="p-4 rounded-3xl bg-muted/20 border border-border/30 flex items-center justify-between gap-3">
                <Link 
                  to={`/business/${service.business.id}`}
                  className="flex items-center gap-3 min-w-0 group"
                >
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border/40 shrink-0">
                    {service.business.logo_url ? (
                      <img src={getMaskedAssetUrl(service.business.logo_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      <span className="truncate">{service.business.company_name}</span>
                      {service.business.verified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 fill-primary/20" />
                      )}
                    </div>
                    {service.business.business_location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {service.business.business_location}
                      </p>
                    )}
                  </div>
                </Link>

                <Button 
                  onClick={handleStartChat} 
                  variant="outline" 
                  size="sm" 
                  className="rounded-2xl text-xs font-bold shrink-0 gap-1.5 h-9"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Book / Inquire
                </Button>
              </div>
            )}

            {/* Key Specs */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/20 border border-border/20 text-xs">
              {service.duration_estimate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Est. Duration</p>
                    <p className="font-bold text-foreground">{service.duration_estimate}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Payment Guarantee</p>
                  <p className="font-bold text-foreground">Escrow Protected</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleStartChat}
              className="w-full h-12 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Message Provider & Request Quote
            </Button>

            {/* Description */}
            {service.description && (
              <div className="space-y-1.5 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About this Service</h3>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/10 p-3.5 rounded-2xl border border-border/20">
                  {service.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
