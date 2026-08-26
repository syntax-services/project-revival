import React, { useEffect, useState, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumHome } from "@/components/ui/custom-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, UserPlus, Loader2, Store, MessageSquare, MessageCircle, Share2, ChevronLeft, ChevronRight, Check, ShoppingCart, ArrowLeft, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProductComments } from "@/components/discover/ProductComments";
import { ShareButton } from "@/components/common/ShareButton";
import { cn } from "@/lib/utils";

interface Business {
 id: string;
 company_name: string;
 logo_url: string | null;
 verified: boolean | null;
 verification_tier?: string;
 is_open_now?: boolean;
}

interface Product {
 id: string;
 name: string;
 business_id: string;
 price?: number | null;
 image_url?: string | null;
 description?: string | null;
 stock_quantity?: number | null;
}

interface Service {
 id: string;
 name: string;
 business_id: string;
 images?: string[] | null;
 price_min?: number | null;
 price_max?: number | null;
 description?: string | null;
}

interface DiscoverItem {
 id: string;
 name: string;
 price: number | string;
 image_url: string | null;
 images?: string[] | null;
 description: string | null;
 category?: string | null;
 tags?: string[] | null;
 business: Business;
 isService: boolean;
 aspectRatio: string;
 isOrderable?: boolean;
}

