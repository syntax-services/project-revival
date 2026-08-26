import React, { useEffect, useState, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumHome } from "@/components/ui/custom-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, UserPlus, Loader2, Store, MessageSquare, MessageCircle, Share2, ChevronLeft, ChevronRight, Check, ShoppingCart } from "lucide-react";
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
 const { data: directProducts } = await supabase
 .from("products")
 .select(`
 id, name, business_id, price, image_url, images, description, category, tags, is_orderable, stock_quantity,
 businesses (id, company_name, logo_url, location_verified, verified, is_active, verification_tier, is_open_now)
 `)
 .eq("in_stock", true)
 .order("created_at", { ascending: false });

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
 <DashboardLayout>
 <div className="min-h-screen bg-background pb-20 px-4 md:px-6 animate-fade-in max-w-7xl mx-auto">
 {portalTarget && createPortal(
 <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 md:px-6">
 <div className="relative w-full max-w-[360px]">
 <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
 <Input
 placeholder="Search stores, products..."
 className="h-8 rounded-full border-border/10 bg-muted/25 pl-9 text-xs font-medium shadow-none transition-all duration-300 hover:bg-muted/40 focus-visible:bg-card focus-visible:ring-primary/10"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
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
 "h-7 rounded-full border px-3 text-[11px] font-bold transition-colors shrink-0",
 itemTypeFilter === value ? "border-primary bg-primary text-primary-foreground" : "border-border/20 bg-muted/20 text-muted-foreground hover:text-foreground"
 )}
 >
 {label}
 </button>
 ))}
 <button
    type="button"
    onClick={() => setOpenNowFilter(!openNowFilter)}
    className={cn(
      "h-7 rounded-full border px-3 text-[11px] font-bold transition-colors shrink-0",
      openNowFilter ? "border-green-500 bg-green-500 text-white" : "border-border/20 bg-muted/20 text-muted-foreground hover:text-foreground"
    )}
  >
    Open Now
  </button>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="h-7 rounded-full border border-border/20 bg-muted/20 px-3 text-[11px] font-bold text-foreground outline-none shrink-0"
 >
 <option value="all">All Categories</option>
 {categoryOptions.map((category) => (
 <option key={category} value={category}>{category}</option>
 ))}
 </select>
 <select
 value={priceFilter}
 onChange={(e) => setPriceFilter(e.target.value)}
 className="h-7 rounded-full border border-border/20 bg-muted/20 px-3 text-[11px] font-bold text-foreground outline-none shrink-0"
 >
 <option value="all">Any Price</option>
 <option value="under5k">Under ₦5k</option>
 <option value="5to20k">₦5k - ₦20k</option>
 <option value="20kplus">Above ₦20k</option>
 </select>
 </div>
 </div>,
 document.getElementById("search-bar-portal")!
 )}
 <div className="h-4" />

 {/* Masonry Feed */}
 {loading ? (
 <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
 ) : filteredItems.length === 0 ? (
 <div className="text-center py-20 text-muted-foreground">
 <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
 <p className="font-semibold text-lg">No items found</p>
 <p className="text-sm">Try searching for something else, or businesses might be hidden right now.</p>
 </div>
 ) : (
 <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-10">
 {filteredItems.map(item => (
 <div 
 key={item?.id || Math.random().toString()} 
 className="break-inside-avoid relative group bg-card rounded-[28px] overflow-hidden border border-border/15 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
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
 <div className="w-full h-full flex items-center justify-center bg-accent/20 text-muted-foreground text-xs font-semibold">
 No Image
 </div>
 )}

 {/* Co-Branded Storefront Avatar Badge at Bottom-Right of Image */}
 {item?.business?.logo_url && (
 <div
 onClick={(e) => {
 e.stopPropagation();
 if (item?.business?.id) navigate(`/business/${item.business.id}`);
 }}
 className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-full border-2 border-white dark:border-slate-900 shadow-md overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
 title={`Store: ${item.business.company_name}`}
 >
 <img
 src={item.business.logo_url}
 alt={item.business.company_name}
 className="w-full h-full object-cover"
 />
 </div>
 )}
 </div>

 {/* Overlays & Actions */}
 <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
 <ShareButton
 title={item.name}
 text={`Check out ${item.name} by ${item.business.company_name} on String!`}
 url={`${window.location.origin}/business/${item.business.id}?${item.isService ? "service" : "product"}=${item.id}`}
 imageUrl={item.image_url}
 className="h-8 w-8 bg-background/85 backdrop-blur-sm hover:bg-background shadow-sm border border-border/10"
 />

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-background/85 backdrop-blur-sm hover:bg-background shadow-sm border border-border/10" onClick={e => e.stopPropagation()}>
 <MoreHorizontal className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="rounded-xl">
 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (item?.business?.id) navigate(`/business/${item.business.id}`) }}>
 <Store className="mr-2 h-4 w-4" /> Visit Store
 </DropdownMenuItem>
 <DropdownMenuItem onClick={(e) => handleFollowStore(item?.business?.id, e)}>
 {followedBusinessIds.includes(item?.business?.id || "") ? (
 <><Check className="mr-2 h-4 w-4 text-emerald-500" /> Following</>
 ) : (
 <><UserPlus className="mr-2 h-4 w-4" /> Follow Store</>
 )}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Info Bar */}
 <div className="p-4 space-y-1 bg-card">
 <div className="flex justify-between items-start gap-2">
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-xs text-foreground/80 leading-tight truncate">{item?.name || "Unnamed"}</h3>
 <p className="font-extrabold text-sm text-primary mt-0.5">
 {typeof item?.price === "number" ? `₦${item.price.toLocaleString()}` : (item?.price || "Contact")}
 </p>
 </div>
 {/* Contact Business Owner Button */}
 {item.isOrderable && (
 <Button 
 variant="ghost" 
 size="icon" 
 className="h-8 w-8 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
 onClick={(e) => handleContactBusiness(item, e)}
 >
 <MessageSquare className="h-5 w-5" />
 </Button>
 )}
 </div>
 
 {/* Store Name */}
 <div className="flex items-center gap-1.5 opacity-80">
 <div className="w-4 h-4 rounded-full bg-muted overflow-hidden shrink-0">
 {item?.business?.logo_url && <img src={item.business.logo_url} alt="logo" className="w-full h-full object-cover" />}
 </div>
 <p className="text-[10px] font-semibold text-muted-foreground truncate hover:underline" onClick={(e) => { e.stopPropagation(); if (item?.business?.id) navigate(`/business/${item.business.id}`) }}>
 {item?.business?.company_name || "Unknown Store"}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Item Details Modal */}
 <Dialog open={!!selectedItem} onOpenChange={(open) => {
 if (!open) {
 setSelectedItem(null);
 setImageIndex(0);
 }
 }}>
 <DialogContent className="max-w-md w-[95vw] rounded-[32px] p-0 overflow-hidden bg-background border-border/50 gap-0">
 {selectedItem && (
 <div className="flex flex-col h-[85vh]">
 <div className="relative w-full aspect-square bg-muted shrink-0 group">
 {selectedItem.images && selectedItem.images.length > 0 ? (
 <>
 <img src={selectedItem.images[imageIndex]} alt={selectedItem.name || "Item image"} className="w-full h-full object-cover" />
 {selectedItem.images.length > 1 && (
 <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button 
 variant="secondary" 
 size="icon" 
 className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md"
 onClick={(e) => { e.stopPropagation(); setImageIndex(prev => prev === 0 ? (selectedItem.images?.length || 1) - 1 : prev - 1) }}
 >
 <ChevronLeft className="h-4 w-4" />
 </Button>
 <Button 
 variant="secondary" 
 size="icon" 
 className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md"
 onClick={(e) => { e.stopPropagation(); setImageIndex(prev => prev === (selectedItem.images?.length || 1) - 1 ? 0 : prev + 1) }}
 >
 <ChevronRight className="h-4 w-4" />
 </Button>
 </div>
 )}
 {selectedItem.images.length > 1 && (
 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
 {selectedItem.images.map((_, idx) => (
 <div key={idx} className={cn("h-1.5 rounded-full transition-all duration-300", idx === imageIndex ? "w-4 bg-primary" : "w-1.5 bg-white/50")} />
 ))}
 </div>
 )}
 </>
 ) : selectedItem.image_url ? (
 <img src={selectedItem.image_url} alt={selectedItem.name || "Item image"} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-secondary">
 <Store className="h-12 w-12 text-muted-foreground/30" />
 </div>
 )}
 
 {/* Top Overlay Actions */}
 <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm cursor-pointer" onClick={() => { if (selectedItem?.business?.id) navigate(`/business/${selectedItem.business.id}`) }}>
 {selectedItem?.business?.logo_url && (
 <img src={selectedItem.business.logo_url} className="w-5 h-5 rounded-full object-cover" />
 )}
 <span className="text-xs font-bold">{selectedItem?.business?.company_name || "Unknown Store"}</span>
 {selectedItem?.business?.verified && <span className="text-[10px] bg-primary text-white w-3.5 h-3.5 rounded-full flex items-center justify-center"></span>}
 </div>

 <div className="absolute top-4 right-4 flex gap-2">
 <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-md" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}>
 <Share2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 
 <ScrollArea className="flex-1 p-5">
 <div className="space-y-4">
 <div className="flex justify-between items-start gap-4">
 <div>
 <h2 className="text-2xl font-black leading-tight">{selectedItem?.name || "Unnamed"}</h2>
 <p className="text-xl font-bold text-primary mt-1">
 {typeof selectedItem?.price === "number" ? `₦${selectedItem.price.toLocaleString()}` : (selectedItem?.price || "Contact")}
 </p>
 </div>
 <Button 
 variant={followedBusinessIds.includes(selectedItem?.business?.id || "") ? "secondary" : "outline"} 
 size="sm" 
 className="rounded-full px-4 h-9 font-bold flex shrink-0" 
 onClick={() => handleFollowStore(selectedItem?.business?.id)}
 >
 {followedBusinessIds.includes(selectedItem?.business?.id || "") ? (
 <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Following</>
 ) : (
 <><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Follow</>
 )}
 </Button>
 </div>

 {/* Specs & Badges */}
 {(selectedItem?.category || (selectedItem?.tags && selectedItem.tags.length > 0)) && (
 <div className="flex flex-wrap gap-2 pt-1 pb-2 border-b border-border/40">
 {selectedItem.category && (
 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
 {selectedItem.category}
 </Badge>
 )}
 {selectedItem.tags?.map(tag => (
 <Badge key={tag} variant="outline" className="text-muted-foreground bg-muted/50">
 {tag}
 </Badge>
 ))}
 </div>
 )}

 <div className="prose prose-sm dark:prose-invert">
 <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
 {selectedItem?.description || "No description provided for this item. Contact the store for more information."}
 </p>
 </div>

 {/* Comments Section */}
 <div className="pt-4 border-t border-border/40">
 <ProductComments productId={selectedItem.id} />
 </div>
 </div>
 </ScrollArea>

 <div className="p-4 border-t border-border/40 bg-card shrink-0 flex gap-3">
 {selectedItem.isOrderable ? (
 <Button 
 className="flex-1 h-12 rounded-full font-bold text-base shadow-premium flex items-center justify-center gap-2"
 onClick={() => { handleContactBusiness(selectedItem); setSelectedItem(null); }}
 >
 <MessageSquare className="h-5 w-5" />
 Contact Business Owner
 </Button>
 ) : (
 <Button 
 variant="outline"
 className="flex-1 h-12 rounded-full font-bold text-base border-primary/20 text-primary hover:bg-primary/5"
 onClick={() => { if (selectedItem?.business?.id) { navigate(`/business/${selectedItem.business.id}`); setSelectedItem(null); } }}
 >
 Inquire in Store
 </Button>
 )}
 <Button variant="secondary" className="h-12 w-12 rounded-full p-0" onClick={() => { if (selectedItem?.business?.id) navigate(`/business/${selectedItem.business.id}`) }}>
 <Store className="h-5 w-5" />
 </Button>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </DashboardLayout>
 );
}



