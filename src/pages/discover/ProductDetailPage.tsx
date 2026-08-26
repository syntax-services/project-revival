import { RareBadgeIcon } from "@/components/ui/RareBadgeIcon";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProductComments } from "@/components/discover/ProductComments";
import { useProductSocial } from "@/hooks/useProductSocial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Heart, Bookmark, Share2, Store, MessageCircle, 
  ShieldCheck, CheckCircle2, Package, Tag, Layers, 
  Clock, MapPin, Loader2, Sparkles, ChevronRight, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ShareButton } from "@/components/common/ShareButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductDetailData {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  image_url: string | null;
  images: string[] | null;
  category: string | null;
  tags: string[] | null;
  in_stock: boolean;
  stock_quantity: number;
  is_rare: boolean;
  business_id: string;
  created_at: string;
  business?: {
    id: string;
    company_name: string;
    logo_url: string | null;
    verified: boolean | null;
    verification_tier: string | null;
    business_location: string | null;
    user_id: string;
  };
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [meetupLandmark, setMeetupLandmark] = useState("");
  const [meetupTime, setMeetupTime] = useState("");

  const { liked, saved, toggleLike, toggleSave } = useProductSocial(id);

  // Dynamic OpenGraph, Twitter, and Schema.org Product Structured Data
  usePageMeta({
    title: product?.name ? `${product.name} | ₦${(product.price || 0).toLocaleString()} | ${product.business?.company_name || "Campus Store"}` : "Product Details",
    description: product?.description 
      ? `${product.description.slice(0, 155)}... Available from ${product.business?.company_name || "verified merchant"} on String.`
      : `Buy ${product?.name || "this item"} for ₦${(product?.price || 0).toLocaleString()} from ${product?.business?.company_name || "a verified merchant"} on String.`,
    image: product?.image_url || product?.business?.logo_url || null,
    url: `https://www.string.com.ng/product/${id}`,
    type: "product",
    keywords: [
      product?.name || "product",
      product?.category || "campus marketplace",
      product?.business?.company_name || "merchant",
      ...(product?.tags || []),
      "String Nigeria",
      "buy on campus"
    ],
    breadcrumbs: [
      { name: "Home", url: "https://www.string.com.ng/" },
      { name: "Discover", url: "https://www.string.com.ng/customer/discover" },
      { name: product?.category || "Products", url: `https://www.string.com.ng/customer/discover?cat=${encodeURIComponent(product?.category || "all")}` },
      { name: product?.name || "Product", url: `https://www.string.com.ng/product/${id}` }
    ],
    structuredData: product ? {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": product.image_url ? [product.image_url, ...(product.images || [])] : ["https://www.string.com.ng/String-logo-dark.png"],
      "description": product.description || `Buy ${product.name} from ${product.business?.company_name || "verified merchant"} on String.`,
      "sku": product.id,
      "brand": {
        "@type": "Brand",
        "name": product.business?.company_name || "String Merchant"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://www.string.com.ng/product/${product.id}`,
        "priceCurrency": "NGN",
        "price": product.price || 0,
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": product.business?.company_name || "String Merchant"
        }
      }
    } : undefined,
  });

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            business:businesses(id, company_name, logo_url, verified, verification_tier, business_location, user_id)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching product:", error);
        }

                  if (data) {
            setProduct(data as any);
            
            // Track Click & Taste Profile (TikTok-style analytics)
            supabase.rpc('increment_product_clicks', { p_product_id: data.id }).catch(console.warn);
            
            if (user?.id) {
              // Track category preference
              if (data.category) {
                supabase.from('user_taste_profile').insert({
                  customer_id: user.id,
                  search_query: data.category,
                  weight: 2 // Higher weight for clicks vs searches
                }).catch(console.warn);
              }
              // Track tag preferences
              if (data.tags && data.tags.length > 0) {
                const tagInserts = data.tags.map((tag: string) => ({
                  customer_id: user.id,
                  search_query: tag,
                  weight: 1
                }));
                supabase.from('user_taste_profile').insert(tagInserts).catch(console.warn);
              }
            }
          }
      } catch (err) {
        console.error("Failed to load product:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  const handleGoBack = () => {
    // Preserve scroll position when returning
    navigate(-1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || "Product on String",
        text: `Check out ${product?.name} on String!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleStartChat = () => {
    if (!product?.business?.id) return;
    if (!user) {
      toast.info("Please sign in to chat with the seller and place orders.");
      navigate(`/auth?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    setIsChatModalOpen(true);
  };

  const handleSubmitChat = () => {
    if (!meetupLandmark || !meetupTime) {
      toast.error("Please select a landmark and time.");
      return;
    }
    setIsChatModalOpen(false);
    navigate(`/customer/messages?biz=${product?.business?.id}&product=${encodeURIComponent(product?.name || "")}&landmark=${encodeURIComponent(meetupLandmark)}&time=${encodeURIComponent(meetupTime)}`);
  };

  const handleDirectCheckout = () => {
    if (!product) return;
    // Pass checkout item in sessionStorage
    sessionStorage.setItem("string_direct_checkout_item", JSON.stringify({
      productId: product.id,
      name: product.name,
      price: product.price || 0,
      quantity: 1,
      businessId: product.business_id,
      imageUrl: product.image_url,
    }));
    navigate("/customer/checkout");
  };

  const galleryImages = product?.images && product.images.length > 0 
    ? product.images 
    : product?.image_url 
      ? [product.image_url] 
      : [];

  const discountPercent = product?.compare_at_price && product?.price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading product details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold">Product Not Found</h2>
          <p className="text-xs text-muted-foreground">This item may have been unlisted or removed by the seller.</p>
          <Button onClick={() => navigate(-1)} variant="secondary" className="rounded-2xl text-xs font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Discover
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
            onClick={handleGoBack} 
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
              title={product.name}
              text={`Check out ${product.name} by ${product.business?.company_name || "Campus Store"} on String!`}
              url={window.location.href}
              imageUrl={product.image_url}
              className="h-9 w-9 rounded-full border border-border/40 text-muted-foreground hover:text-foreground"
            />
          </div>
        </div>

        {/* Main Grid: Gallery & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Multi-Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-muted/30 border border-border/40 shadow-md group">
              {galleryImages.length > 0 ? (
                <img
                  src={getMaskedAssetUrl(galleryImages[selectedImageIdx])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Package className="h-10 w-10 opacity-30" />
                  <span className="text-xs">No image available</span>
                </div>
              )}

              {product.is_rare && (
                <div title="Rare Product" className="absolute top-3 left-3 bg-background/80 p-1.5 rounded-full shadow-md backdrop-blur-md border border-primary/20 flex items-center justify-center">
                  <RareBadgeIcon className="h-6 w-6 text-primary" />
                </div>
              )}

              {discountPercent && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
                  -{discountPercent}% OFF
                </div>
              )}

              {/* Co-Branded Storefront Avatar Badge at Bottom-Right of Product Image */}
              {product.business?.logo_url && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/business/${product.business?.id}`);
                  }}
                  className="absolute bottom-3.5 right-3.5 h-10 w-10 rounded-full border-2 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
                  title={`Visit Store: ${product.business.company_name}`}
                >
                  <img
                    src={getMaskedAssetUrl(product.business.logo_url)}
                    alt={product.business.company_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Thumbnails Row */}
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

          {/* Product Overview & Action Panel */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] font-bold rounded-full px-2.5 py-0.5">
                  {product.category || "General"}
                </Badge>
                {product.in_stock ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold rounded-full px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> In Stock ({product.stock_quantity || 1})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-bold rounded-full px-2.5 py-0.5">
                    Out of Stock
                  </Badge>
                )}
                {product.in_stock && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-full px-2.5 py-0.5">
                    Only {product.stock_quantity} items left!
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Pricing */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-3xl font-black text-foreground">
                  ₦{(product.price || 0).toLocaleString()}
                </span>
                {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                  <span className="text-sm font-semibold text-muted-foreground line-through">
                    ₦{product.compare_at_price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Merchant Info Banner */}
            {product.business && (
              <div className="p-4 rounded-3xl bg-muted/20 border border-border/30 flex items-center justify-between gap-3">
                <Link 
                  to={`/business/${product.business.id}`}
                  className="flex items-center gap-3 min-w-0 group"
                >
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border/40 shrink-0">
                    {product.business.logo_url ? (
                      <img src={getMaskedAssetUrl(product.business.logo_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      <span className="truncate">{product.business.company_name}</span>
                      {product.business.verified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 fill-primary/20" />
                      )}
                    </div>
                    {product.business.business_location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {product.business.business_location}
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
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleStartChat}
                disabled={!product.in_stock || (product.stock_quantity !== undefined && product.stock_quantity <= 0)}
                className="w-full h-12 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Chat to Buy
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Connect directly with the seller to negotiate and arrange delivery.
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-1.5 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</h3>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/10 p-3.5 rounded-2xl border border-border/20">
                  {product.description}
                </p>
              </div>
            )}

            {/* Search Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3 text-primary" /> Keywords & Nicknames
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-0.5 rounded-full bg-muted/40 border border-border/30 text-[11px] font-medium text-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Realtime Social Comments */}
        <div className="pt-8 border-t border-border/20">
          <ProductComments productId={product.id} />
        </div>
      </div>

      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/40 rounded-[28px] shadow-2xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat to Buy
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select your preferred meetup details to quickly arrange a purchase with the merchant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Meetup Landmark</label>
              <Select value={meetupLandmark} onValueChange={setMeetupLandmark}>
                <SelectTrigger className="w-full rounded-2xl h-12 bg-muted/20 border-border/30 font-medium">
                  <SelectValue placeholder="Select landmark (e.g., PS, Fine Arts)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/30 shadow-xl">
                  <SelectItem value="PS">PS</SelectItem>
                  <SelectItem value="Fine Arts">Fine Arts</SelectItem>
                  <SelectItem value="Fidelma Hostel">Fidelma Hostel</SelectItem>
                  <SelectItem value="Motion Ground">Motion Ground</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Meetup Time</label>
              <Select value={meetupTime} onValueChange={setMeetupTime}>
                <SelectTrigger className="w-full rounded-2xl h-12 bg-muted/20 border-border/30 font-medium">
                  <SelectValue placeholder="Select when to meet" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/30 shadow-xl">
                  <SelectItem value="In 10 mins">In 10 mins</SelectItem>
                  <SelectItem value="In 1 hr">In 1 hr</SelectItem>
                  <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsChatModalOpen(false)}
              className="rounded-2xl h-11 text-xs font-bold w-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitChat}
              disabled={!meetupLandmark || !meetupTime}
              className="rounded-2xl h-11 text-xs font-bold w-full gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              Send Message <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}



