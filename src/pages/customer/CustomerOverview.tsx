import { useState, useEffect, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer, useCustomerStats } from "@/hooks/useCustomer";
import { useNavigate } from "react-router-dom";
import { 
 Heart, Bookmark, MessageCircle, MoreHorizontal, 
 ChevronDown, Check, Loader2, Sparkles, Share2, 
 ExternalLink, ShoppingBag, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { ShareButton } from "@/components/common/ShareButton";

interface SocialFeedPost {
 id: string;
 name: string;
 description: string | null;
 price: number | null;
 image_url: string;
 category: string;
 likes: string;
 likeCount: number;
 comments: string;
 commentCount: number;
 bookmarks: string;
 bookmarkCount: number;
 is_featured?: boolean;
 is_rare?: boolean;
 aspectRatio: string;
 isService?: boolean;
 business: {
 id: string;
 company_name: string;
 handle: string;
 logo_url: string;
 verified?: boolean;
 };
}

export default function CustomerOverview() {
  usePageMeta({
    title: "Campus Discovery Feed & Trending Goods",
    description: "Explore trending campus items, latest merchant drops, and student community posts tailored for you.",
    keywords: ["campus feed","trending student items","campus fashion","buy electronics on campus"],
    });

 const { user, profile, isAdmin } = useAuth();
 const navigate = useNavigate();
 const { data: customer } = useCustomer();
 const { data: stats } = useCustomerStats(customer?.id);

 const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
 const [feedPosts, setFeedPosts] = useState<SocialFeedPost[]>([]);
 const [followedBizIds, setFollowedBizIds] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);
 const [forYouDropdownOpen, setForYouDropdownOpen] = useState(false);

 // Private likes & bookmarks
 const [likedIds, setLikedIds] = useState<string[]>(() => {
 try {
 return JSON.parse(localStorage.getItem("string_user_liked_items") || "[]");
 } catch {
 return [];
 }
 });

 const [savedIds, setSavedIds] = useState<string[]>(() => {
 try {
 return JSON.parse(localStorage.getItem("string_user_saved_bookmarks") || "[]");
 } catch {
 return [];
 }
 });

 // Fetch followed stores
 useEffect(() => {
 const fetchFollows = async () => {
 if (!customer?.id) return;
 try {
 const { data } = await supabase
 .from("saved_businesses")
 .select("business_id")
 .eq("customer_id", customer.id);
 if (data) {
 setFollowedBizIds(data.map((f) => f.business_id));
 }
 } catch (err) {
 console.warn("Follows fetch error:", err);
 }
 };
 fetchFollows();
 }, [customer?.id]);

 // Fetch live products & curated community showcase items
 useEffect(() => {
 const loadSocialFeed = async () => {
 setLoading(true);
 try {
 // 0. Query BOOSTED products using the intelligent matching algorithm!
 const { data: boostedData } = await supabase
   .rpc('get_intelligent_feed', { p_customer_id: customer?.id || null, p_limit: 10 });
 
 const boostedProductIds = (boostedData || []).map((p: any) => p.id);

 // 1. Query normal live active products from database
 const { data: dbProducts, error: prodErr } = await supabase
 .from("products")
 .select(`
 id,
 name,
 description,
 price,
 image_url,
 images,
 category,
 tags,
 is_rare,
 is_featured,
 created_at,
 businesses(id, company_name, logo_url, cover_image_url, verified, is_active), reviews(count)
 `)
 .eq("in_stock", true)
 .order("created_at", { ascending: false });

 if (prodErr) {
 console.warn("Error querying products:", prodErr);
 }

 // 2. Query live active services from database
 const { data: dbServices, error: srvErr } = await supabase
 .from("services")
 .select(`
 id,
 name,
 description,
 price_min,
 images,
 category,
 created_at,
 businesses(id, company_name, logo_url, cover_image_url, verified, is_active), reviews(count)
 `)
 .order("created_at", { ascending: false });

 if (srvErr) {
 console.warn("Error querying services:", srvErr);
 }
        const liveMapped: SocialFeedPost[] = [];

        // Map Boosted Products
        if (boostedData) {
          boostedData.forEach((p: any, idx: number) => {
            const cleanName = (p.company_name || "Merchant").toLowerCase().replace(/[^a-z0-9]/g, "_");
            const isUserSaved = savedIds.includes(p.id);
            const isUserLiked = likedIds.includes(p.id);
            const totalLikes = (p.likes || 0) + (isUserLiked ? 1 : 0);
            const totalBookmarks = (p.shares || 0) + (isUserSaved ? 1 : 0);

            liveMapped.push({
              id: p.id,
              name: p.name || "Product",
              description: p.description || null,
              price: p.price || 0,
              image_url: p.image_url || (Array.isArray(p.images) && p.images[0]) || null,
              category: (p.category || "CAMPUS STORE").toUpperCase(),
              likes: `${totalLikes}`,
              likeCount: totalLikes,
              comments: `${p.comments || 0}`,
              commentCount: p.comments || 0,
              bookmarks: `${totalBookmarks}`,
              bookmarkCount: totalBookmarks,
              is_featured: !!p.is_featured,
              is_rare: !!p.is_rare,
              aspectRatio: idx % 3 === 0 ? "aspect-[4/3]" : idx % 3 === 1 ? "aspect-[3/4]" : "aspect-square",
              isService: false,
              business: {
                id: p.business_id,
                company_name: p.company_name || "Merchant Shop",
                handle: `@${cleanName}`,
                logo_url: p.logo_url || null,
                verified: !!p.verified,
              }
            });
          });
        }

        // Map real products
        if (dbProducts) {
          dbProducts.forEach((p: any, idx: number) => {
            if (boostedProductIds.includes(p.id)) return; // Skip boosted products here to prevent duplicates
            
            const biz = p.businesses;
            if (!biz || biz.is_active === false) return;
            const cleanName = (biz.company_name || "Merchant").toLowerCase().replace(/[^a-z0-9]/g, "_");
            const isUserSaved = savedIds.includes(p.id);
            const isUserLiked = likedIds.includes(p.id);
            const baseLikes = Math.max(1, (idx * 3) + 2);
            const baseBookmarks = Math.max(0, idx % 3);
            const totalLikes = baseLikes + (isUserLiked ? 1 : 0);
            const totalBookmarks = baseBookmarks + (isUserSaved ? 1 : 0);

            liveMapped.push({
              id: p.id,
              name: p.name || "Product",
              description: p.description || null,
              price: p.price || 0,
              image_url: p.image_url || (Array.isArray(p.images) && p.images[0]) || null,
              category: (p.category || "CAMPUS STORE").toUpperCase(),
              likes: `${totalLikes}`,
              likeCount: totalLikes,
              comments: `${p.reviews?.[0]?.count || 0}`,
              commentCount: p.reviews?.[0]?.count || 0,
              bookmarks: `${totalBookmarks}`,
              bookmarkCount: totalBookmarks,
              is_featured: !!p.is_featured,
              is_rare: !!p.is_rare,
              aspectRatio: idx % 3 === 0 ? "aspect-[4/3]" : idx % 3 === 1 ? "aspect-[3/4]" : "aspect-square",
              isService: false,
              business: {
                id: biz.id,
                company_name: biz.company_name || "Merchant Shop",
                handle: `@${cleanName}`,
                logo_url: biz.logo_url || biz.cover_image_url || null,
                verified: !!biz.verified,
              }
            });
          });
        }

        // Map real services
        if (dbServices) {
          dbServices.forEach((s: any, idx: number) => {
            const biz = s.businesses;
            if (!biz || biz.is_active === false) return;
            const cleanName = (biz.company_name || "Service").toLowerCase().replace(/[^a-z0-9]/g, "_");
            const isUserSaved = savedIds.includes(s.id);
            const isUserLiked = likedIds.includes(s.id);
            const baseLikes = Math.max(1, (idx * 2) + 1);
            const baseBookmarks = Math.max(0, idx % 2);
            const totalLikes = baseLikes + (isUserLiked ? 1 : 0);
            const totalBookmarks = baseBookmarks + (isUserSaved ? 1 : 0);

            liveMapped.push({
              id: s.id,
              name: s.name || "Service",
              description: s.description || null,
              price: s.price_min || 0,
              image_url: (Array.isArray(s.images) && s.images[0]) || null,
              category: (s.category || "SERVICES").toUpperCase(),
              likes: `${totalLikes}`,
              likeCount: totalLikes,
              comments: `${p.reviews?.[0]?.count || 0}`,
              commentCount: p.reviews?.[0]?.count || 0,
              bookmarks: `${totalBookmarks}`,
              bookmarkCount: totalBookmarks,
              is_featured: false,
              is_rare: false,
              aspectRatio: idx % 2 === 0 ? "aspect-[4/3]" : "aspect-[3/4]",
              isService: true,
              business: {
                id: biz.id,
                company_name: biz.company_name || "Service Provider",
                handle: `@${cleanName}`,
                logo_url: biz.logo_url || biz.cover_image_url || null,
                verified: !!biz.verified,
              }
            });
          });
        }

 setFeedPosts(liveMapped);
 } catch (err) {
 console.error("Failed to load live feed from database:", err);
 } finally {
 setLoading(false);
 }
 };

 loadSocialFeed();
 }, []);

 // Follow / Unfollow Store handler
 const handleFollowToggle = async (bizId: string, bizName: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!customer?.id) {
 toast.error("Please sign in to follow stores.");
 return;
 }

 const isFollowing = followedBizIds.includes(bizId);
 try {
 if (isFollowing) {
 await supabase
 .from("saved_businesses")
 .delete()
 .eq("customer_id", customer.id)
 .eq("business_id", bizId);
 setFollowedBizIds(prev => prev.filter(id => id !== bizId));
 toast.success(`Unfollowed ${bizName}`);
 } else {
 await supabase
 .from("saved_businesses")
 .insert({
 customer_id: customer.id,
 business_id: bizId,
 });
 setFollowedBizIds(prev => [...prev, bizId]);
 toast.success(`Following ${bizName}! New goods will appear in your Following tab.`);
 }
 } catch {
 // Local optimistic toggle fallback
 setFollowedBizIds(prev => isFollowing ? prev.filter(id => id !== bizId) : [...prev, bizId]);
 toast.success(isFollowing ? `Unfollowed ${bizName}` : `Following ${bizName}!`);
 }
 };

  // Like Toggle handler
  const handleLike = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyLiked = likedIds.includes(postId);

    setLikedIds(prev => {
      const updated = isCurrentlyLiked ? prev.filter(id => id !== postId) : [...prev, postId];
      localStorage.setItem("string_user_liked_items", JSON.stringify(updated));
      toast.success(isCurrentlyLiked ? "Removed from liked items" : "Added to your liked items");
      return updated;
    });

    setFeedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const currentCount = p.likeCount !== undefined ? p.likeCount : (parseInt(p.likes || "0", 10) || 0);
        const newCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
        return {
          ...p,
          likeCount: newCount,
          likes: `${newCount}`
        };
      }
      return p;
    }));
  };

  // Bookmark Toggle handler
  const handleBookmark = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlySaved = savedIds.includes(postId);

    setSavedIds(prev => {
      const updated = isCurrentlySaved ? prev.filter(id => id !== postId) : [...prev, postId];
      localStorage.setItem("string_user_saved_bookmarks", JSON.stringify(updated));
      toast.success(isCurrentlySaved ? "Removed from saved" : "Saved to your bookmarks");
      return updated;
    });

    setFeedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const currentCount = p.bookmarkCount !== undefined ? p.bookmarkCount : (parseInt(p.bookmarks || "0", 10) || 0);
        const newCount = isCurrentlySaved ? Math.max(0, currentCount - 1) : currentCount + 1;
        return {
          ...p,
          bookmarkCount: newCount,
          bookmarks: `${newCount}`
        };
      }
      return p;
    }));
  };

 const handlePostClick = (post: SocialFeedPost) => {
 try {
 sessionStorage.setItem("string_discover_scroll_y", window.scrollY.toString());
 } catch {}

 if (post.id.startsWith("curated-")) {
 navigate("/customer/discover");
 } else {
 navigate(`/product/${post.id}`);
 }
 };

 // Filter posts based on For You vs Following
 const displayedPosts = useMemo(() => {
 if (activeTab === "following") {
 return feedPosts.filter(p => followedBizIds.includes(p.business.id));
 }
 return feedPosts;
 }, [feedPosts, activeTab, followedBizIds]);

 const heroPost = displayedPosts[0];
 const gridPosts = displayedPosts.slice(1);

 return (
 <DashboardLayout>
 <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-1 text-left">
 
 {/* Top Header Switcher: For you ⌵ | Following (Matching User Screenshot 1) */}
 <div className="flex items-center justify-center gap-8 pb-3 border-b border-border/10">
 <div className="relative">
 <button
 type="button"
 onClick={() => {
 setActiveTab("for-you");
 setForYouDropdownOpen(!forYouDropdownOpen);
 }}
 className={cn(
 "text-sm font-semibold tracking-tight flex items-center gap-1 transition-colors cursor-pointer pb-1",
 activeTab === "for-you" 
 ? "text-foreground font-black border-b-2 border-foreground" 
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <span>For you</span>
 <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-0.5" />
 </button>

 {forYouDropdownOpen && activeTab === "for-you" && (
 <div className="absolute left-0 top-full mt-2 w-48 bg-card border border-border/20 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
 <button
 type="button"
 onClick={() => setForYouDropdownOpen(false)}
 className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted/40 text-foreground flex items-center justify-between"
 >
 <span>Personalized Feed</span>
 <Check className="h-3.5 w-3.5 text-primary" />
 </button>
 <button
 type="button"
 onClick={() => {
 setForYouDropdownOpen(false);
 navigate("/customer/discover");
 }}
 className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted/40 text-muted-foreground"
 >
 Explore All Categories
 </button>
 </div>
 )}
 </div>

 <button
 type="button"
 onClick={() => setActiveTab("following")}
 className={cn(
 "text-sm font-semibold tracking-tight transition-colors cursor-pointer pb-1",
 activeTab === "following" 
 ? "text-foreground font-black border-b-2 border-foreground" 
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <span>Following</span>
 {followedBizIds.length > 0 && (
 <span className="ml-1.5 text-[10px] bg-muted/60 text-foreground font-bold px-1.5 py-0.2 rounded-full">
 {followedBizIds.length}
 </span>
 )}
 </button>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-24 gap-3">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-xs text-muted-foreground font-medium">Loading your aesthetic social feed...</p>
 </div>
 ) : displayedPosts.length === 0 ? (
 <div className="text-center py-20 bg-card/40 rounded-3xl border border-border/20 p-8 space-y-3">
 <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
 <h3 className="font-bold text-sm text-foreground">
 {activeTab === "following" ? "No posts from followed stores yet" : "No live items found"}
 </h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {activeTab === "following" 
 ? "Follow campus businesses to view their daily product drops here."
 : "Check back shortly or browse the discover catalog."}
 </p>
 <Button onClick={() => navigate("/customer/discover")} variant="secondary" className="rounded-2xl text-xs font-bold mt-2">
 Browse Discover Catalog
 </Button>
 </div>
 ) : (
 <div className="space-y-8">
 
 {/* HERO FEATURED POST (Matching Screenshot 1) */}
 {heroPost && (
 <div className="max-w-2xl mx-auto space-y-3">
 {/* Author Bar */}
 <div className="flex items-center justify-between px-1">
 <div 
 onClick={() => navigate(`/business/${heroPost.business.id}`)}
 className="flex items-center gap-3 cursor-pointer group"
 >
 <div className="h-11 w-11 rounded-full p-0.5 border border-border/40 overflow-hidden shrink-0 group-hover:border-primary/60 transition-colors">
 <img
 src={getMaskedAssetUrl(heroPost.business.logo_url)}
 alt={heroPost.business.company_name}
 className="h-full w-full object-cover rounded-full"
 onError={(e) => {
 (e.target as HTMLElement).style.display = "none";
 }}
 />
 </div>
 <div>
 <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
 {heroPost.business.company_name}
 {heroPost.business.verified && (
 <ShieldCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
 )}
 {heroPost.is_featured && (
 <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-1.5 py-0.2 rounded-full ml-1">
 Featured
 </span>
 )}
 </h3>
 <p className="text-xs text-muted-foreground font-normal">
 {heroPost.business.handle}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 onClick={(e) => handleFollowToggle(heroPost.business.id, heroPost.business.company_name, e)}
 className={cn(
 "rounded-full px-5 h-8 text-xs font-bold active:scale-95 transition-all shadow-xs",
 followedBizIds.includes(heroPost.business.id)
 ? "bg-muted text-foreground hover:bg-muted/80 border border-border/30"
 : "bg-[#c87a6f] hover:bg-[#b86c61] text-white border-none shadow-sm"
 )}
 >
 {followedBizIds.includes(heroPost.business.id) ? "Following" : "Follow"}
 </Button>
 </div>
 </div>

 {/* Picture-Perfect Curvilinear Post Image Container (rounded-[32px]) */}
 <div
 onClick={() => handlePostClick(heroPost)}
 className="relative group w-full rounded-[32px] overflow-hidden bg-muted/20 border border-border/15 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
 >
 <img
 src={getMaskedAssetUrl(heroPost.image_url)}
 alt={heroPost.name}
 className="w-full h-auto max-h-[540px] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
 loading="eager"
 />
 
 {/* Subtle Price Pill Badge */}
 {heroPost.price && (
 <div className="absolute bottom-4 left-4 bg-black/65 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
 ₦{heroPost.price.toLocaleString()}
 </div>
 )}

 {/* Co-Branded Storefront Avatar Badge at Bottom-Right of Image */}
 {heroPost.business?.logo_url && (
 <div
 onClick={(e) => {
 e.stopPropagation();
 navigate(`/business/${heroPost.business.id}`);
 }}
 className="absolute bottom-4 right-4 h-9 w-9 rounded-full border-2 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
 title={`Visit ${heroPost.business.company_name}`}
 >
 <img
 src={getMaskedAssetUrl(heroPost.business.logo_url)}
 alt={heroPost.business.company_name}
 className="w-full h-full object-cover"
 />
 </div>
 )}
 </div>

 {/* Bottom Social Bar (Matching Screenshot 1) */}
 <div className="flex items-center justify-between px-2 pt-1">
 <div className="flex items-center gap-5">
 {/* Like Action */}
 <button
 type="button"
 onClick={(e) => handleLike(heroPost.id, e)}
 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
 >
 <Heart
 className={cn(
 "h-5 w-5 transition-transform group-hover:scale-110",
 likedIds.includes(heroPost.id)
 ? "fill-red-500 text-red-500"
 : "text-foreground/80 stroke-[1.75]"
 )}
 />
 <span>
 {heroPost.likes}
 </span>
 </button>

 {/* Comments Action */}
 <button
 type="button"
 onClick={() => handlePostClick(heroPost)}
 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
 >
 <MessageCircle className="h-5 w-5 text-foreground/80 stroke-[1.75] transition-transform group-hover:scale-110" />
 <span>{heroPost.comments}</span>
 </button>

 {/* Share Action */}
 <ShareButton
 title={heroPost.name}
 text={`Check out ${heroPost.name} by ${heroPost.business.company_name} on String Campus Marketplace!`}
 url={`${window.location.origin}/business/${heroPost.business.id}?product=${heroPost.id}`}
 imageUrl={heroPost.image_url}
 variant="subtle"
 />
 </div>

 {/* Bookmark Action */}
 <button
 type="button"
 onClick={(e) => handleBookmark(heroPost.id, e)}
 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
 >
 <Bookmark
 className={cn(
 "h-5 w-5 transition-transform group-hover:scale-110",
 savedIds.includes(heroPost.id)
 ? "fill-primary text-primary"
 : "text-foreground/80 stroke-[1.75]"
 )}
 />
 <span>{heroPost.bookmarks}</span>
 </button>
 </div>
 </div>
 )}

 {/* PINTEREST MASONRY GRID OF DISCOVERY POSTS (Matching Screenshot 2) */}
 {gridPosts.length > 0 && (
 <div className="pt-4 border-t border-border/10">
 <div className="columns-2 md:columns-2 lg:columns-3 gap-6 space-y-6">
 {gridPosts.map((post) => {
 const isLiked = likedIds.includes(post.id);
 const isSaved = savedIds.includes(post.id);

 return (
 <div key={post.id} className="break-inside-avoid space-y-2">
 {/* Organic Rounded Card */}
 <div
 onClick={() => handlePostClick(post)}
 className="relative group w-full rounded-[32px] overflow-hidden bg-muted/20 border border-border/15 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
 >
 <img
 src={getMaskedAssetUrl(post.image_url)}
 alt={post.name}
 className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
 loading="lazy"
 />

 {/* Top Quick Actions on Hover */}
 <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 type="button"
 onClick={(e) => handleLike(post.id, e)}
 className={cn(
 "h-8 w-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-md transition-colors",
 isLiked ? "bg-red-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
 )}
 title="Like post"
 >
 <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
 </button>

 <button
 type="button"
 onClick={(e) => handleBookmark(post.id, e)}
 className={cn(
 "h-8 w-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-md transition-colors",
 isSaved ? "bg-primary text-primary-foreground" : "bg-black/60 text-white hover:bg-black/80"
 )}
 title="Save bookmark"
 >
 <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
 </button>

 <ShareButton
 title={post.name}
 text={`Check out ${post.name} by ${post.business.company_name} on String!`}
 url={`${window.location.origin}/business/${post.business.id}?product=${post.id}`}
 imageUrl={post.image_url}
 className="bg-black/60 text-white hover:bg-black/80 shadow-md backdrop-blur-md"
 />
 </div>

 {post.is_featured && (
 <div className="absolute top-3 left-3 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
 <Sparkles className="h-2.5 w-2.5 fill-current" /> Featured
 </div>
 )}

 {post.price && (
 <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md">
 ₦{post.price.toLocaleString()}
 </div>
 )}

 {/* Co-Branded Storefront Avatar Badge at Bottom-Right of Image */}
 {post.business?.logo_url && (
 <div
 onClick={(e) => {
 e.stopPropagation();
 navigate(`/business/${post.business.id}`);
 }}
 className="absolute bottom-3 right-3 h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 shadow-lg overflow-hidden bg-card hover:scale-110 transition-transform cursor-pointer z-10"
 title={`Visit ${post.business.company_name}`}
 >
 <img
 src={getMaskedAssetUrl(post.business.logo_url)}
 alt={post.business.company_name}
 className="w-full h-full object-cover"
 />
 </div>
 )}
 </div>

 {/* Category Label and 3-Dots More Menu (Matching Screenshot 2) */}
 <div className="flex items-center justify-between px-2 pt-0.5">
 <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
 {post.category}
 </span>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 type="button"
 className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
 title="More options"
 >
 <MoreHorizontal className="h-4 w-4" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="rounded-2xl p-1.5 min-w-[170px] shadow-xl">
 <DropdownMenuItem
 onClick={() => handlePostClick(post)}
 className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
 >
 <ShoppingBag className="h-3.5 w-3.5 text-primary" /> View Product & Buy
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => navigate(`/customer/messages?biz=${post.business.id}&product=${encodeURIComponent(post.name)}`)}
 className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
 >
 <MessageCircle className="h-3.5 w-3.5 text-indigo-500" /> Chat Merchant
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={(e) => handleBookmark(post.id, e as any)}
 className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
 >
 <Bookmark className="h-3.5 w-3.5 text-amber-500" /> {isSaved ? "Remove from Saved" : "Save Bookmark"}
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => {
 if (navigator.share) {
 navigator.share({
 title: post.name,
 text: `Check out ${post.name} by ${post.business.company_name} on String!`,
 url: `${window.location.origin}/business/${post.business.id}?product=${post.id}`,
 }).catch(() => {});
 } else {
 navigator.clipboard.writeText(`${window.location.origin}/business/${post.business.id}?product=${post.id}`);
 toast.success("Link copied to clipboard!");
 }
 }}
 className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
 >
 <Share2 className="h-3.5 w-3.5 text-emerald-500" /> Share Product
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => {
 navigator.clipboard.writeText(`${window.location.origin}/product/${post.id}`);
 toast.success("Link copied to clipboard!");
 }}
 className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
 >
 <Share2 className="h-3.5 w-3.5" /> Share Item
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </DashboardLayout>
 );
}