export default function CustomerDiscover() {
  usePageMeta({
    title: "Discover Goods, Services & Campus Stores",
    description: "Search and filter thousands of campus products, textbooks, electronics, fashion, and skilled student services.",
    keywords: ["search campus marketplace","find student stores","campus services","buy secondhand textbooks"],
    });

 const { user } = useAuth();
 const { toast } = useToast();
 const navigate = useNavigate();
 
 const [businesses, setBusinesses] = useState<any[]>([]);
 const [items, setItems] = useState<DiscoverItem[]>([]);
 const [search, setSearch] = useState(() => sessionStorage.getItem("string_discover_search") || "");
 const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "products" | "services">(() => (sessionStorage.getItem("string_discover_type") as any) || "all");
 const [categoryFilter, setCategoryFilter] = useState(() => sessionStorage.getItem("string_discover_category") || "all");
 const [priceFilter, setPriceFilter] = useState(() => sessionStorage.getItem("string_discover_price") || "all");
 const [openNowFilter, setOpenNowFilter] = useState(false);
 const [loading, setLoading] = useState(true);
 const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
 const [isScrolled, setIsScrolled] = useState(false);

 useEffect(() => {
 sessionStorage.setItem("string_discover_search", search);
 }, [search]);

 useEffect(() => {
 sessionStorage.setItem("string_discover_type", itemTypeFilter);
 }, [itemTypeFilter]);

 useEffect(() => {
 sessionStorage.setItem("string_discover_category", categoryFilter);
 }, [categoryFilter]);

 useEffect(() => {
 sessionStorage.setItem("string_discover_price", priceFilter);
 }, [priceFilter]);

 useEffect(() => {
 const handleScroll = () => setIsScrolled(window.scrollY > 20);
 window.addEventListener("scroll", handleScroll);
 return () => window.removeEventListener("scroll", handleScroll);
 }, []);
 const [imageIndex, setImageIndex] = useState(0);
 const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
 const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

 useEffect(() => {
 setPortalTarget(document.getElementById("search-bar-portal"));
 }, []);

 useEffect(() => {
 const fetchData = async () => {
 try {
 const flatItems: DiscoverItem[] = [];

    // 1. Fetch direct products with business information
    const { data: directProducts, error: productsError } = await supabase
      .from("products")
      .select(`
        id, name, business_id, price, image_url, images, description, category, tags, is_orderable, stock_quantity,
        businesses (id, company_name, logo_url, location_verified, verified, is_active, verification_tier, is_open_now)
      `)
      .eq("in_stock", true)
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Products fetch error:", productsError);
      toast({ variant: "destructive", title: "Error", description: `Error: ${productsError.message || "Failed to load products"}` });
    }

 if (directProducts) {
 directProducts.forEach((p: any) => {
 const biz = p.businesses;
 if (biz && biz.is_active !== false && (p.stock_quantity === undefined || p.stock_quantity === null || p.stock_quantity > 0)) {
 flatItems.push({
 id: p.id,
 name: p.name || "Product",
 price: p.price || 0,
 image_url: p.image_url || (Array.isArray(p.images) && p.images[0]) || null,
 images: p.images || (p.image_url ? [p.image_url] : []),
 description: p.description || null,
 category: p.category || "Other",
 tags: p.tags || [],
 business: {
 id: biz.id,
 company_name: biz.company_name || "Merchant Shop",
 logo_url: biz.logo_url || null,
 verified: !!(biz.location_verified || biz.verified),
 verification_tier: biz.verification_tier || 'none',
 is_open_now: biz.is_open_now,
 },
 isService: false,
 aspectRatio: Math.random() > 0.5 ? "aspect-[3/4]" : "aspect-square",
 isOrderable: p.is_orderable ?? true,
 });
 }
 });
 }

 // 2. Fetch direct services with business information
 const { data: directServices } = await supabase
 .from("services")
 .select(`
 id, name, business_id, images, price_min, price_max, description, category, is_orderable,
 businesses (id, company_name, logo_url, location_verified, verified, is_active, verification_tier, is_open_now)
 `)
 .order("created_at", { ascending: false });

 if (directServices) {
 directServices.forEach((s: any) => {
 const biz = s.businesses;
 if (biz && biz.is_active !== false) {
 flatItems.push({
 id: s.id,
 name: s.name || "Service",
 price: s.price_min ? `₦${Number(s.price_min).toLocaleString()}` : "Custom Quote",
 image_url: (Array.isArray(s.images) && s.images[0]) || null,
 images: s.images || [],
 description: s.description || null,
 category: s.category || "Other Services",
 tags: [],
 business: {
 id: biz.id,
 company_name: biz.company_name || "Service Provider",
 logo_url: biz.logo_url || null,
 verified: !!(biz.location_verified || biz.verified),
 verification_tier: biz.verification_tier || 'none',
 is_open_now: biz.is_open_now,
 },
 isService: true,
 aspectRatio: Math.random() > 0.5 ? "aspect-[4/5]" : "aspect-square",
 isOrderable: s.is_orderable || false,
 });
 }
 });
 }

 // Prioritize boosted/premium businesses by sorting them to the front
 flatItems.sort((a, b) => {
 const aIsBoosted = a.business?.verification_tier === 'premium' ? 1 : 0;
 const bIsBoosted = b.business?.verification_tier === 'premium' ? 1 : 0;
 return bIsBoosted - aIsBoosted;
 });

 if (user) {
 const { data: customer } = await supabase
 .from('customers')
 .select('id')
 .eq('user_id', user.id)
 .maybeSingle();
 
 if (customer) {
 const { data: saved } = await supabase
 .from('saved_businesses')
 .select('business_id')
 .eq('customer_id', user.id);
 
 if (saved) {
 setFollowedBusinessIds(saved.map(s => s.business_id));
 }
 }
 }

 setItems(flatItems);
 } catch (err) {
 console.error("Error fetching discover items:", err);
 } finally {
 setLoading(false);
 }
 };
 
 fetchData();
 }, []);

 const categoryOptions = useMemo(() => {
 return Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort();
 }, [items]);

 const getPriceNumber = (item: DiscoverItem) => {
 return typeof item.price === "number" ? item.price : null;
 };

 const filteredItems = useMemo(() => {
 const q = search.toLowerCase();
 return items.filter(item => {
 const matchesSearch = !search.trim() ||
 (item?.name || "").toLowerCase().includes(q) ||
 (item?.business?.company_name || "").toLowerCase().includes(q) ||
 (item?.category || "").toLowerCase().includes(q) ||
 (item?.tags || []).some((tag) => tag && typeof tag === "string" && tag.toLowerCase().includes(q));
 const matchesType =
 itemTypeFilter === "all" ||
 (itemTypeFilter === "products" && !item.isService) ||
 (itemTypeFilter === "services" && item.isService);
 const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
 const price = getPriceNumber(item);
 const matchesPrice =
 priceFilter === "all" ||
 (priceFilter === "under5k" && price !== null && price < 5000) ||
 (priceFilter === "5to20k" && price !== null && price >= 5000 && price <= 20000) ||
 (priceFilter === "20kplus" && price !== null && price > 20000);
 const matchesOpenNow = !openNowFilter || (openNowFilter && item.business.is_open_now);

 return matchesSearch && matchesType && matchesCategory && matchesPrice && matchesOpenNow;
 });
 }, [items, search, itemTypeFilter, categoryFilter, priceFilter, openNowFilter]);

 const handleContactBusiness = async (item: DiscoverItem, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!item?.business?.id || !user) {
 toast({ variant: "destructive", title: "Authentication required", description: "Please log in to contact the business owner" });
 return;
 }
 
 try {
 const { data: customer } = await supabase
 .from('customers')
 .select('id')
 .eq('user_id', user.id)
 .maybeSingle();
 
 if (!customer) {
 toast({ variant: "destructive", title: "Profile incomplete", description: "Please complete your shopper profile to message merchants." });
 return;
 }
 
 const { data: existingConv } = await supabase
 .from("conversations")
 .select("id")
 .eq("customer_id", user.id)
 .eq("business_id", item.business.id)
 .maybeSingle();

 if (!existingConv) {
 await supabase.from("conversations").insert({
 customer_id: user.id,
 business_id: item.business.id
 });
 }

 navigate("/customer/messages");
 } catch (err) {
 console.error(err);
 toast({ variant: "destructive", title: "Error", description: "Failed to start chat with business owner." });
 }
 };

 const handleFollowStore = async (businessId: string | undefined, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!businessId) return;
 
 if (!user) {
 toast({ title: "Please log in to follow stores" });
 return;
 }
 
 const isAlreadyFollowing = followedBusinessIds.includes(businessId);
 
 // Optimistic UI toggle
 if (isAlreadyFollowing) {
 setFollowedBusinessIds(prev => prev.filter(id => id !== businessId));
 } else {
 setFollowedBusinessIds(prev => [...prev, businessId]);
 }
 
 try {
 const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
 if (customer) {
 if (isAlreadyFollowing) {
 await supabase.from("saved_businesses").delete().eq("customer_id", user.id).eq("business_id", businessId);
 toast({ title: "Store unfollowed" });
 } else {
 await supabase.from("saved_businesses").insert({
 customer_id: user.id,
 business_id: businessId
 });
 toast({ title: "Store followed! " });
 }
 }
 } catch (err) {
 // Revert state on error
 if (isAlreadyFollowing) {
 setFollowedBusinessIds(prev => [...prev, businessId]);
 } else {
 setFollowedBusinessIds(prev => prev.filter(id => id !== businessId));
 }
 toast({ variant: "destructive", title: "Failed to update follow status" });
 }
 };

 return (
    <DashboardLayout hideHeader={true}>
      <div className="min-h-screen bg-background pb-20 animate-fade-in max-w-7xl mx-auto">
        
        {/* Sleek Mobile-First Sticky Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/5 px-4 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 -ml-2 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search products, brands and categories..."
                className="h-11 rounded-full border-border/10 bg-muted/30 pl-10 pr-12 text-sm font-medium shadow-none transition-all duration-300 focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="px-4 pb-6 outline-none">
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="text-xl font-semibold">Filter</DrawerTitle>
                  </DrawerHeader>
                  <div className="flex flex-col gap-6 pt-2">
                    {/* Category Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Category</h4>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full h-11 rounded-xl border border-border/20 bg-muted/10 px-4 text-sm font-medium text-foreground outline-none"
                      >
                        <option value="all">All Categories</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Price Range</h4>
                      <select
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className="w-full h-11 rounded-xl border border-border/20 bg-muted/10 px-4 text-sm font-medium text-foreground outline-none"
                      >
                        <option value="all">Any Price</option>
                        <option value="under5k">Under ₦5,000</option>
                        <option value="5to20k">₦5,000 - ₦20,000</option>
                        <option value="20kplus">Above ₦20,000</option>
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Listing Type</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["all", "All"],
                          ["products", "Products"],
                          ["services", "Services"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setItemTypeFilter(value as "all" | "products" | "services")}
                            className={cn(
                              "h-9 rounded-full border px-4 text-xs font-semibold transition-colors shrink-0",
                              itemTypeFilter === value ? "border-primary bg-primary text-primary-foreground" : "border-border/20 bg-muted/20 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specialized Filters */}
                    <div className="space-y-3 pt-2 border-t border-border/10">
                       <label className="flex items-center gap-3 py-2 cursor-pointer">
                         <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", openNowFilter ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                            {openNowFilter && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                         <input type="checkbox" className="hidden" checked={openNowFilter} onChange={() => setOpenNowFilter(!openNowFilter)} />
                         <span className="text-sm font-medium">Open Now (Instant)</span>
                       </label>
                    </div>

                  </div>
                  <DrawerFooter className="px-0 pt-6 flex-row gap-3">
                    <DrawerClose asChild>
                       <Button variant="outline" className="flex-1 rounded-xl h-12 font-semibold">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
          
          {/* Trending Searches Pill row */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
             <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase shrink-0 mr-1">Trending Searches</span>
             {["gowns for ladies", "textbooks", "food", "kitchen utensils", "earbuds"].map(t => (
               <button key={t} onClick={() => setSearch(t)} className="h-7 px-3 bg-muted/40 hover:bg-muted text-xs font-medium rounded-full shrink-0 text-muted-foreground hover:text-foreground transition-colors border border-border/5">
                 {t}
               </button>
             ))}
          </div>
        </div>

        {/* Masonry Feed */}
        <div className="px-4 md:px-6 pt-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-semibold text-lg">No items found</p>
              <p className="text-sm">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-10">
              {filteredItems.map(item => (
                <div 
                  key={item?.id || Math.random().toString()} 
                  className="break-inside-avoid relative group bg-card rounded-[24px] overflow-hidden border border-border/15 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("string_discover_scroll_y", window.scrollY.toString());
                    } catch {}
                    if (item.isService) {
                      navigate(`/service/${item.id}`);
                    } else {
                      navigate(`/product/${item.id}`);
                    }
                  }}
                >
                  {/* Image Container */}
                  <div className={cn("relative w-full bg-muted overflow-hidden", item?.aspectRatio || "aspect-square")}>
                    {item?.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item?.name || "Product image"} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/20 text-muted-foreground text-xs font-medium">
                        No Image
                      </div>
                    )}

                    {/* Merchant Avatar Badge */}
                    {item?.business?.logo_url && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item?.business?.id) navigate(`/business/${item.business.id}`);
                        }}
                        className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-full border-2 border-white dark:border-slate-900 shadow-md overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
                      >
                        <img
                          src={item.business.logo_url}
                          alt={item.business.company_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h3>
                    <div className="flex items-end justify-between mt-1">
                      <p className="font-semibold text-[15px]">{item.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
